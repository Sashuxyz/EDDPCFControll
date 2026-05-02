import { IInputs, IOutputs } from './generated/ManifestTypes';
import * as React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { GraphCanvas } from './components/GraphCanvas';
import { SidePanel } from './components/SidePanel';
import { Breadcrumb } from './components/Breadcrumb';
import { Legend } from './components/Legend';
import { EmptyState } from './components/EmptyState';
import { fetchPartiesForProfile, batchResolveDrillability } from './utils/webapi';
import { datasetRecordToPartyRecord, partyRecordToNode, buildEdge } from './utils/graphModel';
import { openRecord } from './utils/navigation';
import { GraphState, NodeData, EdgeData, MAX_DEPTH } from './types';
import { containerStyles } from './styles/tokens';

function GraphApp(props: {
  state: GraphState;
  debugLines: string[];
  onSelectNode: (id: string | null) => void;
  onDrillNode: (id: string) => void;
  onBreadcrumbNav: (index: number) => void;
  onOpenRecord: (etn: string, id: string) => void;
}): React.ReactElement {
  const { state, debugLines, onSelectNode, onDrillNode, onBreadcrumbNav, onOpenRecord } = props;
  const selectedNode = state.selectedNodeId ? state.nodes.get(state.selectedNodeId) ?? null : null;

  const debugPanel = debugLines.length > 0
    ? React.createElement('div', {
        style: {
          margin: '8px 16px', padding: '6px 8px', background: '#FFF4CE',
          border: '1px solid #E1DFDD', borderRadius: 4, fontSize: 11,
          fontFamily: 'Consolas, monospace', color: '#605E5C', maxHeight: 200,
          overflowY: 'auto', whiteSpace: 'pre-wrap',
        },
      }, debugLines.map((line, i) => React.createElement('div', { key: i }, line)))
    : null;

  if (state.nodes.size === 0 && state.expandedProfiles.length <= 1) {
    return React.createElement('div', { style: containerStyles.root },
      React.createElement(EmptyState),
      debugPanel
    );
  }

  return React.createElement('div', { style: containerStyles.root },
    React.createElement(Breadcrumb, {
      chain: state.expandedProfiles,
      onNavigate: onBreadcrumbNav,
    }),
    React.createElement(GraphCanvas, {
      centreProfileId: state.centreProfileId,
      centreProfileName: state.expandedProfiles[0]?.name ?? '',
      nodes: state.nodes,
      edges: state.edges,
      selectedNodeId: state.selectedNodeId,
      onSelectNode,
      onDrillNode,
      onCtrlClickNode: onOpenRecord,
    }),
    React.createElement(SidePanel, {
      node: selectedNode,
      onExpand: onDrillNode,
      onOpenRecord,
    }),
    React.createElement(Legend),
    debugPanel
  );
}

export class RelatedPartiesGraph
  implements ComponentFramework.StandardControl<IInputs, IOutputs>
{
  private root!: Root;
  private context!: ComponentFramework.Context<IInputs>;
  private state: GraphState = {
    centreProfileId: '',
    centreProfileName: '',
    expandedProfiles: [],
    nodes: new Map(),
    edges: [],
    selectedNodeId: null,
    drillCache: new Map(),
    loadingProfiles: new Set(),
  };
  private parentProfileId: string | null = null;
  private debugLines: string[] = [];

  public init(
    context: ComponentFramework.Context<IInputs>,
    _notifyOutputChanged: () => void,
    _state: ComponentFramework.Dictionary,
    container: HTMLDivElement
  ): void {
    this.root = createRoot(container);
    this.context = context;
    context.mode.trackContainerResize(true);
    try {
      context.parameters.parties.paging.setPageSize(250);
    } catch { /* not available */ }
  }

  public updateView(context: ComponentFramework.Context<IInputs>): void {
    this.context = context;
    const ds = context.parameters.parties;

    if (!ds.loading && ds.paging?.hasNextPage) {
      try { ds.paging.loadNextPage(); } catch { /* give up */ }
      return;
    }

    const parentInfo = this.resolveParentProfile(context);
    if (!parentInfo) {
      this.renderReact();
      return;
    }

    if (parentInfo.id !== this.parentProfileId) {
      this.parentProfileId = parentInfo.id;
      this.state = {
        centreProfileId: parentInfo.id,
        centreProfileName: parentInfo.name,
        expandedProfiles: [{ id: parentInfo.id, name: parentInfo.name }],
        nodes: new Map(),
        edges: [],
        selectedNodeId: null,
        drillCache: new Map(),
        loadingProfiles: new Set(),
      };
    }

    if (!ds.loading) {
      this.debugLines = [];
      this.debugLines.push(`dataset: ${ds.sortedRecordIds.length} records`);
      this.debugLines.push(`columns: ${ds.columns.map(c => c.name).join(', ')}`);
      if (ds.sortedRecordIds.length > 0) {
        const firstId = ds.sortedRecordIds[0];
        const firstRec = ds.records[firstId];
        for (const col of ds.columns) {
          try {
            const raw = firstRec.getValue(col.name);
            const fmt = firstRec.getFormattedValue(col.name);
            this.debugLines.push(`  ${col.name}: raw=${JSON.stringify(raw)}, fmt=${fmt}`);
          } catch (e) {
            this.debugLines.push(`  ${col.name}: ERROR ${e}`);
          }
        }
      }
      this.debugLines.push(`parentProfile: ${parentInfo.id} (${parentInfo.name})`);
      this.buildLevel1FromDataset(ds, parentInfo.id);
      this.debugLines.push(`nodes after build: ${this.state.nodes.size}`);
    }

    this.renderReact();
  }

  private resolveParentProfile(context: ComponentFramework.Context<IInputs>): { id: string; name: string } | null {
    const info = (context.mode as unknown as {
      contextInfo?: { entityId?: string; entityTypeName?: string };
    }).contextInfo;
    if (info?.entityId && info?.entityTypeName === 'syg_kycprofile') {
      const label = (context.mode as unknown as { label?: string }).label;
      return {
        id: info.entityId.replace(/[{}]/g, ''),
        name: label || 'KYC Profile',
      };
    }
    return null;
  }

  private buildLevel1FromDataset(
    ds: ComponentFramework.PropertyTypes.DataSet,
    profileId: string
  ): void {
    const nodes = new Map<string, NodeData>();
    const edges: EdgeData[] = [];

    for (const id of ds.sortedRecordIds) {
      const record = ds.records[id];
      const party = datasetRecordToPartyRecord(record, ds.columns);
      if (!party) continue;
      const node = partyRecordToNode(party, 1, profileId, this.state.drillCache);
      if (!nodes.has(node.id)) {
        nodes.set(node.id, node);
        edges.push(buildEdge(profileId, node.id, party.partyTypeName, 1));
      }
    }

    this.state.nodes = nodes;
    this.state.edges = edges;

    const customerIds = Array.from(nodes.keys());
    if (customerIds.length > 0) {
      void this.resolveDrillability(customerIds);
    }
  }

  private async resolveDrillability(customerIds: string[]): Promise<void> {
    this.state.drillCache = await batchResolveDrillability(
      this.context.webAPI,
      customerIds,
      this.state.drillCache
    );
    this.state.nodes.forEach((node, id) => {
      if (this.state.drillCache.has(id)) {
        node.ownKycProfileId = this.state.drillCache.get(id) ?? null;
      }
    });
    this.renderReact();
  }

  private async handleDrill(nodeId: string): Promise<void> {
    const node = this.state.nodes.get(nodeId);
    if (!node || !node.ownKycProfileId) return;
    if (node.level >= MAX_DEPTH) return;

    const profileId = node.ownKycProfileId;
    if (this.state.expandedProfiles.some((p) => p.id === profileId)) return;

    this.state.loadingProfiles.add(profileId);
    this.renderReact();

    try {
      const parties = await fetchPartiesForProfile(this.context.webAPI, profileId);
      const nextLevel = (node.level + 1) as 1 | 2 | 3;

      for (const party of parties) {
        if (!this.state.nodes.has(party.relatedPartyId)) {
          const newNode = partyRecordToNode(party, nextLevel, profileId, this.state.drillCache);
          this.state.nodes.set(newNode.id, newNode);
        }
        this.state.edges.push(buildEdge(profileId, party.relatedPartyId, party.partyTypeName, nextLevel));
      }

      this.state.expandedProfiles.push({ id: profileId, name: node.displayName });

      if (nextLevel < MAX_DEPTH) {
        const newCustomerIds = parties.map((p) => p.relatedPartyId);
        void this.resolveDrillability(newCustomerIds);
      }
    } catch {
      // Silently fail
    } finally {
      this.state.loadingProfiles.delete(profileId);
      this.renderReact();
    }
  }

  private handleBreadcrumbNav(index: number): void {
    const keepProfiles = this.state.expandedProfiles.slice(0, index + 1);
    const keepLevels = index + 1;

    const newNodes = new Map<string, NodeData>();
    this.state.nodes.forEach((node, id) => {
      if (node.level <= keepLevels) {
        newNodes.set(id, node);
      }
    });
    const newEdges = this.state.edges.filter((e) => e.level <= keepLevels);

    this.state.expandedProfiles = keepProfiles;
    this.state.nodes = newNodes;
    this.state.edges = newEdges;
    this.state.selectedNodeId = null;
    this.renderReact();
  }

  private renderReact(): void {
    this.root.render(
      React.createElement(GraphApp, {
        state: { ...this.state, nodes: new Map(this.state.nodes) },
        debugLines: [...this.debugLines],
        onSelectNode: (id: string | null) => {
          this.state.selectedNodeId = id;
          this.renderReact();
        },
        onDrillNode: (id: string) => { void this.handleDrill(id); },
        onBreadcrumbNav: (index: number) => { this.handleBreadcrumbNav(index); },
        onOpenRecord: (etn: string, id: string) => { openRecord(etn, id); },
      })
    );
  }

  public getOutputs(): IOutputs {
    return {};
  }

  public destroy(): void {
    this.root.unmount();
  }
}

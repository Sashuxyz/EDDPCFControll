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
  onSelectNode: (id: string | null) => void;
  onDrillNode: (id: string) => void;
  onBreadcrumbNav: (index: number) => void;
  onOpenRecord: (etn: string, id: string) => void;
}): React.ReactElement {
  const { state, onSelectNode, onDrillNode, onBreadcrumbNav, onOpenRecord } = props;
  const selectedNode = state.selectedNodeId ? state.nodes.get(state.selectedNodeId) ?? null : null;

  if (state.nodes.size === 0 && state.expandedProfiles.length <= 1) {
    return React.createElement('div', { style: containerStyles.root },
      React.createElement(EmptyState)
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
    React.createElement(Legend)
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
      this.buildLevel1FromDataset(ds, parentInfo.id);
      void this.enrichLevel1WithImpact(parentInfo.id);
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
    // Keep existing level 2-3 nodes and edges
    const existingHigherNodes = new Map<string, NodeData>();
    this.state.nodes.forEach((node, id) => {
      if (node.level > 1) existingHigherNodes.set(id, node);
    });
    const existingHigherEdges = this.state.edges.filter(e => e.level > 1);

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

    // Merge back higher-level data
    existingHigherNodes.forEach((node, id) => {
      if (!nodes.has(id)) nodes.set(id, node);
    });

    this.state.nodes = nodes;
    this.state.edges = [...edges, ...existingHigherEdges];

    const customerIds = Array.from(nodes.keys()).filter(id => {
      const n = nodes.get(id);
      return n && n.level === 1;
    });
    if (customerIds.length > 0) {
      void this.resolveDrillability(customerIds);
    }
  }

  private async enrichLevel1WithImpact(profileId: string): Promise<void> {
    try {
      const parties = await fetchPartiesForProfile(this.context.webAPI, profileId);
      for (const party of parties) {
        const existingNode = this.state.nodes.get(party.relatedPartyId);
        if (existingNode) {
          existingNode.impact = party.impact;
          existingNode.score = party.score;
          existingNode.partyTypeKey = party.partyTypeKey;
          if (party.partyTypeName && party.partyTypeName !== '(Unknown)') {
            existingNode.partyTypeName = party.partyTypeName;
          }
        }
      }
      this.renderReact();
    } catch { /* silent */ }
  }

  private async resolveDrillability(customerIds: string[]): Promise<void> {
    const resolved = await batchResolveDrillability(
      this.context.webAPI,
      customerIds,
      this.state.drillCache
    );
    // Merge rather than replace to avoid race with concurrent calls
    resolved.forEach((v, k) => this.state.drillCache.set(k, v));
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
        if (!this.state.edges.some(e => e.source === profileId && e.target === party.relatedPartyId)) {
          this.state.edges.push(buildEdge(profileId, party.relatedPartyId, party.partyTypeName, nextLevel));
        }
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

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
  debugInfo: string;
  onSelectNode: (id: string | null) => void;
  onDrillNode: (id: string) => void;
  onBreadcrumbNav: (index: number) => void;
  onOpenRecord: (etn: string, id: string) => void;
}): React.ReactElement {
  const { state, debugInfo, onSelectNode, onDrillNode, onBreadcrumbNav, onOpenRecord } = props;
  const selectedNode = state.selectedNodeId ? state.nodes.get(state.selectedNodeId) ?? null : null;

  const debugPanel = debugInfo
    ? React.createElement('div', {
        style: { margin: '8px 16px', padding: '6px 8px', background: '#FFF4CE', border: '1px solid #E1DFDD', borderRadius: 4, fontSize: 11, fontFamily: 'Consolas, monospace', color: '#605E5C', maxHeight: 250, overflowY: 'auto', whiteSpace: 'pre-wrap' },
      }, debugInfo)
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
  private debugInfo = '';

  private container!: HTMLDivElement;
  private initError: string | null = null;

  public init(
    context: ComponentFramework.Context<IInputs>,
    _notifyOutputChanged: () => void,
    _state: ComponentFramework.Dictionary,
    container: HTMLDivElement
  ): void {
    this.container = container;
    try {
      this.root = createRoot(container);
      this.context = context;
      context.mode.trackContainerResize(true);
      try {
        context.parameters.parties.paging.setPageSize(250);
      } catch { /* not available */ }
    } catch (e) {
      this.initError = `init failed: ${e}`;
      container.textContent = this.initError;
    }
  }

  public updateView(context: ComponentFramework.Context<IInputs>): void {
    if (this.initError) {
      this.container.textContent = this.initError;
      return;
    }

    try {
      this.context = context;
      const ds = context.parameters.parties;

      if (!ds.loading && ds.paging?.hasNextPage) {
        try { ds.paging.loadNextPage(); } catch { /* give up */ }
        return;
      }

      const ctxInfo = (context.mode as any)?.contextInfo;
      const rawEntityId = ctxInfo?.entityId;
      const parentInfo = this.resolveParentProfile(context);
      if (!parentInfo) {
        this.showError(`No parent profile. entityTypeName=${ctxInfo?.entityTypeName ?? 'undefined'}, entityId type=${typeof rawEntityId}, value=${JSON.stringify(rawEntityId)}`);
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
        // Diagnostic: inspect dataset contents
        this.debugInfo = `records: ${ds.sortedRecordIds.length}, cols: ${ds.columns.map(c => c.name).join(', ')}`;
        if (ds.sortedRecordIds.length > 0) {
          const firstId = ds.sortedRecordIds[0];
          const firstRec = ds.records[firstId];
          const diag: string[] = [];
          for (const col of ds.columns) {
            try {
              const raw = firstRec.getValue(col.name);
              const fmt = firstRec.getFormattedValue(col.name);
              diag.push(`${col.name}: type=${typeof raw}, raw=${JSON.stringify(raw)?.slice(0, 80)}, fmt=${fmt}`);
            } catch (ex) {
              diag.push(`${col.name}: ERR ${ex}`);
            }
          }
          this.debugInfo += '\n' + diag.join('\n');
        }

        this.buildLevel1FromDataset(ds, parentInfo.id);
        this.debugInfo += `\nnodes after build: ${this.state.nodes.size}`;
        void this.enrichLevel1WithImpact(parentInfo.id);
        void this.fetchCentreProfileClientName(parentInfo.id);
      }

      this.renderReact();
    } catch (e) {
      this.showError(`updateView error: ${e}`);
    }
  }

  private showError(msg: string): void {
    this.root.render(
      React.createElement('div', {
        style: { padding: 16, fontSize: 12, color: '#A4262C', fontFamily: "'Segoe UI', sans-serif", background: '#FFF4CE', border: '1px solid #E1DFDD', borderRadius: 4, margin: 8 },
      }, msg)
    );
  }

  private resolveParentProfile(context: ComponentFramework.Context<IInputs>): { id: string; name: string } | null {
    const info = (context.mode as unknown as {
      contextInfo?: { entityId?: unknown; entityTypeName?: string };
    }).contextInfo;
    if (!info?.entityId || info?.entityTypeName !== 'syg_kycprofile') return null;

    // entityId can be a string or a GUID object — coerce safely
    const rawId = info.entityId;
    const idStr = typeof rawId === 'string' ? rawId : String(rawId);
    const cleaned = idStr.replace(/[{}]/g, '');
    if (!cleaned) return null;

    const label = (context.mode as unknown as { label?: string }).label;
    return {
      id: cleaned,
      name: label || 'KYC Profile',
    };
  }

  private buildLevel1FromDataset(
    ds: ComponentFramework.PropertyTypes.DataSet,
    profileId: string
  ): void {
    // Try to get the profile name from the dataset's kycprofileid lookup
    if (ds.sortedRecordIds.length > 0) {
      const firstRec = ds.records[ds.sortedRecordIds[0]];
      try {
        const profileName = firstRec.getFormattedValue('syg_kycprofileid');
        if (profileName && this.state.centreProfileName !== profileName) {
          this.state.centreProfileName = profileName;
          if (this.state.expandedProfiles.length > 0) {
            this.state.expandedProfiles[0].name = profileName;
          }
        }
      } catch { /* ignore */ }
    }

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

    const customers: Array<{ id: string; etn: 'account' | 'contact' }> = [];
    nodes.forEach((node) => {
      if (node.level === 1) {
        customers.push({ id: node.id, etn: node.etn });
      }
    });
    if (customers.length > 0) {
      void this.resolveDrillability(customers);
    }
  }

  private async fetchCentreProfileClientName(profileId: string): Promise<void> {
    try {
      const record = await this.context.webAPI.retrieveRecord(
        'syg_kycprofile', profileId,
        '?$select=_syg_clientid_value'
      );
      const clientName = record['_syg_clientid_value@OData.Community.Display.V1.FormattedValue'] as string | undefined;
      if (clientName) {
        this.state.centreProfileName = clientName;
        if (this.state.expandedProfiles.length > 0) {
          this.state.expandedProfiles[0].name = clientName;
        }
        this.renderReact();
      }
    } catch { /* silent */ }
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

  private async resolveDrillability(customers: Array<{ id: string; etn: 'account' | 'contact' }>): Promise<void> {
    const resolved = await batchResolveDrillability(
      this.context.webAPI,
      customers,
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
      // Use the node's account/contact ID as edge source (not the KYC profile ID)
      // because that's the node ID in the Cytoscape graph
      const edgeSourceId = nodeId;

      for (const party of parties) {
        if (!this.state.nodes.has(party.relatedPartyId)) {
          const newNode = partyRecordToNode(party, nextLevel, profileId, this.state.drillCache);
          this.state.nodes.set(newNode.id, newNode);
        }
        if (!this.state.edges.some(e => e.source === edgeSourceId && e.target === party.relatedPartyId)) {
          this.state.edges.push(buildEdge(edgeSourceId, party.relatedPartyId, party.partyTypeName, nextLevel));
        }
      }

      this.state.expandedProfiles.push({ id: profileId, name: node.displayName });

      if (nextLevel < MAX_DEPTH) {
        const newCustomers = parties.map((p) => ({ id: p.relatedPartyId, etn: p.relatedPartyEtn }));
        void this.resolveDrillability(newCustomers);
      }
    } catch (e) {
      this.showError(`Drill error: ${e}`);
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
        debugInfo: this.debugInfo,
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

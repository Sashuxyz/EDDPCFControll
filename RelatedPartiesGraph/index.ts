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
import { openRecord, cleanGuid } from './utils/navigation';
import { GraphState, NodeData, EdgeData, MAX_DEPTH } from './types';
import { containerStyles } from './styles/tokens';

function GraphApp(props: {
  state: GraphState;
  graphVersion: number;
  hasDrillableNodes: boolean;
  onSelectNode: (id: string | null) => void;
  onDrillNode: (id: string) => void;
  onExpandAll: () => void;
  onBreadcrumbNav: (index: number) => void;
  onOpenRecord: (etn: string, id: string) => void;
}): React.ReactElement {
  const { state, graphVersion, hasDrillableNodes, onSelectNode, onDrillNode, onExpandAll, onBreadcrumbNav, onOpenRecord } = props;
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
    React.createElement('div', { style: containerStyles.body },
      React.createElement(GraphCanvas, {
        centreProfileId: state.centreProfileId,
        centreProfileName: state.expandedProfiles[0]?.name ?? '',
        nodes: state.nodes,
        edges: state.edges,
        graphVersion,
        selectedNodeId: state.selectedNodeId,
        onSelectNode,
        onDrillNode,
        onCtrlClickNode: onOpenRecord,
      }),
      React.createElement('div', { style: containerStyles.sidebar },
        React.createElement(SidePanel, {
          node: selectedNode,
          expandedProfileIds: new Set(state.expandedProfiles.map(p => p.id)),
          onExpand: onDrillNode,
          onOpenRecord,
        }),
        hasDrillableNodes && React.createElement('div', {
          style: { padding: '8px 16px', borderTop: '1px solid #edebe9' },
        },
          React.createElement('button', {
            style: { fontSize: 12, fontWeight: 600, color: '#0078D4', background: 'none', border: '1px solid #0078D4', borderRadius: 4, padding: '5px 14px', cursor: 'pointer', fontFamily: "'Segoe UI', sans-serif", width: '100%' },
            onClick: onExpandAll,
            type: 'button',
          }, 'Expand All')
        ),
        React.createElement(Legend)
      )
    )
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
  private centreClientId: string | null = null;
  private graphVersion = 0;

  /** Call when graph data (nodes, edges, names) changes — triggers Cytoscape update */
  private graphDataChanged(): void {
    this.graphVersion++;
    this.renderReact();
  }

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

      // Only build from dataset on initial load or when parent changes.
      // Once nodes exist, the drill handlers manage all state changes.
      if (!ds.loading && this.state.nodes.size === 0) {
        this.buildLevel1FromDataset(ds, parentInfo.id);
        void this.enrichLevel1WithImpact(parentInfo.id);
        void this.fetchCentreProfileClientName(parentInfo.id);
      }

      this.graphDataChanged();
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
      const clientId = record['_syg_clientid_value'] as string | null;
      const clientName = record['_syg_clientid_value@OData.Community.Display.V1.FormattedValue'] as string | undefined;
      if (clientId) {
        this.centreClientId = cleanGuid(clientId);
      }
      if (clientName) {
        this.state.centreProfileName = clientName;
        if (this.state.expandedProfiles.length > 0) {
          this.state.expandedProfiles[0].name = clientName;
        }
        this.graphDataChanged();
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
      this.graphDataChanged();
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
    this.graphDataChanged();
  }

  private async handleDrill(nodeId: string): Promise<void> {
    const node = this.state.nodes.get(nodeId);
    if (!node || !node.ownKycProfileId || node.level >= MAX_DEPTH) return;

    const profileId = node.ownKycProfileId;
    if (this.state.expandedProfiles.some((p) => p.id === profileId)) return;

    this.state.loadingProfiles.add(profileId);
    this.graphDataChanged();

    try {
      const parties = await fetchPartiesForProfile(this.context.webAPI, profileId);
      const nextLevel = (node.level + 1) as 1 | 2 | 3;
      const edgeSourceId = nodeId;
      let newNodesAdded = 0;
      let newEdgesAdded = 0;

      for (const party of parties) {
        // If this related party IS the root client, link to centre node instead
        const isCentreClient = this.centreClientId && party.relatedPartyId === this.centreClientId;
        const targetNodeId = isCentreClient
          ? `profile-${this.state.centreProfileId}`
          : party.relatedPartyId;

        if (!isCentreClient && !this.state.nodes.has(party.relatedPartyId)) {
          const newNode = partyRecordToNode(party, nextLevel, profileId, this.state.drillCache);
          this.state.nodes.set(newNode.id, newNode);
          newNodesAdded++;
        }
        // Always add the edge (shows cross-connection or link back to centre)
        const edgeId = `${edgeSourceId}-${targetNodeId}`;
        if (!this.state.edges.some(e => `${e.source}-${e.target}` === edgeId)) {
          this.state.edges.push(buildEdge(edgeSourceId, targetNodeId, party.partyTypeName, nextLevel));
          newEdgesAdded++;
        }
      }

      this.state.expandedProfiles.push({ id: profileId, name: node.displayName });

      if (nextLevel < MAX_DEPTH) {
        const newCustomers = parties.map((p) => ({ id: p.relatedPartyId, etn: p.relatedPartyEtn }));
        void this.resolveDrillability(newCustomers);
      }
    } catch {
      // Silent — drill failed, graph stays as-is
    } finally {
      this.state.loadingProfiles.delete(profileId);
      this.graphDataChanged();
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
    this.graphDataChanged();
  }

  private async handleExpandAll(): Promise<void> {
    // Find all drillable nodes not yet expanded
    const expandedProfileIds = new Set(this.state.expandedProfiles.map(p => p.id));
    const drillableNodes: string[] = [];
    this.state.nodes.forEach((node) => {
      if (node.ownKycProfileId && !expandedProfileIds.has(node.ownKycProfileId) && node.level < MAX_DEPTH) {
        drillableNodes.push(node.id);
      }
    });

    // Drill each one sequentially to avoid race conditions
    for (const nodeId of drillableNodes) {
      await this.handleDrill(nodeId);
    }
  }

  private renderReact(): void {
    // Check if there are unexpanded drillable nodes
    const expandedProfileIds = new Set(this.state.expandedProfiles.map(p => p.id));
    let hasDrillable = false;
    this.state.nodes.forEach((node) => {
      if (node.ownKycProfileId && !expandedProfileIds.has(node.ownKycProfileId) && node.level < MAX_DEPTH) {
        hasDrillable = true;
      }
    });

    this.root.render(
      React.createElement(GraphApp, {
        state: { ...this.state, nodes: new Map(this.state.nodes) },
        graphVersion: this.graphVersion,
        hasDrillableNodes: hasDrillable,
        onSelectNode: (id: string | null) => {
          this.state.selectedNodeId = id;
          this.renderReact();
        },
        onDrillNode: (id: string) => { void this.handleDrill(id); },
        onExpandAll: () => { void this.handleExpandAll(); },
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

import { IInputs, IOutputs } from './generated/ManifestTypes';
import * as React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { GraphCanvas } from './components/GraphCanvas';
import { SidePanel } from './components/SidePanel';
import { Breadcrumb } from './components/Breadcrumb';
import { Legend } from './components/Legend';
import { EmptyState } from './components/EmptyState';
import { fetchPartiesForProfile, fetchReversePartiesForCustomer, batchResolveDrillability } from './utils/webapi';
import { datasetRecordToPartyRecord, partyRecordToNode, reverseRecordToNode, buildEdge } from './utils/graphModel';
import { openRecord, cleanGuid } from './utils/navigation';
import { GraphState, NodeData, EdgeData, MAX_DEPTH } from './types';
import { containerStyles } from './styles/tokens';

function GraphApp(props: {
  state: GraphState;
  graphVersion: number;
  hasDrillableNodes: boolean;
  expandAllStatus: string;
  onSelectNode: (id: string | null) => void;
  onDrillNode: (id: string) => void;
  onExpandAll: () => void;
  onResetView: () => void;
  onOpenRecord: (etn: string, id: string) => void;
}): React.ReactElement {
  const { state, graphVersion, hasDrillableNodes, expandAllStatus, onSelectNode, onDrillNode, onExpandAll, onResetView, onOpenRecord } = props;
  const selectedNode = state.selectedNodeId ? state.nodes.get(state.selectedNodeId) ?? null : null;

  if (state.nodes.size === 0) {
    return React.createElement('div', { style: containerStyles.root },
      React.createElement(EmptyState)
    );
  }

  // "Has expansions" = anything expanded beyond the centre profile itself
  const hasExpansions = state.expandedProfileIds.size > 1;

  return React.createElement('div', { style: containerStyles.root },
    React.createElement(Breadcrumb, {
      centreName: state.centreProfileName,
      hasExpansions,
      onReset: onResetView,
    }),
    React.createElement('div', { style: containerStyles.body },
      React.createElement(GraphCanvas, {
        centreProfileId: state.centreProfileId,
        centreProfileName: state.centreProfileName,
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
          expandedProfileIds: state.expandedProfileIds,
          onExpand: onDrillNode,
          onOpenRecord,
        }),
        React.createElement('div', {
          style: { padding: '8px 16px', borderTop: '1px solid #edebe9' },
        },
          hasDrillableNodes && React.createElement('button', {
            style: { fontSize: 12, fontWeight: 600, color: '#0078D4', background: 'none', border: '1px solid #0078D4', borderRadius: 4, padding: '5px 14px', cursor: 'pointer', fontFamily: "'Segoe UI', sans-serif", width: '100%' },
            onClick: onExpandAll,
            type: 'button',
          }, 'Expand All'),
          expandAllStatus && React.createElement('div', {
            style: { fontSize: 10, color: '#605E5C', marginTop: 6, lineHeight: 1.4, wordBreak: 'break-word' },
          }, expandAllStatus)
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
    expandedProfileIds: new Set(),
    nodes: new Map(),
    edges: [],
    selectedNodeId: null,
    drillCache: new Map(),
    loadingProfiles: new Set(),
  };
  private parentProfileId: string | null = null;
  private centreClientId: string | null = null;
  private graphVersion = 0;
  private expandAllStatus = '';

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
          expandedProfileIds: new Set([parentInfo.id]),
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
        this.graphDataChanged();
      }
      if (this.centreClientId) {
        void this.loadReverseLinks(this.centreClientId);
      }
    } catch { /* silent */ }
  }

  // Fetches all junction rows where the centre's customer is the related party
  // on someone ELSE's KYC profile, then merges the source-side profiles into
  // the graph as level-1 nodes connected by reverse (dashed) edges.
  private async loadReverseLinks(centreCustomerId: string): Promise<void> {
    try {
      const reverse = await fetchReversePartiesForCustomer(
        this.context.webAPI,
        centreCustomerId,
        this.state.centreProfileId
      );
      if (reverse.length === 0) return;

      const centreNodeId = `profile-${this.state.centreProfileId}`;
      let added = false;

      for (const rec of reverse) {
        // Skip if a reverse edge from this source already exists (idempotent
        // across re-renders).
        const exists = this.state.edges.some(
          (e) => e.reverse === true && e.source === rec.sourceCustomerId && e.target === centreNodeId
        );
        if (exists) continue;

        // Add the source customer as a node only if it isn't already in the
        // graph (it might already be a regular related party — in that case we
        // just attach the reverse edge alongside the existing node).
        if (!this.state.nodes.has(rec.sourceCustomerId)) {
          const node = reverseRecordToNode(rec);
          this.state.nodes.set(node.id, node);
          // Pre-populate drill cache so the node renders as drillable without
          // an extra round-trip — we already know its profile id.
          this.state.drillCache.set(rec.sourceCustomerId, rec.sourceProfileId);
        }

        this.state.edges.push(
          buildEdge(rec.sourceCustomerId, centreNodeId, rec.partyTypeName, 1, true)
        );
        added = true;
      }

      if (added) this.graphDataChanged();
    } catch { /* silent — reverse links are best-effort */ }
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
    if (this.state.expandedProfileIds.has(profileId)) return;

    this.state.loadingProfiles.add(profileId);
    this.graphDataChanged();

    try {
      const parties = await fetchPartiesForProfile(this.context.webAPI, profileId);
      const nextLevel = (node.level + 1) as 1 | 2 | 3;
      const edgeSourceId = nodeId;

      for (const party of parties) {
        // If this related party IS the root client, link to centre node instead
        const isCentreClient = this.centreClientId && party.relatedPartyId === this.centreClientId;
        const targetNodeId = isCentreClient
          ? `profile-${this.state.centreProfileId}`
          : party.relatedPartyId;

        if (!isCentreClient && !this.state.nodes.has(party.relatedPartyId)) {
          const newNode = partyRecordToNode(party, nextLevel, profileId, this.state.drillCache);
          this.state.nodes.set(newNode.id, newNode);
        }
        const edgeId = `${edgeSourceId}-${targetNodeId}`;
        if (!this.state.edges.some(e => `${e.source}-${e.target}` === edgeId)) {
          this.state.edges.push(buildEdge(edgeSourceId, targetNodeId, party.partyTypeName, nextLevel));
        }
      }

      this.state.expandedProfileIds.add(profileId);

      if (nextLevel < MAX_DEPTH) {
        const newCustomers = parties.map((p) => ({ id: p.relatedPartyId, etn: p.relatedPartyEtn }));
        // Await so handleExpandAll's next iteration sees the resolved drillability
        await this.resolveDrillability(newCustomers);
      }
    } catch {
      // Silent — drill failed, graph stays as-is
    } finally {
      this.state.loadingProfiles.delete(profileId);
      this.graphDataChanged();
    }
  }

  private handleResetView(): void {
    // Collapse everything back to level 1 (centre + direct related parties)
    const newNodes = new Map<string, NodeData>();
    this.state.nodes.forEach((node, id) => {
      if (node.level <= 1) newNodes.set(id, node);
    });
    const newEdges = this.state.edges.filter((e) => e.level <= 1);

    this.state.expandedProfileIds = new Set([this.state.centreProfileId]);
    this.state.nodes = newNodes;
    this.state.edges = newEdges;
    this.state.selectedNodeId = null;
    this.graphDataChanged();
  }

  private async handleExpandAll(): Promise<void> {
    // Iteratively expand until no more drillable nodes remain. Each round
    // may surface new drillable nodes at deeper levels.
    let safety = 0;
    let totalDrilled = 0;
    while (safety++ < 20) {
      const drillableNodes: Array<{ id: string; level: number; profileId: string }> = [];
      this.state.nodes.forEach((node) => {
        if (
          node.ownKycProfileId &&
          !this.state.expandedProfileIds.has(node.ownKycProfileId) &&
          node.level < MAX_DEPTH
        ) {
          drillableNodes.push({ id: node.id, level: node.level, profileId: node.ownKycProfileId });
        }
      });

      this.expandAllStatus = `Round ${safety}: found ${drillableNodes.length} drillable | total drilled=${totalDrilled} | nodes=${this.state.nodes.size} | expanded=${this.state.expandedProfileIds.size}`;
      this.graphDataChanged();

      if (drillableNodes.length === 0) {
        const nodeList: string[] = [];
        this.state.nodes.forEach((n) => nodeList.push(`L${n.level}:${n.displayName}`));
        this.expandAllStatus = `Done after ${safety - 1} rounds. ${totalDrilled} drilled. nodes(${this.state.nodes.size}): ${nodeList.join(', ')}`;
        this.graphDataChanged();
        return;
      }

      await Promise.all(drillableNodes.map((d) => this.handleDrill(d.id)));
      totalDrilled += drillableNodes.length;
    }
    this.expandAllStatus = `Stopped at safety limit. drilled=${totalDrilled}`;
    this.graphDataChanged();
  }

  private renderReact(): void {
    // Check if there are unexpanded drillable nodes
    let hasDrillable = false;
    this.state.nodes.forEach((node) => {
      if (
        node.ownKycProfileId &&
        !this.state.expandedProfileIds.has(node.ownKycProfileId) &&
        node.level < MAX_DEPTH
      ) {
        hasDrillable = true;
      }
    });

    this.root.render(
      React.createElement(GraphApp, {
        state: {
          ...this.state,
          nodes: new Map(this.state.nodes),
          expandedProfileIds: new Set(this.state.expandedProfileIds),
        },
        graphVersion: this.graphVersion,
        hasDrillableNodes: hasDrillable,
        expandAllStatus: this.expandAllStatus,
        onSelectNode: (id: string | null) => {
          this.state.selectedNodeId = id;
          this.renderReact();
        },
        onDrillNode: (id: string) => { void this.handleDrill(id); },
        onExpandAll: () => { void this.handleExpandAll(); },
        onResetView: () => { this.handleResetView(); },
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

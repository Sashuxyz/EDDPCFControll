import * as React from 'react';
import cytoscape, { Core, EventObject } from 'cytoscape';
import { NodeData, EdgeData, IMPACT_COLORS, CENTRE_COLOR } from '../types';
import { getNodeDimensions, computePositions } from '../utils/layout';
import { containerStyles } from '../styles/tokens';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CY_STYLES: any = [
  {
    selector: 'node',
    style: {
      'shape': 'round-rectangle',
      'label': 'data(label)',
      'text-valign': 'center',
      'text-halign': 'center',
      'font-size': 10,
      'font-family': "'Segoe UI', sans-serif",
      'color': '#323130',
      'background-color': '#FFFFFF',
      'border-width': 2,
      'border-color': 'data(borderColor)',
      'text-wrap': 'wrap',
      'text-max-width': '130px',
      'padding': '8px',
    } as cytoscape.Css.Node,
  },
  {
    selector: 'node[?isCentre]',
    style: {
      'background-color': CENTRE_COLOR.bg,
      'border-color': CENTRE_COLOR.border,
      'color': CENTRE_COLOR.text,
      'font-weight': 'bold',
      'font-size': 12,
    },
  },
  {
    selector: 'node[?isDrillable]',
    style: { 'border-width': 3 },
  },
  {
    selector: 'node:selected',
    style: {
      'border-width': 4,
      'overlay-color': '#0078D4',
      'overlay-opacity': 0.08,
    },
  },
  {
    selector: 'edge',
    style: {
      'width': 1,
      'line-color': '#D2D0CE',
      'curve-style': 'bezier',
      'target-arrow-shape': 'none',
      'label': 'data(label)',
      'font-size': 8,
      'font-family': "'Segoe UI', sans-serif",
      'color': '#A19F9D',
      'text-rotation': 'autorotate',
      'text-wrap': 'wrap',
      'text-max-width': '100px',
      'text-margin-y': -10,
      'text-background-color': '#FAFAFA',
      'text-background-opacity': 0.9,
      'text-background-padding': '2px',
    },
  },
  {
    // Reverse edges: dashed line to indicate the relationship is owned by the
    // OTHER side (some external KYC profile lists the centre as a related
    // party). Slightly cooler color so they read as "incoming" not "outgoing".
    selector: 'edge[?reverse]',
    style: {
      'line-style': 'dashed',
      'line-color': '#A19F9D',
      'color': '#605E5C',
    },
  },
];

interface GraphCanvasProps {
  centreProfileId: string;
  centreProfileName: string;
  nodes: Map<string, NodeData>;
  edges: EdgeData[];
  graphVersion: number;
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string | null) => void;
  onDrillNode: (nodeId: string) => void;
  onCtrlClickNode: (etn: string, id: string) => void;
}

function buildElements(
  centreProfileId: string,
  centreProfileName: string,
  nodes: Map<string, NodeData>,
  edges: EdgeData[]
): cytoscape.ElementDefinition[] {
  const els: cytoscape.ElementDefinition[] = [];

  els.push({
    data: {
      id: `profile-${centreProfileId}`,
      label: centreProfileName,
      level: 0,
      isCentre: true,
      isDrillable: false,
      isPep: false,
      impact: null,
      borderColor: CENTRE_COLOR.border,
    },
  });

  nodes.forEach((node) => {
    const impact = node.impact ?? 'No';
    const colors = IMPACT_COLORS[impact] ?? IMPACT_COLORS.No;
    const pepSuffix = node.pep ? ' [PEP]' : '';
    const drillSuffix = node.ownKycProfileId ? ' +' : '';
    els.push({
      data: {
        id: node.id,
        label: node.displayName + pepSuffix + drillSuffix,
        level: node.level,
        isCentre: false,
        isDrillable: node.ownKycProfileId !== null,
        isPep: node.pep,
        impact,
        etn: node.etn,
        borderColor: colors.border,
      },
    });
  });

  for (const edge of edges) {
    const sourceId = edge.source === centreProfileId
      ? `profile-${centreProfileId}`
      : edge.source;
    els.push({
      data: {
        id: `edge-${edge.source}-${edge.target}`,
        source: sourceId,
        target: edge.target,
        label: edge.label,
        reverse: edge.reverse === true,
      },
    });
  }

  return els;
}

export const GraphCanvas: React.FC<GraphCanvasProps> = ({
  centreProfileId,
  centreProfileName,
  nodes,
  edges,
  graphVersion,
  selectedNodeId,
  onSelectNode,
  onDrillNode,
  onCtrlClickNode,
}) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const cyRef = React.useRef<Core | null>(null);
  const prevVersionRef = React.useRef(-1);
  const layoutTimerRef = React.useRef<number | null>(null);

  // Stable callback refs
  const onSelectNodeRef = React.useRef(onSelectNode);
  onSelectNodeRef.current = onSelectNode;
  const onDrillNodeRef = React.useRef(onDrillNode);
  onDrillNodeRef.current = onDrillNode;
  const onCtrlClickNodeRef = React.useRef(onCtrlClickNode);
  onCtrlClickNodeRef.current = onCtrlClickNode;

  // Create Cytoscape once on mount
  React.useEffect(() => {
    if (!containerRef.current) return;

    const cy = cytoscape({
      container: containerRef.current,
      elements: [],
      style: CY_STYLES,
      userZoomingEnabled: true,
      userPanningEnabled: true,
      boxSelectionEnabled: false,
    });

    // Double-tap detection
    let lastTapTime = 0;
    let lastTapNodeId = '';

    cy.on('tap', 'node', (evt: EventObject) => {
      const originalEvent = evt.originalEvent as MouseEvent;
      if (originalEvent.metaKey || originalEvent.ctrlKey) {
        const etn = evt.target.data('etn') as string;
        const id = evt.target.id();
        if (etn && id) onCtrlClickNodeRef.current(etn, id);
        return;
      }

      const nodeId = evt.target.id();
      const now = Date.now();

      if (nodeId === lastTapNodeId && now - lastTapTime < 300) {
        const isDrillable = evt.target.data('isDrillable');
        if (isDrillable) setTimeout(() => onDrillNodeRef.current(nodeId), 0);
        lastTapTime = 0;
        lastTapNodeId = '';
        return;
      }

      lastTapTime = now;
      lastTapNodeId = nodeId;

      // Defer selection out of the Cytoscape event handler to avoid
      // modifying elements while the event dispatch is on the call stack
      const isCentre = evt.target.data('isCentre');
      setTimeout(() => onSelectNodeRef.current(isCentre ? null : nodeId), 0);
    });

    cy.on('tap', (evt: EventObject) => {
      if (evt.target === cy) setTimeout(() => onSelectNodeRef.current(null), 0);
    });

    cyRef.current = cy;
    return () => { cy.destroy(); cyRef.current = null; };
  }, []); // mount only

  // Only update Cytoscape elements when graphVersion changes.
  // Selection changes do NOT trigger this — only data changes do.
  React.useEffect(() => {
    const cy = cyRef.current;
    if (!cy || graphVersion === prevVersionRef.current) return;
    const isFirst = prevVersionRef.current === -1;
    prevVersionRef.current = graphVersion;

    const newElements = buildElements(centreProfileId, centreProfileName, nodes, edges);

    // Drop nodes with empty/missing ids (defense in depth — the data layer
    // already filters these, but cy.add throws on the whole batch if even one
    // element has an invalid id, so we double-guard here).
    const sanitized = newElements.filter(el => {
      const id = el.data.id;
      return typeof id === 'string' && id.length > 0;
    });

    // Filter edges referencing non-existent nodes
    const nodeIds = new Set(sanitized.filter(e => !e.data.source).map(e => e.data.id as string));
    const validElements = sanitized.filter(el => {
      if (el.data.source) {
        return nodeIds.has(el.data.source as string) && nodeIds.has(el.data.target as string);
      }
      return true;
    });

    try {
      // Compute deterministic ring positions for every node before adding
      // them. We bypass Cytoscape's layouts entirely because they kept
      // mishandling the incremental-add case.
      const centreId = `profile-${centreProfileId}`;
      const nodeLevels = new Map<string, number>();
      for (const el of validElements) {
        if (el.data.source) continue;
        const lvl = el.data.id === centreId ? 0 : (el.data.level as number);
        nodeLevels.set(el.data.id as string, lvl);
      }
      const edgeList = validElements
        .filter(e => e.data.source)
        .map(e => ({ source: e.data.source as string, target: e.data.target as string }));
      const positions = computePositions(centreId, nodeLevels, edgeList);

      // Apply positions to elements before cy.add so they take effect
      for (const el of validElements) {
        if (el.data.source) continue;
        const pos = positions.get(el.data.id as string);
        if (pos) (el as any).position = pos;
      }

      // Full rebuild
      cy.elements().remove();
      cy.add(validElements);

      // Set node dimensions
      (cy.nodes() as any).forEach((node: any) => {
        const level = node.data('level') as number;
        const dims = getNodeDimensions(level);
        node.style({ width: dims.width, height: dims.height });
      });

      // Debounce fit so parallel-drill bursts coalesce into one fit
      if (layoutTimerRef.current !== null) {
        window.clearTimeout(layoutTimerRef.current);
      }
      layoutTimerRef.current = window.setTimeout(() => {
        layoutTimerRef.current = null;
        try {
          cy.fit(undefined, 40);
          cy.center();
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error('[RPG] fit/center failed', err);
        }
      }, isFirst ? 0 : 60);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[RPG] graph rebuild failed', err);
    }
  }, [graphVersion]);

  // Sync selection without recreating graph
  React.useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.nodes().unselect();
    if (selectedNodeId) {
      const node = cy.getElementById(selectedNodeId);
      if (node.length > 0) node.select();
    }
  }, [selectedNodeId]);

  return <div ref={containerRef} style={containerStyles.canvas} />;
};

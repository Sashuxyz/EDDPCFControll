import * as React from 'react';
import cytoscape, { Core, EventObject } from 'cytoscape';
import { NodeData, EdgeData, IMPACT_COLORS, CENTRE_COLOR } from '../types';
import { getConcentricLayout, getNodeDimensions } from '../utils/layout';
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
];

interface GraphCanvasProps {
  centreProfileId: string;
  centreProfileName: string;
  nodes: Map<string, NodeData>;
  edges: EdgeData[];
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
  selectedNodeId,
  onSelectNode,
  onDrillNode,
  onCtrlClickNode,
}) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const cyRef = React.useRef<Core | null>(null);
  const prevElementHashRef = React.useRef('');

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
        if (isDrillable) onDrillNodeRef.current(nodeId);
        lastTapTime = 0;
        lastTapNodeId = '';
        return;
      }

      lastTapTime = now;
      lastTapNodeId = nodeId;

      const isCentre = evt.target.data('isCentre');
      onSelectNodeRef.current(isCentre ? null : nodeId);
    });

    cy.on('tap', (evt: EventObject) => {
      if (evt.target === cy) onSelectNodeRef.current(null);
    });

    cyRef.current = cy;
    return () => { cy.destroy(); cyRef.current = null; };
  }, []); // mount only

  // Update elements — diff-based to avoid unnecessary layout runs
  React.useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    const newElements = buildElements(centreProfileId, centreProfileName, nodes, edges);

    // Build a hash of element IDs + key data to detect actual changes
    const hash = newElements.map(el => {
      const d = el.data;
      return `${d.id}|${d.label ?? ''}|${d.borderColor ?? ''}|${d.isDrillable ?? ''}|${d.source ?? ''}`;
    }).join(';');

    if (hash === prevElementHashRef.current) return; // nothing changed
    const isFirstRender = prevElementHashRef.current === '';
    prevElementHashRef.current = hash;

    try {
      // Filter out edges that reference non-existent nodes
      const nodeIds = new Set(newElements.filter(e => !e.data.source).map(e => e.data.id as string));
      const validElements = newElements.filter(el => {
        if (el.data.source) {
          // It's an edge — check both source and target exist
          return nodeIds.has(el.data.source as string) && nodeIds.has(el.data.target as string);
        }
        return true; // nodes always valid
      });

      cy.elements().remove();
      cy.add(validElements);

      cy.nodes().forEach((node) => {
        const level = node.data('level') as number;
        const dims = getNodeDimensions(level);
        node.style({ width: dims.width, height: dims.height });
      });

      cy.layout({
        ...getConcentricLayout(),
        animate: !isFirstRender,
    } as unknown as cytoscape.LayoutOptions).run();
    } catch { /* Cytoscape error — graph stays as-is */ }
  }, [centreProfileId, centreProfileName, nodes, edges]);

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

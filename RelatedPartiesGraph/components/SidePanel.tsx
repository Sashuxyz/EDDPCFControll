import * as React from 'react';
import { NodeData, MAX_DEPTH } from '../types';
import { sidePanelStyles } from '../styles/tokens';

interface SidePanelProps {
  node: NodeData | null;
  onExpand: (nodeId: string) => void;
  onOpenRecord: (etn: string, id: string) => void;
}

export const SidePanel: React.FC<SidePanelProps> = ({ node, onExpand, onOpenRecord }) => {
  if (!node) {
    return (
      <div style={sidePanelStyles.root}>
        <div style={sidePanelStyles.label}>Selected node</div>
        <div style={sidePanelStyles.placeholder}>Click a node to view details</div>
      </div>
    );
  }

  const isDrillable = node.ownKycProfileId !== null;
  const isDepthCapped = node.level >= MAX_DEPTH;
  const isCentre = node.level === 0;

  return (
    <div style={sidePanelStyles.root}>
      <div style={sidePanelStyles.name}>
        {node.displayName}
        {node.pep && <span style={sidePanelStyles.pepBadge}>PEP</span>}
      </div>
      <div style={sidePanelStyles.row}>
        <span><span style={sidePanelStyles.fieldLabel}>Role:</span> {node.partyTypeName}</span>
        {node.riskScore !== null && (
          <span><span style={sidePanelStyles.fieldLabel}>Risk Score:</span> {node.riskScore}</span>
        )}
        {node.pepLevel && (
          <span><span style={sidePanelStyles.fieldLabel}>PEP Level:</span> {node.pepLevel}</span>
        )}
        <span>
          <span style={sidePanelStyles.fieldLabel}>Own KYC Profile:</span>{' '}
          {isDrillable ? 'Yes' : 'No'}
        </span>
      </div>
      <div style={sidePanelStyles.actions}>
        {isDrillable && !isDepthCapped && !isCentre && (
          <button style={sidePanelStyles.actionButton} onClick={() => onExpand(node.id)} type="button">
            Expand
          </button>
        )}
        {isDepthCapped && isDrillable && (
          <span style={{ fontSize: 11, color: '#A19F9D' }}>Depth limit reached</span>
        )}
        <button style={sidePanelStyles.actionButton} onClick={() => onOpenRecord(node.etn, node.id)} type="button">
          Open Record
        </button>
      </div>
    </div>
  );
};

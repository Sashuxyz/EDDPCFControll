import * as React from 'react';
import { NodeData, MAX_DEPTH } from '../types';
import { sidePanelStyles } from '../styles/tokens';

interface SidePanelProps {
  node: NodeData | null;
  expandedProfileIds: Set<string>;
  onExpand: (nodeId: string) => void;
  onOpenRecord: (etn: string, id: string) => void;
}

export const SidePanel: React.FC<SidePanelProps> = ({ node, expandedProfileIds, onExpand, onOpenRecord }) => {
  const [status, setStatus] = React.useState('');

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
  const isAlreadyExpanded = isDrillable && expandedProfileIds.has(node.ownKycProfileId!);
  const canExpand = isDrillable && !isDepthCapped && !isCentre && !isAlreadyExpanded;

  const handleExpand = () => {
    setStatus('Expanding...');
    onExpand(node.id);
    setTimeout(() => setStatus(''), 3000);
  };

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
        {canExpand && (
          <button style={sidePanelStyles.actionButton} onClick={handleExpand} type="button">
            Expand
          </button>
        )}
        {isAlreadyExpanded && (
          <span style={{ fontSize: 11, color: '#107C10' }}>Already expanded</span>
        )}
        {isDepthCapped && isDrillable && !isAlreadyExpanded && (
          <span style={{ fontSize: 11, color: '#A19F9D' }}>Depth limit reached</span>
        )}
        <button style={sidePanelStyles.actionButton} onClick={() => onOpenRecord(node.etn, node.id)} type="button">
          Open Record
        </button>
      </div>
      {status && <div style={{ fontSize: 11, color: '#0078D4', marginTop: 6 }}>{status}</div>}
    </div>
  );
};

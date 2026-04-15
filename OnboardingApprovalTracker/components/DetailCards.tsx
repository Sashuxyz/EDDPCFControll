import * as React from 'react';
import { ApprovalStep } from '../types';
import { detailCardsStyles } from '../styles/tokens';
import { formatDateTime } from '../utils/dateFormat';

interface DetailCardsProps {
  steps: ApprovalStep[];
  onApproverClick: (recordId: string) => void;
}

function ApproverElement({ step, onClick }: { step: ApprovalStep; onClick: (id: string) => void }): React.ReactElement {
  if (step.status !== 'completed') {
    if (step.status === 'active') {
      return <div style={detailCardsStyles.approverMuted}>Awaiting review</div>;
    }
    return <div style={detailCardsStyles.approverMuted}>--</div>;
  }
  if (!step.recordId || !step.approverName || step.approverName === '(Unknown)') {
    return <div style={detailCardsStyles.approverPlain}>{step.approverName ?? '(Unknown)'}</div>;
  }
  return (
    <div
      style={detailCardsStyles.approver}
      role="link"
      tabIndex={0}
      onClick={() => onClick(step.recordId!)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(step.recordId!);
        }
      }}
    >
      {step.approverName}
    </div>
  );
}

function StatusLine({ step }: { step: ApprovalStep }): React.ReactElement {
  if (step.status === 'completed') return <div style={detailCardsStyles.statusApproved}>Approved</div>;
  if (step.status === 'active') return <div style={detailCardsStyles.statusActive}>In progress</div>;
  return <div style={detailCardsStyles.statusUpcoming}>Not started</div>;
}

function DateLine({ step }: { step: ApprovalStep }): React.ReactElement {
  return <div style={detailCardsStyles.date}>{step.approvedOn ? formatDateTime(step.approvedOn) : '\u00A0'}</div>;
}

export const DetailCards: React.FC<DetailCardsProps> = ({ steps, onApproverClick }) => {
  return (
    <div style={detailCardsStyles.row}>
      {steps.map((step, idx) => {
        const isLast = idx === steps.length - 1;
        const labelText =
          step.shortLabel === 'SH' ? 'Segment Head' :
          step.shortLabel === 'Compl.' ? 'Compliance' :
          step.shortLabel;
        return (
          <div key={step.key} style={isLast ? detailCardsStyles.cardLast : detailCardsStyles.card}>
            <div style={detailCardsStyles.label}>{labelText}</div>
            <ApproverElement step={step} onClick={onApproverClick} />
            <DateLine step={step} />
            <StatusLine step={step} />
          </div>
        );
      })}
    </div>
  );
};

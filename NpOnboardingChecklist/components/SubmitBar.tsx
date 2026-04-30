// NpOnboardingChecklist/components/SubmitBar.tsx
import * as React from 'react';

interface Props {
  pending: number;
  blocked: number;
  unresolved: number;
  completedAt: string | null;
  completedBy: string | null;
  onComplete: () => void;
  onRestart: () => void;
}

export function SubmitBar({ pending, blocked, unresolved, completedAt, completedBy, onComplete, onRestart }: Props): React.ReactElement {
  if (completedAt) {
    const displayDate = new Date(completedAt).toLocaleString('de-CH');
    return (
      <div style={{ ...barStyle, background: '#dff6dd', borderTop: '2px solid #107c10' }}>
        <div style={{ fontSize: 12, color: '#107c10', fontWeight: 600, flex: 1 }}>
          ✓ Checklist completed — {displayDate}{completedBy ? ` by ${completedBy}` : ''}
        </div>
        <button
          onClick={onRestart}
          style={{
            padding: '6px 16px', fontSize: 12, fontFamily: 'inherit', fontWeight: 600,
            background: '#fff', color: '#323130',
            border: '1px solid #8a8886', borderRadius: 2, cursor: 'pointer',
          }}
        >
          Restart checklist
        </button>
      </div>
    );
  }

  const canSubmit = pending === 0 && blocked === 0 && unresolved === 0;

  let infoText = '';
  if (!canSubmit) {
    const parts: string[] = [];
    if (pending > 0)    parts.push(`${pending} item${pending > 1 ? 's' : ''} not yet checked`);
    if (blocked > 0)    parts.push(`${blocked} manual check${blocked > 1 ? 's' : ''} not completed`);
    if (unresolved > 0) parts.push(`${unresolved} mismatch${unresolved > 1 ? 'es' : ''} unresolved`);
    infoText = parts.join(' · ');
  } else {
    infoText = 'All checks completed — ready to submit';
  }

  return (
    <div style={barStyle}>
      <div style={{ fontSize: 12, color: canSubmit ? '#0078d4' : '#605e5c', flex: 1 }}>
        {infoText}
      </div>
      <button
        disabled={!canSubmit}
        onClick={onComplete}
        style={{
          padding: '6px 20px', fontSize: 13, fontFamily: 'inherit', fontWeight: 600,
          background: canSubmit ? '#0078d4' : '#edebe9',
          color: canSubmit ? '#fff' : '#a19f9d',
          border: 'none', borderRadius: 2, cursor: canSubmit ? 'pointer' : 'not-allowed',
        }}
      >
        Complete checklist
      </button>
    </div>
  );
}

const barStyle: React.CSSProperties = {
  background: '#fff', borderTop: '1px solid #edebe9',
  padding: '10px 16px',
  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
  flexShrink: 0,
};

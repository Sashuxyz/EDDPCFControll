// NpOnboardingChecklist/components/ManualCheckItem.tsx
import * as React from 'react';
import { ManualNotDoneData, AnswerValue } from '../types';

interface Props {
  itemKey: string;
  label: string;
  answer: AnswerValue;
  notDone: ManualNotDoneData | undefined;
  isReadOnly: boolean;
  onAnswer: (key: string, value: 'yes' | 'no') => void;
  onNotDoneChange: (key: string, data: ManualNotDoneData) => void;
}

export function ManualCheckItem({
  itemKey, label, answer, notDone, isReadOnly,
  onAnswer, onNotDoneChange,
}: Props): React.ReactElement {
  const status =
    answer === 'yes' ? 'confirmed' :
    answer === 'no'  ? 'blocked'   : 'pending';

  const dotColor = status === 'confirmed' ? '#0078d4' : status === 'blocked' ? '#8a8886' : '#c8c6c4';
  const statusLabel = status === 'confirmed' ? 'Confirmed' : status === 'blocked' ? 'Not done' : '';

  const itemBg = answer === 'no' ? '#f3f2f1' : '#fff';
  const borderLeft = answer === 'no' ? '3px solid #8a8886' : undefined;

  const nd = notDone ?? { label, reason: '' };

  return (
    <div style={{ padding: '10px 14px 12px', borderBottom: '1px solid #edebe9', background: itemBg, borderLeft, paddingLeft: borderLeft ? 11 : 14 }}>
      {/* Status row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
        {statusLabel && (
          <span style={{ fontSize: 11, fontWeight: 600, color: status === 'confirmed' ? '#0078d4' : '#605e5c' }}>
            {statusLabel}
          </span>
        )}
      </div>

      {/* Title */}
      <div style={{ fontSize: 14, fontWeight: 600, color: '#201f1e', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, color: '#a19f9d', fontStyle: 'italic', marginBottom: 10 }}>Manual check</div>

      {/* Yes / No buttons */}
      {!isReadOnly && (
        <div style={{ display: 'inline-flex', border: '1px solid #8a8886', borderRadius: 2, overflow: 'hidden', height: 28 }}>
          <button onClick={() => onAnswer(itemKey, 'yes')} style={ynStyle(answer === 'yes', false)}>Yes</button>
          <button onClick={() => onAnswer(itemKey, 'no')}  style={ynStyle(false, answer === 'no')}>No</button>
        </div>
      )}
      {isReadOnly && (
        <span style={{ fontSize: 12, color: '#605e5c' }}>
          {answer === 'yes' ? 'Confirmed' : answer === 'no' ? 'Not done' : 'Pending'}
        </span>
      )}

      {/* Blocked form */}
      {answer === 'no' && !isReadOnly && (
        <div style={{ marginTop: 10, background: '#fff', border: '1px solid #8a8886', borderRadius: 2, padding: '10px 12px 12px' }}>
          <div style={{ fontSize: 11, color: '#605e5c', marginBottom: 4 }}>
            Reason <span style={{ color: '#a19f9d', fontWeight: 400 }}>(optional)</span>
          </div>
          <textarea
            value={nd.reason}
            onChange={e => onNotDoneChange(itemKey, { ...nd, reason: e.target.value })}
            placeholder="Describe why this check could not be completed"
            style={taStyle}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#605e5c', marginTop: 8 }}>
            <svg width={11} height={11} viewBox="0 0 16 16" style={{ flexShrink: 0 }}>
              <circle cx={8} cy={8} r={6.5} stroke="#8a8886" strokeWidth={1.3} fill="none" />
              <line x1={8} y1={4.5} x2={8} y2={9} stroke="#8a8886" strokeWidth={1.3} strokeLinecap="round" />
              <circle cx={8} cy={11} r={0.7} fill="#8a8886" />
            </svg>
            This check blocks checklist completion
          </div>
        </div>
      )}
      {answer === 'no' && isReadOnly && notDone?.reason && (
        <div style={{ marginTop: 8, fontSize: 12, color: '#605e5c' }}>Reason: {notDone.reason}</div>
      )}
    </div>
  );
}

function ynStyle(isYes: boolean, isNo: boolean): React.CSSProperties {
  const active = isYes || isNo;
  return {
    width: 72, fontSize: 12, fontFamily: 'inherit', fontWeight: active ? 600 : 400,
    background: isYes ? '#0078d4' : isNo ? '#605e5c' : '#fff',
    color: active ? '#fff' : '#323130',
    border: 'none', cursor: 'pointer', lineHeight: '28px',
    borderRight: isYes ? '1px solid #8a8886' : undefined,
  };
}

const taStyle: React.CSSProperties = {
  width: '100%', background: '#f3f2f1', border: 'none',
  borderBottom: '2px solid #c8c6c4', borderRadius: '2px 2px 0 0',
  padding: '5px 7px', fontSize: 12, fontFamily: 'inherit', color: '#201f1e',
  resize: 'vertical', minHeight: 48, outline: 'none',
};

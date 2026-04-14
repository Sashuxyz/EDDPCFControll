// NpOnboardingChecklist/components/CheckItem.tsx
import * as React from 'react';
import { MismatchData, AnswerValue } from '../types';

interface Props {
  itemKey: string;
  label: string;
  crmValue: string;
  answer: AnswerValue;
  mismatch: MismatchData | undefined;
  isReadOnly: boolean;
  onAnswer: (key: string, value: 'yes' | 'no') => void;
  onMismatchChange: (key: string, data: MismatchData) => void;
}

const lockPath = 'M4 6V4a2 2 0 014 0v2';

export function CheckItem({
  itemKey, label, crmValue, answer, mismatch, isReadOnly,
  onAnswer, onMismatchChange,
}: Props): React.ReactElement {
  const [descInvalid, setDescInvalid] = React.useState(false);

  const status: 'pending' | 'confirmed' | 'mismatch' | 'resolved' =
    answer === 'yes' ? 'confirmed' :
    answer === 'no' && mismatch?.resolved ? 'resolved' :
    answer === 'no' ? 'mismatch' : 'pending';

  const dotColor =
    status === 'confirmed' || status === 'resolved' ? '#0078d4' : '#c8c6c4';

  const statusLabel =
    status === 'confirmed' ? 'Confirmed' :
    status === 'resolved'  ? 'Resolved'  :
    status === 'mismatch'  ? 'Mismatch'  : '';

  const itemBg = answer === 'no' ? '#faf9f8' : '#fff';
  const borderLeft = answer === 'no' ? '3px solid #c8c6c4' : undefined;

  function handleResolve(checked: boolean): void {
    if (!mismatch) return;
    if (checked && !mismatch.description.trim()) {
      setDescInvalid(true);
      return;
    }
    setDescInvalid(false);
    onMismatchChange(itemKey, { ...mismatch, resolved: checked });
  }

  const md = mismatch ?? { description: '', actionTaken: '', resolution: 'Finnova Corrected Manually' as const, resolved: false };

  return (
    <div style={{ padding: '10px 14px 12px', borderBottom: '1px solid #edebe9', background: itemBg, borderLeft, paddingLeft: borderLeft ? 11 : 14 }}>
      {/* Status row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
        {statusLabel && (
          <span style={{ fontSize: 11, fontWeight: 600, color: status === 'confirmed' || status === 'resolved' ? '#0078d4' : '#605e5c' }}>
            {statusLabel}
          </span>
        )}
      </div>

      {/* Title + lock icon */}
      <div style={{ fontSize: 14, fontWeight: 600, color: '#201f1e', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 5 }}>
        {label}
        <svg width={12} height={14} viewBox="0 0 12 14" fill="none" style={{ opacity: 0.45, flexShrink: 0 }}>
          <rect x={2} y={6} width={8} height={7} rx={1.5} stroke="#605e5c" strokeWidth={1.2} />
          <path d={lockPath} stroke="#605e5c" strokeWidth={1.2} />
        </svg>
      </div>

      {/* CRM value */}
      <div style={{ fontSize: 13, color: '#605e5c', marginBottom: 10 }}>{crmValue || '\u2014'}</div>

      {/* Yes / No buttons */}
      {!isReadOnly && (
        <div style={{ display: 'inline-flex', border: '1px solid #8a8886', borderRadius: 2, overflow: 'hidden', height: 28 }}>
          <button onClick={() => onAnswer(itemKey, 'yes')} style={ynStyle(answer === 'yes', false)}>Yes</button>
          <button onClick={() => onAnswer(itemKey, 'no')}  style={ynStyle(false, answer === 'no')}>No</button>
        </div>
      )}
      {isReadOnly && (
        <span style={{ fontSize: 12, color: '#605e5c' }}>
          {answer === 'yes' ? 'Confirmed' : answer === 'no' ? (mismatch?.resolved ? 'Resolved' : 'Mismatch') : 'Pending'}
        </span>
      )}

      {/* Mismatch form */}
      {answer === 'no' && (
        <div style={{ marginTop: 10, background: '#fff', border: '1px solid #c8c6c4', borderRadius: 2, padding: '10px 12px 12px' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#605e5c', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
            Document discrepancy
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
            <div>
              <div style={fLabelStyle}>What is incorrect in core banking?<span style={{ color: '#605e5c' }}>*</span></div>
              <textarea
                disabled={isReadOnly || mismatch?.resolved}
                value={md.description}
                onChange={e => { setDescInvalid(false); onMismatchChange(itemKey, { ...md, description: e.target.value }); }}
                placeholder="Required"
                style={{ ...taStyle, borderBottomColor: descInvalid ? '#605e5c' : '#c8c6c4' }}
              />
              {descInvalid && <div style={{ fontSize: 11, color: '#605e5c', marginTop: 3 }}>Required before resolving.</div>}
            </div>
            <div>
              <div style={fLabelStyle}>Corrective action taken</div>
              <textarea
                disabled={isReadOnly || mismatch?.resolved}
                value={md.actionTaken}
                onChange={e => onMismatchChange(itemKey, { ...md, actionTaken: e.target.value })}
                style={taStyle}
              />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap', marginTop: 8 }}>
            <div>
              <div style={fLabelStyle}>Resolution</div>
              <select
                disabled={isReadOnly || mismatch?.resolved}
                value={md.resolution}
                onChange={e => onMismatchChange(itemKey, { ...md, resolution: e.target.value as 'Finnova Corrected Manually' | 'Other' })}
                style={selStyle}
              >
                <option value="Finnova Corrected Manually">Finnova Corrected Manually</option>
                <option value="Other">Other</option>
              </select>
            </div>
            {!isReadOnly && !mismatch?.resolved && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#323130', cursor: 'pointer', marginBottom: 2 }}>
                <input type="checkbox" checked={false} onChange={e => handleResolve(e.target.checked)}
                  style={{ width: 14, height: 14, accentColor: '#0078d4', cursor: 'pointer' }} />
                Mark as resolved
              </label>
            )}
            {mismatch?.resolved && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: '#0078d4', background: '#eff6fc', border: '1px solid #0078d4', borderRadius: 2, padding: '2px 8px' }}>
                <svg width={10} height={10} viewBox="0 0 10 10"><path d="M2 5l2.5 2.5L8 3" stroke="#0078d4" strokeWidth={1.5} fill="none" strokeLinecap="round"/></svg>
                Resolved
              </span>
            )}
          </div>
        </div>
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

const fLabelStyle: React.CSSProperties = { fontSize: 11, color: '#605e5c', marginBottom: 3 };
const taStyle: React.CSSProperties = {
  width: '100%', background: '#f3f2f1', border: 'none',
  borderBottom: '2px solid #c8c6c4', borderRadius: '2px 2px 0 0',
  padding: '5px 7px', fontSize: 12, fontFamily: 'inherit', color: '#201f1e',
  resize: 'vertical', minHeight: 48, outline: 'none',
};
const selStyle: React.CSSProperties = {
  background: '#f3f2f1', border: 'none', borderBottom: '1px solid #8a8886',
  borderRadius: '2px 2px 0 0', padding: '5px 7px', fontSize: 12,
  fontFamily: 'inherit', color: '#201f1e', outline: 'none', cursor: 'pointer',
};

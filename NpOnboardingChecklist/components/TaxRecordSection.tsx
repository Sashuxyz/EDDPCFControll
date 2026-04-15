// NpOnboardingChecklist/components/TaxRecordSection.tsx
import * as React from 'react';
import { TaxRecord, AnswerValue, MismatchData } from '../types';
import { taxKey, taxLabel } from '../types';

interface Props {
  taxRecords: TaxRecord[];
  answers: Record<string, AnswerValue>;
  mismatches: Record<string, MismatchData>;
  isReadOnly: boolean;
  onAnswer: (key: string, value: 'yes' | 'no') => void;
  onMismatchChange: (key: string, data: MismatchData) => void;
}

export function TaxRecordSection({
  taxRecords, answers, mismatches, isReadOnly, onAnswer, onMismatchChange,
}: Props): React.ReactElement {
  return (
    <div>
      <div style={pillStyle}>
        <svg width={11} height={11} viewBox="0 0 12 12" fill="none">
          <rect x={1} y={2} width={10} height={8} rx={1} stroke="#0078d4" strokeWidth={1.1} />
          <line x1={3} y1={5} x2={9} y2={5} stroke="#0078d4" strokeWidth={1} />
          <line x1={3} y1={7.5} x2={7} y2={7.5} stroke="#0078d4" strokeWidth={1} />
        </svg>
        {taxRecords.length} tax record{taxRecords.length !== 1 ? 's' : ''}
      </div>

      <div style={{ padding: '0 12px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {taxRecords.length === 0 && (
          <div style={{ fontSize: 13, color: '#a19f9d', padding: '4px 0' }}>No tax records found.</div>
        )}
        {taxRecords.map((rec, i) => (
          <TaxCard
            key={rec.id}
            rec={rec}
            index={i}
            answer={answers[taxKey(i)] ?? null}
            mismatch={mismatches[taxKey(i)]}
            isReadOnly={isReadOnly}
            onAnswer={onAnswer}
            onMismatchChange={onMismatchChange}
          />
        ))}
      </div>
    </div>
  );
}

interface TaxCardProps {
  rec: TaxRecord;
  index: number;
  answer: AnswerValue;
  mismatch: MismatchData | undefined;
  isReadOnly: boolean;
  onAnswer: (key: string, value: 'yes' | 'no') => void;
  onMismatchChange: (key: string, data: MismatchData) => void;
}

function TaxCard({ rec, index, answer, mismatch, isReadOnly, onAnswer, onMismatchChange }: TaxCardProps): React.ReactElement {
  const key = taxKey(index);
  const [descInvalid, setDescInvalid] = React.useState(false);

  React.useEffect(() => { setDescInvalid(false); }, [answer]);

  const status =
    answer === 'yes' ? 'confirmed' :
    answer === 'no' && mismatch?.resolved ? 'resolved' :
    answer === 'no' ? 'mismatch' : 'pending';
  const dotColor = status === 'confirmed' || status === 'resolved' ? '#0078d4' : '#c8c6c4';
  const statusLabel = status === 'confirmed' ? 'Confirmed' : status === 'resolved' ? 'Resolved' : status === 'mismatch' ? 'Mismatch' : '';

  const md = mismatch ?? { description: '', actionTaken: '', resolution: 'Finnova Corrected Manually' as const, resolved: false };

  function handleResolve(checked: boolean): void {
    if (checked && !md.description.trim()) { setDescInvalid(true); return; }
    setDescInvalid(false);
    onMismatchChange(key, { ...md, resolved: checked });
  }

  return (
    <div style={cardStyle}>
      <div style={cardHdrStyle}>Tax record {index + 1}</div>
      <div style={{ display: 'flex', gap: 24, padding: '8px 12px 10px' }}>
        {([['Tax domicile', rec.taxDomicile], ['Tax ID', rec.taxId]] as [string, string][]).map(([lbl, val]) => (
          <div key={lbl}>
            <div style={{ fontSize: 10, color: '#a19f9d', marginBottom: 2 }}>{lbl}</div>
            <div style={{ fontSize: 13, color: '#201f1e', fontWeight: 500 }}>{val || '\u2014'}</div>
          </div>
        ))}
      </div>

      <div style={{ borderTop: '1px solid #edebe9', padding: '10px 12px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
          {statusLabel && (
            <span style={{ fontSize: 11, fontWeight: 600, color: status === 'confirmed' || status === 'resolved' ? '#0078d4' : '#605e5c' }}>
              {statusLabel}
            </span>
          )}
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#201f1e', marginBottom: 10 }}>{taxLabel(index)}</div>

        {!isReadOnly && (
          <div style={{ display: 'inline-flex', border: '1px solid #8a8886', borderRadius: 2, overflow: 'hidden', height: 28 }}>
            <button onClick={() => onAnswer(key, 'yes')} style={ynStyle(answer === 'yes', false)}>Yes</button>
            <button onClick={() => onAnswer(key, 'no')}  style={ynStyle(false, answer === 'no')}>No</button>
          </div>
        )}
        {isReadOnly && (
          <span style={{ fontSize: 12, color: '#605e5c' }}>
            {answer === 'yes' ? 'Confirmed' : answer === 'no' ? (mismatch?.resolved ? 'Resolved' : 'Mismatch') : 'Pending'}
          </span>
        )}

        {answer === 'no' && (
          <div style={{ marginTop: 10, background: '#fff', border: '1px solid #c8c6c4', borderRadius: 2, padding: '10px 12px 12px' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#605e5c', marginBottom: 8, textTransform: 'uppercase' as const, letterSpacing: '0.03em' }}>
              Document discrepancy
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
              <div>
                <div style={fLabelStyle}>What is incorrect in core banking?<span style={{ color: '#605e5c' }}>*</span></div>
                <textarea disabled={isReadOnly || md.resolved} value={md.description}
                  onChange={e => { setDescInvalid(false); onMismatchChange(key, { ...md, description: e.target.value }); }}
                  placeholder="Required"
                  style={{ ...taStyle, borderBottomColor: descInvalid ? '#605e5c' : '#c8c6c4' }} />
                {descInvalid && <div style={{ fontSize: 11, color: '#605e5c', marginTop: 3 }}>Required before resolving.</div>}
              </div>
              <div>
                <div style={fLabelStyle}>Corrective action taken</div>
                <textarea disabled={isReadOnly || md.resolved} value={md.actionTaken}
                  onChange={e => onMismatchChange(key, { ...md, actionTaken: e.target.value })} style={taStyle} />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap', marginTop: 8 }}>
              <div>
                <div style={fLabelStyle}>Resolution</div>
                <select disabled={isReadOnly || md.resolved} value={md.resolution}
                  onChange={e => onMismatchChange(key, { ...md, resolution: e.target.value as 'Finnova Corrected Manually' | 'Other' })}
                  style={selStyle}>
                  <option value="Finnova Corrected Manually">Finnova Corrected Manually</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              {!isReadOnly && !md.resolved && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#323130', cursor: 'pointer', marginBottom: 2 }}>
                  <input type="checkbox" checked={md.resolved} onChange={e => handleResolve(e.target.checked)}
                    style={{ width: 14, height: 14, accentColor: '#0078d4', cursor: 'pointer' }} />
                  Mark as resolved
                </label>
              )}
              {md.resolved && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: '#0078d4', background: '#eff6fc', border: '1px solid #0078d4', borderRadius: 2, padding: '2px 8px' }}>
                  <svg width={10} height={10} viewBox="0 0 10 10"><path d="M2 5l2.5 2.5L8 3" stroke="#0078d4" strokeWidth={1.5} fill="none" strokeLinecap="round"/></svg>
                  Resolved
                </span>
              )}
            </div>
          </div>
        )}
      </div>
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

const pillStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 5,
  background: '#eff6fc', border: '1px solid #c7e0f4', borderRadius: 2,
  padding: '3px 10px', fontSize: 11, fontWeight: 600, color: '#0078d4',
  margin: '10px 14px 8px',
};
const cardStyle: React.CSSProperties = { border: '1px solid #edebe9', borderRadius: 2 };
const cardHdrStyle: React.CSSProperties = {
  background: '#f3f2f1', padding: '6px 12px', fontSize: 12,
  fontWeight: 600, color: '#323130', borderBottom: '1px solid #edebe9',
};
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

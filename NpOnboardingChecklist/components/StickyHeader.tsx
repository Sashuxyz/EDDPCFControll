// NpOnboardingChecklist/components/StickyHeader.tsx
import * as React from 'react';
import { ITEM_LABELS, taxLabel } from '../types';

interface Props {
  done: number;
  total: number;
  unresolvedKeys: string[];
  blockedKeys: string[];
  onScrollTo: (key: string) => void;
}

export function StickyHeader({ done, total, unresolvedKeys, blockedKeys, onScrollTo }: Props): React.ReactElement {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const label = (key: string): string =>
    (ITEM_LABELS as Record<string, string>)[key] ?? (key.startsWith('tx') ? taxLabel(parseInt(key.slice(2), 10)) : key);

  return (
    <div style={hdrStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 16, fontWeight: 600, color: '#201f1e', letterSpacing: '-0.01em' }}>
          NP Onboarding Checklist
        </span>
        <span style={{ fontSize: 12, color: '#605e5c' }}>
          {done} of {total} items checked
        </span>
      </div>

      <div style={{ height: 4, background: '#edebe9', borderRadius: 2 }}>
        <div style={{ width: `${pct}%`, height: 4, background: '#0078d4', borderRadius: 2, transition: 'width 0.25s ease' }} />
      </div>

      {unresolvedKeys.length > 0 && (
        <div style={alertBarStyle}>
          <svg width={13} height={13} viewBox="0 0 16 16" style={{ flexShrink: 0, marginTop: 1 }}>
            <path d="M8 1.5L1.5 13.5h13L8 1.5z" stroke="#605e5c" strokeWidth={1.3} fill="none" strokeLinejoin="round" />
            <line x1={8} y1={6} x2={8} y2={10} stroke="#605e5c" strokeWidth={1.3} strokeLinecap="round" />
            <circle cx={8} cy={12} r={0.7} fill="#605e5c" />
          </svg>
          <span>
            <strong>Unresolved mismatches &#x2014; </strong>
            {unresolvedKeys.map((k, idx) => (
              <React.Fragment key={k}>
                {idx > 0 && ', '}
                <span style={{ textDecoration: 'underline', cursor: 'pointer' }} onClick={() => onScrollTo(k)}>
                  {label(k)}
                </span>
              </React.Fragment>
            ))}
          </span>
        </div>
      )}

      {blockedKeys.length > 0 && (
        <div style={blockBarStyle}>
          <svg width={13} height={13} viewBox="0 0 16 16" style={{ flexShrink: 0, marginTop: 1 }}>
            <circle cx={8} cy={8} r={6.5} stroke="#8a8886" strokeWidth={1.3} fill="none" />
            <line x1={8} y1={4.5} x2={8} y2={9} stroke="#8a8886" strokeWidth={1.3} strokeLinecap="round" />
            <circle cx={8} cy={11} r={0.7} fill="#8a8886" />
          </svg>
          <span>
            <strong>Manual checks not completed &#x2014; </strong>
            {blockedKeys.map((k, idx) => (
              <React.Fragment key={k}>
                {idx > 0 && ', '}
                <span style={{ textDecoration: 'underline', cursor: 'pointer' }} onClick={() => onScrollTo(k)}>
                  {label(k)}
                </span>
              </React.Fragment>
            ))}
          </span>
        </div>
      )}
    </div>
  );
}

const hdrStyle: React.CSSProperties = {
  position: 'sticky', top: 0, zIndex: 100,
  background: '#fff', borderBottom: '1px solid #edebe9',
  padding: '12px 16px 10px',
};
const alertBarStyle: React.CSSProperties = {
  marginTop: 6, padding: '7px 10px', borderRadius: 2,
  background: '#f3f2f1', border: '1px solid #c8c6c4', color: '#323130',
  fontSize: 12, display: 'flex', alignItems: 'flex-start', gap: 7, lineHeight: 1.4,
};
const blockBarStyle: React.CSSProperties = {
  marginTop: 6, padding: '7px 10px', borderRadius: 2,
  background: '#edebe9', border: '1px solid #8a8886', color: '#201f1e',
  fontSize: 12, display: 'flex', alignItems: 'flex-start', gap: 7, lineHeight: 1.4,
};

// Top bar — coral-forward Aurora command surface.
// Hosts the pulse dot, title, Trigger Agent Run slot, and right-side meta cluster.
// AgentTriggerButton owns its own state machine + drone overlay; it reports
// its flying state via onFlyingChange so the bar can grow when active.

import * as React from 'react';
import { agentBar } from '../styles/tokens';
import { formatSwissDate } from '../utils/formatters';
import { AgentTriggerButton } from './AgentTriggerButton';

interface HeaderStripProps {
  profileName?:    string;
  schemaVersion?:  string;
  lastRunAt?:      string;
  kycProfileId:    string;
  webAPI:          ComponentFramework.WebApi;
}

const KEYFRAMES = `
@keyframes kft-aurora1 { 0%,100% { transform: translate(-10%,-30%) scale(1);   } 50% { transform: translate(20%,10%)  scale(1.3); } }
@keyframes kft-aurora2 { 0%,100% { transform: translate(60%,20%)  scale(1.1); } 50% { transform: translate(30%,-10%) scale(0.9); } }
@keyframes kft-aurora3 { 0%,100% { transform: translate(80%,-20%) scale(0.9); } 50% { transform: translate(50%,40%)  scale(1.2); } }
@keyframes kft-pulse-dot { 0%,100% { box-shadow: 0 0 0 0 rgba(255,255,255,0.7); } 50% { box-shadow: 0 0 0 8px rgba(255,255,255,0); } }
@media (prefers-reduced-motion: reduce) {
  .kft-aurora-blob, .kft-pulse-dot { animation: none !important; }
}
`;

const BAR_HEIGHT_IDLE    = 68;   // compact when no run in progress (room for title + disclaimer)
const BAR_HEIGHT_RUNNING = 88;   // expanded to fit the workspace card

export const HeaderStrip: React.FC<HeaderStripProps> = ({
  schemaVersion, lastRunAt, kycProfileId, webAPI,
}) => {
  const [flying, setFlying] = React.useState(false);
  const minHeight = flying ? BAR_HEIGHT_RUNNING : BAR_HEIGHT_IDLE;

  return (
    <div
      style={{
        position:            'relative',
        overflow:            'hidden',
        padding:             flying ? '16px 24px' : '12px 24px',
        display:             'flex',
        alignItems:          'center',
        gap:                 18,
        background:          agentBar.bgGradient,
        borderBottom:        `1px solid ${agentBar.borderBottom}`,
        borderTopLeftRadius:  4,
        borderTopRightRadius: 4,
        color:               '#fff',
        fontFamily:          agentBar.fontFamily,
        minHeight,
        minWidth:            1000,
        transition:          'min-height 250ms ease, padding 250ms ease',
      }}
    >
      <style>{KEYFRAMES}</style>

      {/* Aurora blob layer */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} aria-hidden="true">
        <div className="kft-aurora-blob" style={blobStyle(300, agentBar.blobCoral, 0.55, 'kft-aurora1', '12s', '5%',  undefined)} />
        <div className="kft-aurora-blob" style={blobStyle(260, agentBar.blobPink,  0.40, 'kft-aurora2', '14s', '35%', undefined)} />
        <div className="kft-aurora-blob" style={blobStyle(240, agentBar.blobAmber, 0.30, 'kft-aurora3', '16s', undefined, '0%')}  />
      </div>

      {/* Pulse dot */}
      <span
        className="kft-pulse-dot"
        style={{
          width: 10, height: 10, borderRadius: '50%', background: '#fff',
          position: 'relative', zIndex: 1,
          animation: 'kft-pulse-dot 2s infinite',
          flexShrink: 0,
        }}
        aria-hidden="true"
      />

      {/* Title + disclaimer (stacked) */}
      <div style={{
        display:    'flex',
        flexDirection: 'column',
        position:   'relative',
        zIndex:     1,
        flexShrink: 0,
        gap:        2,
        maxWidth:   360,
      }}>
        <h2 style={{
          margin: 0, fontSize: 18, fontWeight: 600,
          letterSpacing: '-0.005em',
        }}>
          KYC Agent Output
        </h2>
        <span style={{
          fontSize:    11,
          fontWeight:  400,
          opacity:     0.78,
          lineHeight:  1.3,
        }}>
          Please note that AI generated content may be incorrect. Users are accountable to ensure correctness of data.
        </span>
      </div>

      {/* Trigger button slot (owns the workspace card + drone when flying) */}
      <AgentTriggerButton
        kycProfileId={kycProfileId}
        webAPI={webAPI}
        onFlyingChange={setFlying}
      />

      <span style={{ flex: 1, minWidth: 60 }} />

      {/* Right meta cluster — stacked: schema chip on top, last run below */}
      {(schemaVersion || lastRunAt) && (
        <div
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
            gap: 4, position: 'relative', zIndex: 1, flexShrink: 0,
          }}
        >
          {schemaVersion && (
            <span
              aria-hidden="true"
              style={{
                fontSize: 11, padding: '2px 9px', borderRadius: 999,
                background: 'rgba(255,255,255,0.18)',
                border: '1px solid rgba(255,255,255,0.30)',
                fontWeight: 500,
              }}
            >schema {schemaVersion}</span>
          )}
          {lastRunAt && (
            <span style={{ fontSize: 11, opacity: 0.78 }}>
              last run · {formatSwissDate(lastRunAt)}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

function blobStyle(
  size: number, color: string, opacity: number,
  anim: string, duration: string,
  left: string | undefined, right: string | undefined,
): React.CSSProperties {
  return {
    position: 'absolute',
    width: size, height: size,
    borderRadius: '50%',
    background: `radial-gradient(circle, ${color} 0%, transparent 60%)`,
    opacity,
    filter: 'blur(50px)',
    animation: `${anim} ${duration} ease-in-out infinite`,
    top: '-30%',
    ...(left  !== undefined ? { left }  : {}),
    ...(right !== undefined ? { right } : {}),
  };
}

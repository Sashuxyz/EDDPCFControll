// Top bar — coral-forward Aurora command surface.
// Hosts the pulse dot, title, Trigger Agent Run slot, schema pill, last-run meta.
// AgentTriggerButton is responsible for its own state machine + drone overlay.

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

export const HeaderStrip: React.FC<HeaderStripProps> = ({
  schemaVersion, lastRunAt, kycProfileId, webAPI,
}) => (
  <div
    style={{
      position:     'relative',
      overflow:     'hidden',
      padding:      '18px 24px',
      display:      'flex',
      alignItems:   'center',
      gap:          18,
      background:   agentBar.bgGradient,
      borderBottom: `1px solid ${agentBar.borderBottom}`,
      color:        '#fff',
      fontFamily:   agentBar.fontFamily,
      minHeight:    64,
      minWidth:     1000,
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
      }}
      aria-hidden="true"
    />

    {/* Title */}
    <h2 style={{
      margin: 0, fontSize: 18, fontWeight: 600,
      letterSpacing: '-0.005em', position: 'relative', zIndex: 1,
    }}>
      KYC Agent Output
    </h2>

    {/* Trigger button slot (owns the drone) */}
    <AgentTriggerButton kycProfileId={kycProfileId} webAPI={webAPI} />

    <span style={{ flex: 1, minWidth: 260 }} />

    {schemaVersion && (
      <span
        aria-hidden="true"
        style={{
          fontSize: 11, padding: '3px 9px', borderRadius: 999,
          background: 'rgba(255,255,255,0.18)',
          border: '1px solid rgba(255,255,255,0.30)',
          fontWeight: 500, position: 'relative', zIndex: 1,
        }}
      >schema {schemaVersion}</span>
    )}

    {lastRunAt && (
      <span style={{ fontSize: 12, opacity: 0.92, position: 'relative', zIndex: 1 }}>
        last run · {formatSwissDate(lastRunAt)}
      </span>
    )}
  </div>
);

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

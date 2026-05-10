// Presentational drone-bot animation for the Trigger Agent Run flow.
// Renders nothing when idle. When flying, renders an SVG drone that
// patrols three "documents" in the spacer area between the launch pad
// and the schema pill, dwelling over each one and emitting a scan beam.
//
// Position constants assume the HeaderStrip uses min-width:1000px so
// the spacer always has enough room. In a real D365 form bar (typically
// 1100-1400px wide), the docs sit between left:510 and left:712, well
// clear of the title (left:62-260) and launch pad (left:270-470).

import * as React from 'react';

interface AgentDroneProps {
  /** 'flying' renders drone+docs+beams; 'idle' renders null. */
  mode: 'idle' | 'flying';
}

const KEYFRAMES = `
@keyframes kft-flight-docs {
  0%       { transform: translate(0px,    -2px); }
  6%, 14%  { transform: translate(0px,    -2px); }
  20%      { transform: translate(45px,   -8px); }
  26%, 40% { transform: translate(90px,   -2px); }
  46%      { transform: translate(135px,  -8px); }
  52%, 66% { transform: translate(180px,  -2px); }
  72%      { transform: translate(135px,  -8px); }
  80%      { transform: translate(90px,   -2px); }
  88%      { transform: translate(45px,   -8px); }
  100%     { transform: translate(0px,    -2px); }
}
@keyframes kft-drone-hover { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-2px); } }
@keyframes kft-prop        { from { transform: rotate(0); } to { transform: rotate(360deg); } }
@keyframes kft-ant-glow    { 0%,100% { fill:#FFC477; opacity:0.6; } 50% { fill:#fff; opacity:1; } }
@keyframes kft-doc-1 { 0%,4%,16%,100% { filter:brightness(1); } 7%,13% { filter:brightness(1.4) drop-shadow(0 0 6px #FFC477); } }
@keyframes kft-doc-2 { 0%,24%,42%,100% { filter:brightness(1); } 27%,39% { filter:brightness(1.4) drop-shadow(0 0 6px #FFC477); } }
@keyframes kft-doc-3 { 0%,50%,68%,100% { filter:brightness(1); } 53%,65% { filter:brightness(1.4) drop-shadow(0 0 6px #FFC477); } }
@keyframes kft-beam-1 { 0%,4%,16%,100% { opacity:0; } 8%,12% { opacity:0.85; } }
@keyframes kft-beam-2 { 0%,24%,42%,100% { opacity:0; } 28%,38% { opacity:0.85; } }
@keyframes kft-beam-3 { 0%,50%,68%,100% { opacity:0; } 54%,64% { opacity:0.85; } }
@media (prefers-reduced-motion: reduce) {
  .kft-drone-flight,
  .kft-drone-hover,
  .kft-drone-prop  { animation: none !important; }
  .kft-doc, .kft-beam { animation: none !important; opacity: 1 !important; }
}
`;

const Document: React.FC<{ leftPx: number; lineWidths: [number, number, number, number]; highlightAnim: string }> =
  ({ leftPx, lineWidths, highlightAnim }) => (
    <div
      className="kft-doc"
      style={{
        position: 'absolute', left: `${leftPx}px`, top: '19px', zIndex: 1,
        animation: `${highlightAnim} 10s linear infinite`,
      }}
      aria-hidden="true"
    >
      <svg width="22" height="26" viewBox="0 0 22 26">
        <path d="M2 2 H14 L20 8 V24 H2 Z" fill="#fff" stroke="rgba(122,22,49,0.3)" strokeWidth="0.5"/>
        <path d="M14 2 V8 H20" fill="none" stroke="#7a1631" strokeWidth="0.5"/>
        <rect x="5" y="11" width={lineWidths[0]} height="1" fill="#7a1631"/>
        <rect x="5" y="14" width={lineWidths[1]} height="1" fill="#7a1631"/>
        <rect x="5" y="17" width={lineWidths[2]} height="1" fill="#7a1631"/>
        <rect x="5" y="20" width={lineWidths[3]} height="1" fill="#7a1631"/>
      </svg>
    </div>
  );

const Beam: React.FC<{ leftPx: number; gradId: string; beamAnim: string }> =
  ({ leftPx, gradId, beamAnim }) => (
    <svg
      className="kft-beam"
      style={{
        position: 'absolute', left: `${leftPx}px`, top: '1px', opacity: 0,
        animation: `${beamAnim} 10s linear infinite`,
        pointerEvents: 'none', zIndex: 2,
      }}
      width="14" height="22" viewBox="0 0 14 22"
      aria-hidden="true"
    >
      <path d="M7 22 L0 0 L14 0 Z" fill={`url(#${gradId})`}/>
      <defs>
        <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%"   stopColor="#FFC477" stopOpacity="0"/>
          <stop offset="100%" stopColor="#FFC477" stopOpacity="0.95"/>
        </linearGradient>
      </defs>
    </svg>
  );

export const AgentDrone: React.FC<AgentDroneProps> = ({ mode }) => {
  if (mode === 'idle') return null;
  return (
    <>
      <style>{KEYFRAMES}</style>

      <Document leftPx={510} lineWidths={[11, 11, 8,  11]} highlightAnim="kft-doc-1" />
      <Document leftPx={600} lineWidths={[11, 9,  11, 6 ]} highlightAnim="kft-doc-2" />
      <Document leftPx={690} lineWidths={[9,  11, 11, 9 ]} highlightAnim="kft-doc-3" />

      <Beam leftPx={514} gradId="kftBeam1" beamAnim="kft-beam-1" />
      <Beam leftPx={604} gradId="kftBeam2" beamAnim="kft-beam-2" />
      <Beam leftPx={694} gradId="kftBeam3" beamAnim="kft-beam-3" />

      <div
        className="kft-drone-flight"
        style={{
          position: 'absolute', left: '505px', top: '0px', zIndex: 3,
          animation: 'kft-flight-docs 10s cubic-bezier(0.45,0,0.55,1) infinite',
          pointerEvents: 'none',
        }}
        aria-hidden="true"
      >
        <div
          className="kft-drone-hover"
          style={{ animation: 'kft-drone-hover 1.2s ease-in-out infinite' }}
        >
          <svg width="32" height="24" viewBox="0 0 32 24" fill="none">
            <line x1="16" y1="0" x2="16" y2="4" stroke="#fff" strokeWidth="1.2"/>
            <circle cx="16" cy="0.8" r="1.4" style={{ animation: 'kft-ant-glow 0.9s ease-in-out infinite' }}/>
            <line x1="6"  y1="11" x2="2"  y2="11" stroke="#fff" strokeWidth="1.2"/>
            <line x1="26" y1="11" x2="30" y2="11" stroke="#fff" strokeWidth="1.2"/>
            <ellipse className="kft-drone-prop" cx="2"  cy="11" rx="3" ry="0.8" fill="#fff" opacity="0.7"
              style={{ transformOrigin: '2px 11px',  animation: 'kft-prop 0.15s linear infinite' }}/>
            <ellipse className="kft-drone-prop" cx="30" cy="11" rx="3" ry="0.8" fill="#fff" opacity="0.7"
              style={{ transformOrigin: '30px 11px', animation: 'kft-prop 0.15s linear infinite reverse' }}/>
            <rect x="9"  y="6" width="14" height="10" rx="2.5" fill="#fff"/>
            <rect x="11" y="9" width="10" height="4"  rx="1"   fill="#7a1631"/>
            <circle cx="13.5" cy="11" r="0.9" fill="#FFC477"/>
            <circle cx="18.5" cy="11" r="0.9" fill="#FFC477"/>
          </svg>
        </div>
      </div>
    </>
  );
};

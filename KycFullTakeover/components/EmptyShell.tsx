// Shown when the bound aiAnalyticsAudit field is missing, empty, or has an
// unsupported format. Renders the full HeaderStrip on top (so the RM can
// trigger an agent run from this state) and a friendly empty-state panel
// below explaining what's happening.
//
// Three sub-states for the empty case:
//   - Idle (no run yet)             → bored robot, sleepy eyes, gentle sway
//   - Running (agent is working)    → excited robot, eyes wide, bouncing,
//                                     sparkles around it
//   - Parse error                   → warning icon (separate branch from the
//                                     bored/excited illustrations)

import * as React from 'react';
import { colors, typography, spacing } from '../styles/tokens';
import { HeaderStrip } from './HeaderStrip';

interface EmptyShellProps {
  kycProfileId:   string;
  kycProfileName: string;
  webAPI:         ComponentFramework.WebApi;
  /** True when the field is just empty — friendlier copy. False when there's a parse/format error. */
  isEmpty:        boolean;
  /** Optional technical detail, shown small under the message. */
  detail?:        string;
}

const EXCITED_BOT_KEYFRAMES = `
@keyframes kft-xbot-bounce   { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
@keyframes kft-xbot-armL     { 0%,100% { transform: rotate(-8deg); } 50% { transform: rotate(8deg); } }
@keyframes kft-xbot-armR     { 0%,100% { transform: rotate(8deg); }  50% { transform: rotate(-8deg); } }
@keyframes kft-xbot-pupil    { 0%,30%,70%,100% { transform: translateX(0); } 45%,55% { transform: translateX(1.4px); } }
@keyframes kft-xbot-ant      { 0%,100% { fill:#FFC477; opacity:0.65; } 50% { fill:#fff; opacity:1; } }
@keyframes kft-xbot-mouth    { 0%,100% { transform: scale(1, 1); } 50% { transform: scale(1.15, 1.15); } }
@keyframes kft-xbot-sparkle1 { 0%, 100% { opacity:0; transform: scale(0.4) rotate(0); }
                               20% { opacity:1; transform: scale(1) rotate(60deg); }
                               40% { opacity:0; transform: scale(0.6) rotate(120deg); } }
@keyframes kft-xbot-sparkle2 { 0%, 30%, 100% { opacity:0; transform: scale(0.4) rotate(0); }
                               55% { opacity:1; transform: scale(1) rotate(-60deg); }
                               75% { opacity:0; transform: scale(0.6) rotate(-120deg); } }
@keyframes kft-xbot-sparkle3 { 0%, 50%, 100% { opacity:0; transform: scale(0.4) rotate(0); }
                               70% { opacity:1; transform: scale(1) rotate(45deg); }
                               90% { opacity:0; transform: scale(0.6) rotate(90deg); } }
@media (prefers-reduced-motion: reduce) {
  .kft-xbot-bounce, .kft-xbot-armL, .kft-xbot-armR,
  .kft-xbot-pupil,  .kft-xbot-ant,  .kft-xbot-mouth,
  .kft-xbot-sparkle1, .kft-xbot-sparkle2, .kft-xbot-sparkle3 { animation: none !important; }
}
`;

const Sparkle: React.FC<{ x: number; y: number; size: number; color: string; anim: string }> = ({ x, y, size, color, anim }) => (
  <g className={anim} style={{ transformOrigin: `${x}px ${y}px`, animation: `${anim} 2.4s ease-in-out infinite` }}>
    <path
      d={`M ${x} ${y - size} L ${x + size * 0.25} ${y - size * 0.25} L ${x + size} ${y} L ${x + size * 0.25} ${y + size * 0.25} L ${x} ${y + size} L ${x - size * 0.25} ${y + size * 0.25} L ${x - size} ${y} L ${x - size * 0.25} ${y - size * 0.25} Z`}
      fill={color}
    />
  </g>
);

const ExcitedBot: React.FC<{ accent: string }> = ({ accent }) => (
  <div
    aria-hidden="true"
    style={{
      width: 160, height: 170, margin: `0 auto ${spacing.md}px`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative',
    }}
  >
    <style>{EXCITED_BOT_KEYFRAMES}</style>
    <svg width="160" height="170" viewBox="0 0 160 170" fill="none">
      {/* Sparkles around the bot — stagger to feel alive */}
      <Sparkle x={30}  y={50}  size={6} color="#FFC477" anim="kft-xbot-sparkle1" />
      <Sparkle x={130} y={45}  size={5} color="#F04E68" anim="kft-xbot-sparkle2" />
      <Sparkle x={20}  y={110} size={5} color="#FFB1C0" anim="kft-xbot-sparkle3" />
      <Sparkle x={140} y={108} size={6} color="#FFC477" anim="kft-xbot-sparkle2" />
      <Sparkle x={80}  y={20}  size={4} color="#F04E68" anim="kft-xbot-sparkle3" />

      {/* Whole-bot wrapper — bouncing */}
      <g
        className="kft-xbot-bounce"
        style={{ animation: 'kft-xbot-bounce 0.85s cubic-bezier(0.45,0,0.55,1) infinite' }}
      >
        {/* Antenna */}
        <line x1="80" y1="30" x2="80" y2="48" stroke={accent} strokeWidth="2" strokeLinecap="round"/>
        <circle cx="80" cy="28" r="3.8" fill="#FFC477"
                className="kft-xbot-ant"
                style={{ animation: 'kft-xbot-ant 0.8s ease-in-out infinite' }}/>

        {/* Head */}
        <rect x="46" y="48" width="68" height="54" rx="10" fill="#fff"
              stroke={accent} strokeWidth="2.5"/>

        {/* Cheek blush — brighter than the bored variant */}
        <ellipse cx="56" cy="84" rx="4.5" ry="2.5" fill="#F04E68" opacity="0.55"/>
        <ellipse cx="104" cy="84" rx="4.5" ry="2.5" fill="#F04E68" opacity="0.55"/>

        {/* Eyes — wide open: outer white circle, dark pupil, tiny white highlight */}
        <g>
          <circle cx="66" cy="72" r="6" fill="#fff" stroke={accent} strokeWidth="1.8"/>
          <g className="kft-xbot-pupil" style={{ transformOrigin: '66px 72px', animation: 'kft-xbot-pupil 3.2s ease-in-out infinite' }}>
            <circle cx="66" cy="72" r="3" fill={accent}/>
            <circle cx="67.4" cy="70.6" r="1" fill="#fff"/>
          </g>
        </g>
        <g>
          <circle cx="94" cy="72" r="6" fill="#fff" stroke={accent} strokeWidth="1.8"/>
          <g className="kft-xbot-pupil" style={{ transformOrigin: '94px 72px', animation: 'kft-xbot-pupil 3.2s ease-in-out infinite' }}>
            <circle cx="94" cy="72" r="3" fill={accent}/>
            <circle cx="95.4" cy="70.6" r="1" fill="#fff"/>
          </g>
        </g>

        {/* Mouth — big open "smile" oval that pulses */}
        <g className="kft-xbot-mouth" style={{ transformOrigin: '80px 92px', animation: 'kft-xbot-mouth 1.1s ease-in-out infinite' }}>
          <path d="M 70 90 Q 80 99 90 90 Q 80 96 70 90 Z" fill={accent}/>
        </g>

        {/* Body */}
        <rect x="54" y="102" width="52" height="36" rx="6" fill="#fff"
              stroke={accent} strokeWidth="2.5"/>

        {/* Chest light — brighter coral */}
        <circle cx="80" cy="120" r="3.5" fill="#F04E68"/>

        {/* Arms RAISED — wave back and forth */}
        <g
          className="kft-xbot-armL"
          style={{ transformOrigin: '54px 108px', animation: 'kft-xbot-armL 0.7s ease-in-out infinite' }}
        >
          <line x1="54" y1="108" x2="36" y2="86" stroke={accent} strokeWidth="2.5" strokeLinecap="round"/>
          <circle cx="36" cy="84" r="4" fill="#fff" stroke={accent} strokeWidth="2"/>
        </g>
        <g
          className="kft-xbot-armR"
          style={{ transformOrigin: '106px 108px', animation: 'kft-xbot-armR 0.7s ease-in-out infinite' }}
        >
          <line x1="106" y1="108" x2="124" y2="86" stroke={accent} strokeWidth="2.5" strokeLinecap="round"/>
          <circle cx="124" cy="84" r="4" fill="#fff" stroke={accent} strokeWidth="2"/>
        </g>

        {/* Feet */}
        <rect x="58" y="138" width="14" height="6" rx="2" fill="#fff" stroke={accent} strokeWidth="2"/>
        <rect x="88" y="138" width="14" height="6" rx="2" fill="#fff" stroke={accent} strokeWidth="2"/>
      </g>

      {/* Ground shadow — pulses with bounce */}
      <ellipse cx="80" cy="156" rx="34" ry="3.5" fill={accent} opacity="0.12"/>
    </svg>
  </div>
);

const BORED_BOT_KEYFRAMES = `
@keyframes kft-bot-sway   { 0%,100% { transform: rotate(-1.5deg); } 50% { transform: rotate(1.5deg); } }
@keyframes kft-bot-blink  { 0%, 88%, 100% { transform: scaleY(1); } 92%, 96% { transform: scaleY(0.05); } }
@keyframes kft-bot-ant    { 0%,100% { fill:#FFC477; opacity:0.55; } 50% { fill:#fff; opacity:1; } }
@keyframes kft-bot-yawn   { 0%, 80%, 100% { transform: scale(1, 1); } 88%, 92% { transform: scale(1.15, 1.6); } }
@keyframes kft-bot-think1 { 0% { opacity:0; transform: translate(0, 0) scale(0.6); }
                            30% { opacity:0.85; }
                            70% { opacity:0.85; transform: translate(2px, -10px) scale(1); }
                            100% { opacity:0; transform: translate(2px, -16px) scale(1); } }
@keyframes kft-bot-think2 { 0%, 30% { opacity:0; transform: translate(0, 0) scale(0.5); }
                            55% { opacity:0.7; }
                            90% { opacity:0.7; transform: translate(4px, -14px) scale(0.9); }
                            100% { opacity:0; transform: translate(4px, -18px) scale(0.9); } }
@media (prefers-reduced-motion: reduce) {
  .kft-bot-sway, .kft-bot-blink, .kft-bot-ant,
  .kft-bot-yawn, .kft-bot-think1, .kft-bot-think2 { animation: none !important; }
}
`;

const BoredBot: React.FC<{ accent: string }> = ({ accent }) => (
  <div
    aria-hidden="true"
    style={{
      width: 160, height: 170, margin: `0 auto ${spacing.md}px`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative',
    }}
  >
    <style>{BORED_BOT_KEYFRAMES}</style>
    <svg width="160" height="170" viewBox="0 0 160 170" fill="none">
      {/* Thought bubble — drifts up and fades, looping. Two staggered dots. */}
      <circle cx="120" cy="40" r="3.5" fill={accent} opacity="0"
              className="kft-bot-think1"
              style={{ transformOrigin: '120px 40px', animation: 'kft-bot-think1 5s ease-in-out infinite' }}/>
      <circle cx="128" cy="32" r="2.5" fill={accent} opacity="0"
              className="kft-bot-think2"
              style={{ transformOrigin: '128px 32px', animation: 'kft-bot-think2 5s ease-in-out infinite' }}/>

      {/* Whole-bot wrapper for the sway */}
      <g
        className="kft-bot-sway"
        style={{ transformOrigin: '80px 150px', animation: 'kft-bot-sway 5s ease-in-out infinite' }}
      >
        {/* Antenna stem + tip */}
        <line x1="80" y1="30" x2="80" y2="48" stroke={accent} strokeWidth="2" strokeLinecap="round"/>
        <circle cx="80" cy="28" r="3.5" fill="#FFC477"
                className="kft-bot-ant"
                style={{ animation: 'kft-bot-ant 1.6s ease-in-out infinite' }}/>

        {/* Head — rounded rectangle */}
        <rect x="46" y="48" width="68" height="54" rx="10" fill="#fff"
              stroke={accent} strokeWidth="2.5"/>

        {/* Cheek blush — light coral */}
        <ellipse cx="56" cy="82" rx="3.5" ry="2" fill="#FFB1C0" opacity="0.7"/>
        <ellipse cx="104" cy="82" rx="3.5" ry="2" fill="#FFB1C0" opacity="0.7"/>

        {/* Eyes — sleepy/half-closed lines, blink shut periodically */}
        <g className="kft-bot-blink"
           style={{ transformOrigin: '80px 70px', animation: 'kft-bot-blink 4s ease-in-out infinite' }}>
          <line x1="60" y1="70" x2="72" y2="70" stroke={accent} strokeWidth="2.5" strokeLinecap="round"/>
          <line x1="88" y1="70" x2="100" y2="70" stroke={accent} strokeWidth="2.5" strokeLinecap="round"/>
        </g>

        {/* Mouth — small "o" that yawns occasionally */}
        <ellipse cx="80" cy="90" rx="3.5" ry="2.5" fill={accent}
                 className="kft-bot-yawn"
                 style={{ transformOrigin: '80px 90px', animation: 'kft-bot-yawn 6s ease-in-out infinite' }}/>

        {/* Body */}
        <rect x="54" y="102" width="52" height="36" rx="6" fill="#fff"
              stroke={accent} strokeWidth="2.5"/>

        {/* Chest light */}
        <circle cx="80" cy="120" r="3" fill="#FFC477"/>

        {/* Drooped arms hanging down */}
        <line x1="54" y1="110" x2="44" y2="142" stroke={accent} strokeWidth="2.5" strokeLinecap="round"/>
        <line x1="106" y1="110" x2="116" y2="142" stroke={accent} strokeWidth="2.5" strokeLinecap="round"/>
        <circle cx="44"  cy="144" r="4" fill="#fff" stroke={accent} strokeWidth="2"/>
        <circle cx="116" cy="144" r="4" fill="#fff" stroke={accent} strokeWidth="2"/>

        {/* Feet */}
        <rect x="58" y="138" width="14" height="6" rx="2" fill="#fff" stroke={accent} strokeWidth="2"/>
        <rect x="88" y="138" width="14" height="6" rx="2" fill="#fff" stroke={accent} strokeWidth="2"/>
      </g>

      {/* Ground shadow */}
      <ellipse cx="80" cy="155" rx="34" ry="3.5" fill={accent} opacity="0.12"/>
    </svg>
  </div>
);

export const EmptyShell: React.FC<EmptyShellProps> = ({
  kycProfileId, kycProfileName, webAPI, isEmpty, detail,
}) => {
  const [isFlying, setIsFlying] = React.useState(false);

  // Three sub-states of the empty case: idle, running-with-empty-payload, parse-error.
  const subState: 'idle' | 'running' | 'error' =
    !isEmpty           ? 'error'
    : isFlying         ? 'running'
    :                    'idle';

  const heading =
    subState === 'error'   ? 'AI payload could not be read'
    : subState === 'running' ? 'Working on it…'
    :                        'No agent run yet';

  const message =
    subState === 'error'
      ? 'The bound aiAnalyticsAudit field exists but its format is not supported by this control version.'
      : subState === 'running'
        ? 'The KYC AI agent is analysing this profile right now. The form will refresh automatically when the analysis is ready.'
        : 'Nothing to do here yet — click “Trigger agent run” above and I\'ll get to work on the KYC AI analysis for this profile.';

  const accent = subState === 'error' ? colors.warning   : colors.brand;
  const bg     = subState === 'error' ? colors.warningBg : colors.brandLight;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: colors.cardBg }}>
      <HeaderStrip
        profileName={kycProfileName}
        schemaVersion={undefined}
        lastRunAt={undefined}
        kycProfileId={kycProfileId}
        webAPI={webAPI}
        onFlyingChange={setIsFlying}
      />

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: spacing.xxl }}>
        <div
          role="status"
          aria-live="polite"
          style={{
            maxWidth:     560,
            width:        '100%',
            padding:      `${spacing.xl}px ${spacing.xl}px ${spacing.xxl}px`,
            textAlign:    'center',
            fontFamily:   typography.fontFamily,
            background:   bg,
            border:       `1px solid ${accent}`,
            borderRadius: 8,
          }}
        >
          {subState === 'running' ? (
            <ExcitedBot accent={accent} />
          ) : subState === 'idle' ? (
            <BoredBot accent={accent} />
          ) : (
            <div
              aria-hidden="true"
              style={{
                width: 56, height: 56, margin: `0 auto ${spacing.md}px`,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: `1px dashed ${accent}`,
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2"
                   strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <circle cx="12" cy="16" r="0.5" fill={accent}/>
              </svg>
            </div>
          )}

          <div style={{
            fontSize:     typography.fontSizeTitle,
            fontWeight:   typography.fontWeightBold,
            color:        accent,
            marginBottom: spacing.sm,
          }}>
            {heading}
          </div>
          <div style={{
            fontSize:     typography.fontSizeBody,
            color:        colors.textPrimary,
            marginBottom: detail ? spacing.sm : 0,
            lineHeight:   1.5,
          }}>
            {message}
          </div>
          {detail && (
            <div style={{
              fontSize: typography.fontSizeSmall,
              color:    colors.textMuted,
              fontStyle: 'italic',
              marginTop: spacing.xs,
            }}>
              {detail}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

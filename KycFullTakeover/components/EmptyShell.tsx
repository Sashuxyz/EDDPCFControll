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

// Focused-worker variant of the bot: same character as BoredBot for visual
// continuity, but transformed to "working at a laptop". Head tilted slightly
// forward, looking down at the screen; concentrated curved-line eyes (no
// cartoon circles); arms forward; thumbs tapping rhythmically; three
// thinking dots cycling on the laptop screen. No sparkles, no wave, no
// wide grin — reads as focus, not cheering.
const FOCUSED_BOT_KEYFRAMES = `
@keyframes kft-fbot-tap-l   { 0%,40%,100% { transform: translateY(0); } 20% { transform: translateY(-1.5px); } }
@keyframes kft-fbot-tap-r   { 0%,40%,100% { transform: translateY(0); } 20% { transform: translateY(-1.5px); } }
@keyframes kft-fbot-ant     { 0%,100% { fill:#FFC477; opacity:0.6; } 50% { fill:#fff; opacity:1; } }
@keyframes kft-fbot-screen  { 0%,100% { opacity:0.45; } 50% { opacity:1; } }
@keyframes kft-fbot-dot1    { 0%,80%,100% { opacity:0.3; } 20% { opacity:1; } }
@keyframes kft-fbot-dot2    { 0%,80%,100% { opacity:0.3; } 35% { opacity:1; } }
@keyframes kft-fbot-dot3    { 0%,80%,100% { opacity:0.3; } 50% { opacity:1; } }
@media (prefers-reduced-motion: reduce) {
  .kft-fbot-tap-l, .kft-fbot-tap-r, .kft-fbot-ant,
  .kft-fbot-screen, .kft-fbot-dot1, .kft-fbot-dot2, .kft-fbot-dot3 { animation: none !important; }
}
`;

const FocusedBot: React.FC<{ accent: string }> = ({ accent }) => (
  <div
    aria-hidden="true"
    style={{
      width: 160, height: 170, margin: `0 auto ${spacing.md}px`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative',
    }}
  >
    <style>{FOCUSED_BOT_KEYFRAMES}</style>
    <svg width="160" height="170" viewBox="0 0 160 170" fill="none">
      {/* Antenna */}
      <line x1="80" y1="28" x2="80" y2="44" stroke={accent} strokeWidth="2" strokeLinecap="round"/>
      <circle cx="80" cy="26" r="3.5" fill="#FFC477"
              style={{ animation: 'kft-fbot-ant 1.2s ease-in-out infinite' }}/>

      {/* Head — tilted slightly forward (looking down at the laptop). The
          rotate around the head's bottom-centre keeps the antenna stem
          attached at the top. */}
      <g transform="rotate(8 80 100)">
        <rect x="50" y="48" width="60" height="48" rx="9" fill="#fff"
              stroke={accent} strokeWidth="2.4"/>
        {/* Concentrated eyes — short curved lines that lean slightly downward */}
        <path d="M62 72 q4 1.5 8 0" stroke={accent} strokeWidth="2.4" fill="none" strokeLinecap="round"/>
        <path d="M90 72 q4 1.5 8 0" stroke={accent} strokeWidth="2.4" fill="none" strokeLinecap="round"/>
        {/* Subtle mouth — flat focused line */}
        <line x1="74" y1="86" x2="86" y2="86" stroke={accent} strokeWidth="1.8" strokeLinecap="round"/>
      </g>

      {/* Body */}
      <rect x="56" y="100" width="48" height="32" rx="6" fill="#fff"
            stroke={accent} strokeWidth="2.4"/>

      {/* Arms forward — hands hovering over the laptop, tapping in rhythm.
          Left and right slightly offset so the tap reads as alternating. */}
      <g style={{ animation: 'kft-fbot-tap-l 0.55s ease-in-out infinite' }}>
        <line x1="64" y1="110" x2="56" y2="128" stroke={accent} strokeWidth="2.4" strokeLinecap="round"/>
        <circle cx="56" cy="130" r="3.2" fill="#fff" stroke={accent} strokeWidth="1.8"/>
      </g>
      <g style={{ animation: 'kft-fbot-tap-r 0.55s ease-in-out 0.27s infinite' }}>
        <line x1="96" y1="110" x2="104" y2="128" stroke={accent} strokeWidth="2.4" strokeLinecap="round"/>
        <circle cx="104" cy="130" r="3.2" fill="#fff" stroke={accent} strokeWidth="1.8"/>
      </g>

      {/* Laptop */}
      <g>
        {/* Screen */}
        <rect x="50" y="120" width="60" height="16" rx="2.5" fill="#fff"
              stroke={accent} strokeWidth="2"/>
        {/* Bezel */}
        <path d="M46 136 L114 136 L118 148 L42 148 Z" fill="#fff"
              stroke={accent} strokeWidth="2"/>
        {/* Screen contents — three cycling thinking dots, breathing intensity */}
        <g style={{ animation: 'kft-fbot-screen 1.6s ease-in-out infinite' }}>
          <circle cx="68" cy="128" r="2" fill={accent}
                  style={{ animation: 'kft-fbot-dot1 1.2s linear infinite' }}/>
          <circle cx="80" cy="128" r="2" fill={accent}
                  style={{ animation: 'kft-fbot-dot2 1.2s linear infinite' }}/>
          <circle cx="92" cy="128" r="2" fill={accent}
                  style={{ animation: 'kft-fbot-dot3 1.2s linear infinite' }}/>
        </g>
      </g>

      {/* Ground shadow */}
      <ellipse cx="80" cy="156" rx="38" ry="3" fill={accent} opacity="0.1"/>
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
    : subState === 'running' ? 'Analysing the profile…'
    :                        'No agent run yet';

  const message =
    subState === 'error'
      ? 'The bound aiAnalyticsAudit field exists but its format is not supported by this control version.'
      : subState === 'running'
        ? 'The KYC AI agent is reviewing the case file. The form will refresh when the analysis is ready.'
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
            <FocusedBot accent={accent} />
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

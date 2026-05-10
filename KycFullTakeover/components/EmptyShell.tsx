// Shown when the bound aiAnalyticsAudit field is missing, empty, or has an
// unsupported format. Renders the full HeaderStrip on top (so the RM can
// trigger an agent run from this state) and a friendly empty-state panel
// below explaining what's happening.

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

export const EmptyShell: React.FC<EmptyShellProps> = ({
  kycProfileId, kycProfileName, webAPI, isEmpty, detail,
}) => {
  const heading = isEmpty
    ? 'No agent run yet'
    : 'AI payload could not be read';
  const message = isEmpty
    ? 'Click “Trigger agent run” above to generate the KYC AI analysis for this profile.'
    : 'The bound aiAnalyticsAudit field exists but its format is not supported by this control version.';
  const accent  = isEmpty ? colors.brand   : colors.warning;
  const bg      = isEmpty ? colors.brandLight : colors.warningBg;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: colors.cardBg }}>
      <HeaderStrip
        profileName={kycProfileName}
        schemaVersion={undefined}
        lastRunAt={undefined}
        kycProfileId={kycProfileId}
        webAPI={webAPI}
      />

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: spacing.xxl }}>
        <div
          role="status"
          aria-live="polite"
          style={{
            maxWidth:     520,
            width:        '100%',
            padding:      `${spacing.xl}px ${spacing.xl}px`,
            textAlign:    'center',
            fontFamily:   typography.fontFamily,
            background:   bg,
            border:       `1px solid ${accent}`,
            borderRadius: 8,
          }}
        >
          {/* Decorative empty-state icon */}
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
              {isEmpty ? (
                <>
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                </>
              ) : (
                <>
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <circle cx="12" cy="16" r="0.5" fill={accent}/>
                </>
              )}
            </svg>
          </div>

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

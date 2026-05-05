// Read-only display of the proposed email + a "Create E-mail" button that
// opens a pre-populated email activity form via Xrm.Navigation.openForm.
// The actual openForm wiring is in utils/emailActivity.ts.

import * as React from 'react';
import { SectionFrame } from '../SectionFrame';
import { ProposedEmail } from '../../types';
import { colors, typography, spacing } from '../../styles/tokens';

interface ProposedEmailSectionProps {
  email:        ProposedEmail;
  onCreateEmail: () => void;
}

export const ProposedEmailSection: React.FC<ProposedEmailSectionProps> = ({ email, onCreateEmail }) => (
  <SectionFrame title="Proposed Email" state="read-only">
    <div style={{ display: 'grid', gap: spacing.sm, fontFamily: typography.fontFamily }}>
      <div>
        <div style={{ fontSize: typography.fontSizeLabel, color: colors.textSecondary, marginBottom: 2 }}>To</div>
        <div style={{ fontSize: typography.fontSizeBody, color: colors.textPrimary }}>
          {email.to.map((r) => r.name).join(', ') || '—'}
        </div>
      </div>
      <div>
        <div style={{ fontSize: typography.fontSizeLabel, color: colors.textSecondary, marginBottom: 2 }}>Subject</div>
        <div style={{ fontSize: typography.fontSizeBody, color: colors.textPrimary }}>{email.subject}</div>
      </div>
      <div>
        <div style={{ fontSize: typography.fontSizeLabel, color: colors.textSecondary, marginBottom: 2 }}>Body</div>
        <pre style={{
          fontSize:    typography.fontSizeBody,
          fontFamily:  typography.fontFamily,
          color:       colors.textPrimary,
          background:  colors.whisperBg,
          padding:     spacing.md,
          borderRadius: 3,
          whiteSpace:  'pre-wrap',
          margin:      0,
        }}>{email.body}</pre>
      </div>
      <div style={{ marginTop: spacing.sm }}>
        <button
          type="button"
          onClick={onCreateEmail}
          style={{
            fontSize:    typography.fontSizeSmall,
            fontWeight:  typography.fontWeightBold,
            color:       colors.textOnBrand,
            background:  colors.brand,
            border:      'none',
            borderRadius: 4,
            padding:     `6px ${spacing.md}px`,
            cursor:      'pointer',
            fontFamily:  typography.fontFamily,
          }}
        >Create E-mail</button>
      </div>
    </div>
  </SectionFrame>
);

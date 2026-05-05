// Renders an n/a-like card for sections that exist in the TOC but aren't
// implemented yet (M3-M6). Lets v0.1.0 ship a complete TOC without crashing
// on missing section components.

import * as React from 'react';
import { SectionFrame } from '../SectionFrame';
import { colors, typography } from '../../styles/tokens';

interface PlaceholderSectionProps {
  title:      string;
  milestone:  string;   // "M3", "M4", etc.
}

export const PlaceholderSection: React.FC<PlaceholderSectionProps> = ({ title, milestone }) => (
  <SectionFrame title={title} state="read-only">
    <div style={{
      padding:    24,
      textAlign:  'center',
      color:      colors.textMuted,
      fontFamily: typography.fontFamily,
      fontSize:   typography.fontSizeBody,
      fontStyle:  'italic',
    }}>
      Coming in milestone {milestone} — section not yet implemented.
    </div>
  </SectionFrame>
);

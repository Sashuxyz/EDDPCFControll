// Generic editor for any section whose payload is a single string field.
// Drives 5 sections: Professional Experience, Financial Situation Narrative,
// Digital Asset Holdings Narrative, Transactional Behaviour, Additional
// Comments. Reads payload value, exposes a textarea, calls onTakeover when
// the user clicks Take over (parent handles the actual write).

import * as React from 'react';
import { SectionFrame } from '../SectionFrame';
import { SectionState } from '../../types';
import { colors, typography, spacing, inputStyle } from '../../styles/tokens';

interface NarrativeSectionProps {
  title:           string;
  fieldLabel:      string;       // shown above the textarea
  state:           SectionState;
  value:           string;       // current editable value
  onChange:        (next: string) => void;
  onTakeover:      () => void;
  lastRunAt?:      string;
  errorMsg?:       string;
}

export const NarrativeSection: React.FC<NarrativeSectionProps> = ({
  title, fieldLabel, state, value, onChange, onTakeover, lastRunAt, errorMsg,
}) => {
  const [focused, setFocused] = React.useState(false);
  return (
    <SectionFrame
      title={title}
      state={state}
      lastRunAt={lastRunAt}
      errorMsg={errorMsg}
      onTakeover={onTakeover}
    >
      <label style={{
        display:    'block',
        fontSize:   typography.fontSizeLabel,
        color:      colors.textSecondary,
        marginBottom: spacing.xs,
      }}>{fieldLabel}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={()  => setFocused(false)}
        rows={6}
        style={{
          ...inputStyle(focused),
          resize:    'vertical',
          minHeight: 120,
        }}
      />
    </SectionFrame>
  );
};

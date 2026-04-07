import * as React from 'react';
import { tooltipStyles } from '../styles/tokens';

interface TooltipProps {
  name: string;
  fields: Array<{ label: string; value: string }>;
  style: React.CSSProperties;
}

export const Tooltip: React.FC<TooltipProps> = ({ name, fields, style }) => {
  return (
    <div style={{ ...tooltipStyles.tooltip, ...style }}>
      <div style={tooltipStyles.tooltipName}>{name}</div>
      {fields.map((f) => (
        <div key={f.label} style={tooltipStyles.tooltipField}>
          <span style={{ fontWeight: 600 }}>{f.label}:</span> {f.value}
        </div>
      ))}
    </div>
  );
};

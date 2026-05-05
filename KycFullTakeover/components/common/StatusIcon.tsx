import * as React from 'react';
import { SectionState } from '../../types';
import { colors } from '../../styles/tokens';

interface StatusIconProps {
  state: SectionState;
  size?: number;
}

const config: Record<SectionState, { fill: string; ring: string; halo?: boolean; split?: boolean }> = {
  'na':              { fill: 'transparent',     ring: colors.textMuted },
  'pending':         { fill: colors.textMuted,  ring: colors.textMuted },
  'edited':          { fill: colors.brand,      ring: colors.brand,      halo: true },
  'done':            { fill: colors.success,    ring: colors.success },
  'partial-failed':  { fill: colors.success,    ring: colors.error,      split: true },
  'read-only':       { fill: 'transparent',     ring: colors.textMuted },
};

export const StatusIcon: React.FC<StatusIconProps> = ({ state, size = 14 }) => {
  const c = config[state];
  const r = size / 2;

  if (c.split) {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-label={state}>
        <path d={`M ${r} 0 A ${r} ${r} 0 0 1 ${r} ${size} Z`} fill={colors.success} />
        <path d={`M ${r} 0 A ${r} ${r} 0 0 0 ${r} ${size} Z`} fill={colors.error} />
        <circle cx={r} cy={r} r={r - 1} fill="none" stroke={c.ring} strokeWidth={1} />
      </svg>
    );
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-label={state}>
      {c.halo && <circle cx={r} cy={r} r={r} fill={c.fill} opacity={0.25} />}
      <circle cx={r} cy={r} r={r - 2} fill={c.fill} stroke={c.ring} strokeWidth={1.5} />
    </svg>
  );
};

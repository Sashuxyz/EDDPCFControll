import * as React from 'react';
import { pillStyles } from '../styles/tokens';

interface PillButtonProps {
  label: string;
  isSelected: boolean;
  color: string;
  disabled: boolean;
  onClick: () => void;
}

export const PillButton: React.FC<PillButtonProps> = ({
  label,
  isSelected,
  color,
  disabled,
  onClick,
}) => {
  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick();
      }
    },
    [disabled, onClick]
  );

  const classNames = ['cpb-pill'];
  if (isSelected) classNames.push('cpb-pill--selected');
  if (disabled) classNames.push('cpb-pill--disabled');

  let style: React.CSSProperties;
  if (isSelected && disabled) {
    style = {
      ...pillStyles.base,
      background: color,
      color: '#fff',
      border: `1px solid ${color}`,
      opacity: 0.6,
      cursor: 'not-allowed',
    };
  } else if (isSelected) {
    style = {
      ...pillStyles.base,
      background: color,
      color: '#fff',
      border: `1px solid ${color}`,
    };
  } else if (disabled) {
    style = { ...pillStyles.base, ...pillStyles.disabled };
  } else {
    style = { ...pillStyles.base };
  }

  return (
    <div
      className={classNames.join(' ')}
      role="button"
      aria-pressed={isSelected}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      onClick={disabled ? undefined : onClick}
      onKeyDown={handleKeyDown}
      style={style}
    >
      {label}
    </div>
  );
};

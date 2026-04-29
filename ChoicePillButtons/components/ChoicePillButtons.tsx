import * as React from 'react';
import { PillButton } from './PillButton';
import { colorFor } from '../utils/colorMap';
import { containerStyles, INJECTED_CSS } from '../styles/tokens';
import { OptionItem } from '../types';

interface ChoicePillButtonsProps {
  options: OptionItem[];
  selectedValue: number | null;
  colorMap: Map<number, string>;
  disabled: boolean;
  onSelect: (value: number) => void;
}

let cssInjected = false;
function injectCss(): void {
  if (cssInjected) return;
  const style = document.createElement('style');
  style.textContent = INJECTED_CSS;
  document.head.appendChild(style);
  cssInjected = true;
}

const MAX_OPTIONS = 5;

export const ChoicePillButtonsRoot: React.FC<ChoicePillButtonsProps> = ({
  options,
  selectedValue,
  colorMap,
  disabled,
  onSelect,
}) => {
  React.useEffect(() => { injectCss(); }, []);

  const visibleOptions = options.slice(0, MAX_OPTIONS);

  return (
    <div style={containerStyles.root}>
      {visibleOptions.map((opt) => (
        <PillButton
          key={opt.Value}
          label={opt.Label}
          isSelected={selectedValue === opt.Value}
          color={colorFor(opt.Value, colorMap)}
          disabled={disabled}
          onClick={() => onSelect(opt.Value)}
        />
      ))}
    </div>
  );
};

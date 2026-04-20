import * as React from 'react';
import { triggerStyles } from '../styles/tokens';
import { icons } from '../types';

type TriggerState = 'idle' | 'waiting' | 'timeout';

interface TriggerDraftProps {
  disabled: boolean;
  onTrigger: () => void;
}

const SPINNER_PATH = 'M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83';

export const TriggerDraft: React.FC<TriggerDraftProps> = ({ disabled, onTrigger }) => {
  const [state, setState] = React.useState<TriggerState>('idle');
  const [hovered, setHovered] = React.useState(false);

  const handleClick = React.useCallback(() => {
    if (disabled || state !== 'idle') return;
    setState('waiting');
    onTrigger();
  }, [disabled, state, onTrigger]);

  // Timeout after 3 minutes
  React.useEffect(() => {
    if (state !== 'waiting') return;
    const timer = setTimeout(() => setState('timeout'), 180_000);
    return () => clearTimeout(timer);
  }, [state]);

  if (state === 'waiting') {
    return (
      <div style={triggerStyles.root}>
        <svg width={36} height={36} viewBox="0 0 24 24" fill="none" stroke="#0078D4" strokeWidth={1.5} strokeLinecap="round" style={{ ...triggerStyles.icon, animation: 'spin 1.5s linear infinite' }}>
          <path d={SPINNER_PATH} />
        </svg>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={triggerStyles.title}>Generating AI KYC Draft...</div>
        <div style={triggerStyles.subtitle}>This usually takes 30 to 120 seconds. The results will appear here automatically.</div>
      </div>
    );
  }

  if (state === 'timeout') {
    return (
      <div style={triggerStyles.root}>
        <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="#8A7400" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" style={triggerStyles.icon}>
          <path d={icons.warning} />
        </svg>
        <div style={triggerStyles.title}>Draft generation is taking longer than expected</div>
        <div style={triggerStyles.subtitle}>Please refresh the form to check if results are available.</div>
      </div>
    );
  }

  return (
    <div style={triggerStyles.root}>
      <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="#A19F9D" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" style={triggerStyles.icon}>
        <path d={icons.grid} />
      </svg>
      <div style={triggerStyles.title}>No AI draft available yet</div>
      <div style={triggerStyles.subtitle}>Start the AI research agent to generate a KYC draft for review.</div>
      <button
        style={hovered && !disabled ? triggerStyles.buttonHover : triggerStyles.button}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={handleClick}
        disabled={disabled}
      >
        Prepare AI KYC Draft
      </button>
    </div>
  );
};

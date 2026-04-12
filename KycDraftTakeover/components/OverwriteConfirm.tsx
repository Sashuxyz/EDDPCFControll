import * as React from 'react';
import { confirmStyles } from '../styles/tokens';

interface OverwriteConfirmProps {
  fields: string[];
  onConfirm: () => void;
  onCancel: () => void;
}

export const OverwriteConfirm: React.FC<OverwriteConfirmProps> = ({ fields, onConfirm, onCancel }) => {
  const message = fields.length === 1
    ? `The field "${fields[0]}" already has content. Taking over will replace it.`
    : `The following fields already have content and will be replaced: ${fields.join(', ')}.`;

  return (
    <div style={confirmStyles.panel}>
      <div style={confirmStyles.text}>{message}</div>
      <div style={confirmStyles.buttonRow}>
        <button type="button" style={confirmStyles.cancelBtn} onClick={onCancel}>Cancel</button>
        <button type="button" style={confirmStyles.overwriteBtn} onClick={onConfirm}>
          {fields.length === 1 ? 'Overwrite' : `Overwrite all ${fields.length} fields`}
        </button>
      </div>
    </div>
  );
};

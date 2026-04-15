// NpOnboardingChecklist/components/IdDocumentSection.tsx
import * as React from 'react';
import { IdDocument } from '../types';
import { DisplayItem } from './DisplayItem';

interface Props {
  idDocument: IdDocument | null;
  clientSegment: string;
}

export function IdDocumentSection({ idDocument, clientSegment }: Props): React.ReactElement {
  return (
    <div>
      <div style={{ padding: '10px 12px 12px' }}>
        {!idDocument ? (
          <div style={{ fontSize: 13, color: '#a19f9d', padding: '4px 0' }}>No ID document linked to this onboarding.</div>
        ) : (
          <div style={cardStyle}>
            <div style={cardHdrStyle}>Identification Document</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', padding: '8px 12px', gap: '8px 16px' }}>
              {([
                ['Document type',    idDocument.documentType],
                ['Document number',  idDocument.documentNumber],
                ['Country of issue', idDocument.countryOfIssue],
                ['Place of issue',   idDocument.placeOfIssue],
                ['Date of issue',    idDocument.issueDate],
                ['Expiration date',  idDocument.expirationDate],
              ] as [string, string][]).map(([lbl, val]) => (
                <div key={lbl}>
                  <div style={{ fontSize: 10, color: '#a19f9d', marginBottom: 1 }}>{lbl}</div>
                  <div style={{ fontSize: 12, color: '#201f1e', fontWeight: 500 }}>{val || '\u2014'}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <div style={{ margin: '0 12px 12px', border: '1px solid #edebe9', borderRadius: 2 }}>
        <DisplayItem label="Client Segment" value={clientSegment} showLock />
      </div>
    </div>
  );
}

const cardStyle: React.CSSProperties = { border: '1px solid #edebe9', borderRadius: 2 };
const cardHdrStyle: React.CSSProperties = {
  background: '#f3f2f1', padding: '6px 12px', fontSize: 12,
  fontWeight: 600, color: '#323130', borderBottom: '1px solid #edebe9',
};

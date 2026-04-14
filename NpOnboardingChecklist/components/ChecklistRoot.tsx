// NpOnboardingChecklist/components/ChecklistRoot.tsx
import * as React from 'react';
import {
  CheckState, AnswerValue, MismatchData, ManualNotDoneData,
  MANUAL_KEYS, ITEM_LABELS, SEC1_KEYS, SEC3_KEYS, SEC4_FIXED_KEYS, SEC5_KEYS,
  taxKey, SectionStatus,
} from '../types';
import { serializeCheckResults } from '../utils';
import { StickyHeader } from './StickyHeader';
import { SectionCard } from './SectionCard';
import { CheckItem } from './CheckItem';
import { ManualCheckItem } from './ManualCheckItem';
import { DisplayItem } from './DisplayItem';
import { IdDocumentSection } from './IdDocumentSection';
import { TaxRecordSection } from './TaxRecordSection';
import { SubmitBar } from './SubmitBar';

interface Props {
  initialState: CheckState;
  isReadOnly: boolean;
  userName: string;
  onOutputChanged: (json: string) => void;
}

interface Stats {
  total: number;
  done: number;
  pending: number;
  unresolvedKeys: string[];
  blockedKeys: string[];
  canSubmit: boolean;
}

function computeStats(s: CheckState): Stats {
  let total = 0, done = 0, pending = 0;
  const unresolvedKeys: string[] = [];
  const blockedKeys: string[] = [];

  const allCheckKeys: string[] = [
    ...SEC1_KEYS,
    ...SEC3_KEYS,
    ...s.taxRecords.map((_, i) => taxKey(i)),
    ...SEC4_FIXED_KEYS,
    ...SEC5_KEYS,
  ];

  for (const key of allCheckKeys) {
    total++;
    const ans = s.answers[key] ?? null;
    const mis = s.mismatches[key];
    if (ans === 'yes') {
      done++;
    } else if (ans === 'no' && !MANUAL_KEYS.has(key) && mis?.resolved) {
      done++;
    } else if (ans === 'no' && !MANUAL_KEYS.has(key)) {
      unresolvedKeys.push(key);
    } else if (ans === 'no' && MANUAL_KEYS.has(key)) {
      blockedKeys.push(key);
    } else {
      pending++;
    }
  }

  return {
    total, done, pending, unresolvedKeys, blockedKeys,
    canSubmit: pending === 0 && unresolvedKeys.length === 0 && blockedKeys.length === 0,
  };
}

export function ChecklistRoot({ initialState, isReadOnly, userName, onOutputChanged }: Props): React.ReactElement {
  const [state, setState] = React.useState<CheckState>(initialState);
  const itemRefs = React.useRef<Record<string, HTMLDivElement | null>>({});
  const prevStateRef = React.useRef(state);

  // Serialize and notify whenever state changes (not during render)
  React.useEffect(() => {
    if (prevStateRef.current === state) return;
    prevStateRef.current = state;
    if (state.loading) return;
    const stats = computeStats(state);
    const json = serializeCheckResults(state, {
      total: stats.total,
      completed: stats.done,
      mismatches: stats.unresolvedKeys.length,
      blocked: stats.blockedKeys.length,
      completedAt: state.completedAt ?? undefined,
      completedBy: state.completedBy ?? undefined,
    });
    onOutputChanged(json);
  }, [state, onOutputChanged]);

  const handleAnswer = React.useCallback((key: string, value: 'yes' | 'no'): void => {
    setState(prev => {
      const answers = { ...prev.answers, [key]: value as AnswerValue };
      const mismatches = { ...prev.mismatches };
      const manualNotDone = { ...prev.manualNotDone };
      if (value === 'yes') {
        delete mismatches[key];
        delete manualNotDone[key];
      }
      return { ...prev, answers, mismatches, manualNotDone };
    });
  }, []);

  const handleMismatchChange = React.useCallback((key: string, data: MismatchData): void => {
    setState(prev => ({ ...prev, mismatches: { ...prev.mismatches, [key]: data } }));
  }, []);

  const handleNotDoneChange = React.useCallback((key: string, data: ManualNotDoneData): void => {
    setState(prev => ({ ...prev, manualNotDone: { ...prev.manualNotDone, [key]: data } }));
  }, []);

  const handleComplete = React.useCallback((): void => {
    setState(prev => {
      const stats = computeStats(prev);
      if (!stats.canSubmit) return prev;
      return { ...prev, completedAt: new Date().toISOString(), completedBy: userName };
    });
  }, [userName]);

  const scrollToItem = React.useCallback((key: string): void => {
    const el = itemRefs.current[key];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  function itemRef(key: string): (el: HTMLDivElement | null) => void {
    return el => { itemRefs.current[key] = el; };
  }

  function sectionSummary(keys: readonly string[], taxCount = 0): { status: SectionStatus; text: string } {
    let conf = 0, mis = 0, blk = 0, total = 0;
    const effectiveKeys = [
      ...keys,
      ...(taxCount > 0 ? Array.from({ length: taxCount }, (_, i) => taxKey(i)) : []),
    ];
    for (const key of effectiveKeys) {
      total++;
      const ans = state.answers[key] ?? null;
      const mismatch = state.mismatches[key];
      if (ans === 'yes') conf++;
      else if (ans === 'no' && !MANUAL_KEYS.has(key) && mismatch?.resolved) conf++;
      else if (ans === 'no' && !MANUAL_KEYS.has(key)) mis++;
      else if (ans === 'no' && MANUAL_KEYS.has(key)) blk++;
    }
    if (conf === total && total > 0) return { status: 'done', text: 'All confirmed' };
    if (blk > 0 && mis === 0) return { status: 'blocked', text: `${blk} blocked · ${conf}/${total}` };
    if (mis > 0) return { status: 'mismatch', text: `${blk > 0 ? blk + ' blocked, ' : ''}${mis} mismatch · ${conf}/${total}` };
    return { status: 'normal', text: `${conf} / ${total} checked` };
  }

  if (state.loading) {
    return <div style={{ padding: 24, fontSize: 13, color: '#605e5c' }}>Loading checklist data…</div>;
  }

  if (state.loadError) {
    return (
      <div style={{ padding: 24, fontSize: 13, color: '#605e5c' }}>
        Failed to load data: {state.loadError}
      </div>
    );
  }

  const stats = computeStats(state);
  const s1 = sectionSummary(SEC1_KEYS);
  const s3 = sectionSummary(SEC3_KEYS);
  const s4 = sectionSummary(SEC4_FIXED_KEYS, state.taxRecords.length);
  const s5 = sectionSummary(SEC5_KEYS);
  const { crmValues } = state;

  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", background: '#faf9f8', color: '#201f1e', fontSize: 14, lineHeight: 1.4, paddingBottom: 72 }}>

      <StickyHeader
        done={stats.done}
        total={stats.total}
        unresolvedKeys={stats.unresolvedKeys}
        blockedKeys={stats.blockedKeys}
        onScrollTo={scrollToItem}
      />

      <div style={{ background: '#f3f2f1', borderBottom: '1px solid #edebe9', padding: '8px 16px', fontSize: 12, color: '#605e5c', lineHeight: 1.5 }}>
        <strong style={{ color: '#201f1e' }}>Yes</strong> — data matches &nbsp;|&nbsp;
        <strong style={{ color: '#201f1e' }}>No</strong> — data does not match — document and resolve before completing
      </div>

      {/* ── Section 1: Client properties ── */}
      <SectionCard title="Client properties check" status={s1.status} summaryText={s1.text} defaultCollapsed={false}>
        <DisplayItem label="Nationalities" value={crmValues.nationalities} showLock />
        {(['dob', 'rm', 'risk', 'pep'] as const).map(key => (
          <div key={key} ref={itemRef(key)}>
            <CheckItem
              itemKey={key}
              label={ITEM_LABELS[key]}
              crmValue={
                key === 'dob'  ? crmValues.dateOfBirth :
                key === 'rm'   ? crmValues.relationshipManager :
                key === 'risk' ? crmValues.riskLevel :
                                 crmValues.pepStatus
              }
              answer={state.answers[key] ?? null}
              mismatch={state.mismatches[key]}
              isReadOnly={isReadOnly}
              onAnswer={handleAnswer}
              onMismatchChange={handleMismatchChange}
            />
          </div>
        ))}
        <div ref={itemRef('active')}>
          <ManualCheckItem
            itemKey="active"
            label={ITEM_LABELS['active']}
            answer={state.answers['active'] ?? null}
            notDone={state.manualNotDone['active']}
            isReadOnly={isReadOnly}
            onAnswer={handleAnswer}
            onNotDoneChange={handleNotDoneChange}
          />
        </div>
      </SectionCard>

      {/* ── Section 2: ID data (display only) ── */}
      <SectionCard title="ID data" status="normal" summaryText="Display only" defaultCollapsed>
        <IdDocumentSection idDocument={state.idDocument} clientSegment={crmValues.clientSegment} />
      </SectionCard>

      {/* ── Section 3: Finnova accounts ── */}
      <SectionCard title="Finnova accounts" status={s3.status} summaryText={s3.text}>
        <DisplayItem label="Digital Asset Vault Currency" value={crmValues.referenceCurrency} />
        <div ref={itemRef('currency')}>
          <CheckItem
            itemKey="currency"
            label={ITEM_LABELS['currency']}
            crmValue={crmValues.referenceCurrency}
            answer={state.answers['currency'] ?? null}
            mismatch={state.mismatches['currency']}
            isReadOnly={isReadOnly}
            onAnswer={handleAnswer}
            onMismatchChange={handleMismatchChange}
          />
        </div>
        {(['pms', 'payment', 'block', 'archive'] as const).map(key => (
          <div key={key} ref={itemRef(key)}>
            <ManualCheckItem
              itemKey={key}
              label={ITEM_LABELS[key]}
              answer={state.answers[key] ?? null}
              notDone={state.manualNotDone[key]}
              isReadOnly={isReadOnly}
              onAnswer={handleAnswer}
              onNotDoneChange={handleNotDoneChange}
            />
          </div>
        ))}
        <div ref={itemRef('special')}>
          <CheckItem
            itemKey="special"
            label={ITEM_LABELS['special']}
            crmValue={crmValues.specialConditions}
            answer={state.answers['special'] ?? null}
            mismatch={state.mismatches['special']}
            isReadOnly={isReadOnly}
            onAnswer={handleAnswer}
            onMismatchChange={handleMismatchChange}
          />
        </div>
      </SectionCard>

      {/* ── Section 4: Finnova: Tax information ── */}
      <SectionCard title="Finnova: Tax information" status={s4.status} summaryText={s4.text}>
        <TaxRecordSection
          taxRecords={state.taxRecords}
          answers={state.answers}
          mismatches={state.mismatches}
          isReadOnly={isReadOnly}
          onAnswer={handleAnswer}
          onMismatchChange={handleMismatchChange}
        />
        <div style={grpHdrStyle}>Additional tax checks</div>
        <div ref={itemRef('chtax')}>
          <ManualCheckItem
            itemKey="chtax"
            label={ITEM_LABELS['chtax']}
            answer={state.answers['chtax'] ?? null}
            notDone={state.manualNotDone['chtax']}
            isReadOnly={isReadOnly}
            onAnswer={handleAnswer}
            onNotDoneChange={handleNotDoneChange}
          />
        </div>
        <div ref={itemRef('dispatch')}>
          <ManualCheckItem
            itemKey="dispatch"
            label={ITEM_LABELS['dispatch']}
            answer={state.answers['dispatch'] ?? null}
            notDone={state.manualNotDone['dispatch']}
            isReadOnly={isReadOnly}
            onAnswer={handleAnswer}
            onNotDoneChange={handleNotDoneChange}
          />
        </div>
        <div ref={itemRef('indicia')}>
          <CheckItem
            itemKey="indicia"
            label={ITEM_LABELS['indicia']}
            crmValue={crmValues.aiaReporting}
            answer={state.answers['indicia'] ?? null}
            mismatch={state.mismatches['indicia']}
            isReadOnly={isReadOnly}
            onAnswer={handleAnswer}
            onMismatchChange={handleMismatchChange}
          />
        </div>
        <div ref={itemRef('oms')}>
          <ManualCheckItem
            itemKey="oms"
            label={ITEM_LABELS['oms']}
            answer={state.answers['oms'] ?? null}
            notDone={state.manualNotDone['oms']}
            isReadOnly={isReadOnly}
            onAnswer={handleAnswer}
            onNotDoneChange={handleNotDoneChange}
          />
        </div>
      </SectionCard>

      {/* ── Section 5: Additional actions ── */}
      <SectionCard title="Additional actions" status={s5.status} summaryText={s5.text}>
        {(SEC5_KEYS as readonly string[]).map(key => (
          <div key={key} ref={itemRef(key)}>
            <ManualCheckItem
              itemKey={key}
              label={(ITEM_LABELS as Record<string, string>)[key] ?? key}
              answer={state.answers[key] ?? null}
              notDone={state.manualNotDone[key]}
              isReadOnly={isReadOnly}
              onAnswer={handleAnswer}
              onNotDoneChange={handleNotDoneChange}
            />
          </div>
        ))}
      </SectionCard>

      <div style={{ height: 20 }} />

      {!isReadOnly && (
        <SubmitBar
          pending={stats.pending}
          blocked={stats.blockedKeys.length}
          unresolved={stats.unresolvedKeys.length}
          onComplete={handleComplete}
        />
      )}
    </div>
  );
}

const grpHdrStyle: React.CSSProperties = {
  padding: '7px 14px 5px',
  fontSize: 11,
  fontWeight: 600,
  color: '#605e5c',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  background: '#faf9f8',
  borderTop: '1px solid #edebe9',
  borderBottom: '1px solid #edebe9',
};

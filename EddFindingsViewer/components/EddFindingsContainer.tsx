import * as React from 'react';
import { FindingCard } from './FindingCard';
import { HeaderBar } from './HeaderBar';
import { EmptyState } from './EmptyState';
import { extractRecords } from '../utils/datasetHelpers';
import { getAdditionalColumns } from '../utils/metadataHelpers';
import { containerStyles } from '../styles/tokens';

interface EddFindingsContainerProps {
  dataset: ComponentFramework.PropertyTypes.DataSet;
  context: ComponentFramework.Context<unknown>;
}

const loadMoreButtonStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '4px 8px',
  fontSize: '12px',
  fontFamily: 'inherit',
  color: '#323130',
  backgroundColor: 'transparent',
  border: 'none',
  borderRadius: '2px',
  cursor: 'pointer',
};

export const EddFindingsContainer: React.FC<EddFindingsContainerProps> = ({
  dataset,
  context,
}) => {
  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(new Set());
  const [conditionNames, setConditionNames] = React.useState<Record<string, string>>({});
  const [loadMoreError, setLoadMoreError] = React.useState<boolean>(false);

  const findings = React.useMemo(() => extractRecords(dataset), [dataset]);

  const additionalColumns = React.useMemo(
    () => getAdditionalColumns(dataset.columns),
    [dataset.columns]
  );

  // Fetch condition names for lookups where getFormattedValue didn't resolve
  React.useEffect(() => {
    const idsToFetch: string[] = [];

    for (const finding of findings) {
      if (
        finding.linkedConditionId &&
        !finding.linkedConditionName &&
        !conditionNames[finding.linkedConditionId]
      ) {
        idsToFetch.push(finding.linkedConditionId);
      }
    }

    if (idsToFetch.length === 0) return;

    let cancelled = false;

    const fetchNames = async () => {
      const webApi = (context as ComponentFramework.Context<unknown> & {
        webAPI?: ComponentFramework.WebApi;
      }).webAPI;

      if (!webApi) return;

      const updates: Record<string, string> = {};

      for (const id of idsToFetch) {
        try {
          const result = await webApi.retrieveRecord(
            'syg_compliancecondition',
            id,
            '?$select=syg_name'
          );
          updates[id] = result.syg_name || 'Unnamed Condition';
        } catch {
          updates[id] = 'Open Record';
        }
      }

      if (!cancelled) {
        setConditionNames((prev) => ({ ...prev, ...updates }));
      }
    };

    fetchNames();

    return () => {
      cancelled = true;
    };
  }, [findings, conditionNames, context]);

  const navigateToForm = React.useCallback(
    (entityName: string, entityId: string) => {
      // Strip curly braces from GUID if present
      const cleanId = entityId.replace(/[{}]/g, '');
      try {
        context.navigation.openForm({
          entityName,
          entityId: cleanId,
        });
      } catch {
        try {
          const xrm = (window as unknown as {
            Xrm?: {
              Navigation?: {
                openForm: (options: { entityName: string; entityId: string }) => void;
              };
            };
          }).Xrm;
          xrm?.Navigation?.openForm({ entityName, entityId: cleanId });
        } catch {
          console.warn('Navigation failed');
        }
      }
    },
    [context]
  );

  const handleOpenFinding = React.useCallback(
    (entityId: string) => {
      navigateToForm('syg_eddfinding', entityId);
    },
    [navigateToForm]
  );

  const handleOpenCondition = React.useCallback(
    (entityId: string) => {
      navigateToForm('syg_compliancecondition', entityId);
    },
    [navigateToForm]
  );

  const handleNewFinding = React.useCallback(() => {
    const modeInfo = (context.mode as any).contextInfo;
    const parentId = modeInfo?.entityId as string | undefined;
    const parentName = modeInfo?.entityRecordName as string | undefined;

    const formOptions: ComponentFramework.NavigationApi.EntityFormOptions = {
      entityName: 'syg_eddfinding',
    };

    const formParameters: Record<string, string> | undefined = parentId
      ? {
          syg_kycprofileid: parentId,
          ...(parentName ? { syg_kycprofileidname: parentName } : {}),
        }
      : undefined;

    try {
      context.navigation.openForm(formOptions, formParameters);
    } catch {
      try {
        const xrm = (window as unknown as {
          Xrm?: {
            Navigation?: {
              openForm: (
                options: ComponentFramework.NavigationApi.EntityFormOptions,
                params?: { [key: string]: string }
              ) => void;
            };
          };
        }).Xrm;
        xrm?.Navigation?.openForm(formOptions, formParameters);
      } catch {
        console.warn('Navigation failed');
      }
    }
  }, [context]);

  const handleToggle = React.useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const allExpanded = findings.length > 0 && findings.every((f) => expandedIds.has(f.id));

  const handleToggleAll = React.useCallback(() => {
    if (allExpanded) {
      setExpandedIds(new Set());
    } else {
      setExpandedIds(new Set(findings.map((f) => f.id)));
    }
  }, [allExpanded, findings]);

  const handleLoadMore = React.useCallback(() => {
    setLoadMoreError(false);
    try {
      dataset.paging.loadNextPage();
    } catch {
      setLoadMoreError(true);
    }
  }, [dataset]);

  const getAdditionalValue = React.useCallback(
    (recordId: string, columnName: string): string => {
      const record = dataset.records[recordId];
      if (!record) return '';
      return record.getFormattedValue(columnName) || String(record.getValue(columnName) ?? '');
    },
    [dataset.records]
  );

  // Loading state
  if (dataset.loading) {
    return (
      <div style={containerStyles.loading}>
        <span style={{ color: '#605E5C', fontSize: '13px' }}>Loading findings...</span>
      </div>
    );
  }

  return (
    <div style={containerStyles.root}>
      <HeaderBar count={findings.length} onNewClick={handleNewFinding} allExpanded={allExpanded} onToggleAll={handleToggleAll} />

      {findings.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {findings.map((finding) => (
            <FindingCard
              key={finding.id}
              finding={finding}
              isExpanded={expandedIds.has(finding.id)}
              onToggle={() => handleToggle(finding.id)}
              onOpenFinding={handleOpenFinding}
              onOpenCondition={handleOpenCondition}
              conditionNameOverride={
                finding.linkedConditionId
                  ? conditionNames[finding.linkedConditionId]
                  : undefined
              }
              additionalColumns={additionalColumns}
              getAdditionalValue={getAdditionalValue}
            />
          ))}

          {dataset.paging?.hasNextPage && (
            <div style={containerStyles.loadMoreContainer}>
              <button
                style={loadMoreButtonStyle}
                onClick={handleLoadMore}
                type="button"
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#F3F2F1';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
                }}
              >
                Load more
              </button>
              {loadMoreError && (
                <div style={containerStyles.loadMoreError}>
                  Failed to load — try again
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

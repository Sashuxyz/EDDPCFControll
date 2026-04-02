import * as React from 'react';
import {
  FluentProvider,
  webLightTheme,
  Spinner,
  Button,
} from '@fluentui/react-components';
import { FindingCard } from './FindingCard';
import { HeaderBar } from './HeaderBar';
import { EmptyState } from './EmptyState';
import { extractRecords } from '../utils/datasetHelpers';
import { getAdditionalColumns } from '../utils/metadataHelpers';
import { useContainerStyles } from '../styles/tokens';

interface EddFindingsContainerProps {
  dataset: ComponentFramework.PropertyTypes.DataSet;
  context: ComponentFramework.Context<unknown>;
}

export const EddFindingsContainer: React.FC<EddFindingsContainerProps> = ({
  dataset,
  context,
}) => {
  const styles = useContainerStyles();
  const [expandedId, setExpandedId] = React.useState<string | null>(null);
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
      try {
        context.navigation.openForm({
          entityName,
          entityId,
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
          xrm?.Navigation?.openForm({ entityName, entityId });
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
    const parentId = (context.mode as any).contextInfo?.entityId as
      | string
      | undefined;

    const formOptions: Record<string, unknown> = {
      entityName: 'syg_eddfinding',
    };

    const formParameters: Record<string, string> | undefined = parentId
      ? {
          syg_kycprofileid: parentId,
          syg_kycprofileidname: parentId,
        }
      : undefined;

    try {
      context.navigation.openForm(
        formOptions,
        formParameters as unknown as ComponentFramework.FormatApi
      );
    } catch {
      try {
        const xrm = (window as unknown as {
          Xrm?: {
            Navigation?: {
              openForm: (
                options: Record<string, unknown>,
                params?: Record<string, string>
              ) => void;
            };
          };
        }).Xrm;
        if (formParameters) {
          xrm?.Navigation?.openForm(formOptions, formParameters);
        } else {
          xrm?.Navigation?.openForm(formOptions);
        }
      } catch {
        console.warn('Navigation failed');
      }
    }
  }, [context]);

  const handleToggle = React.useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

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

  // Loading state — no HeaderBar per spec
  if (dataset.loading) {
    return (
      <FluentProvider theme={webLightTheme}>
        <div className={styles.loading}>
          <Spinner label="Loading findings..." />
        </div>
      </FluentProvider>
    );
  }

  return (
    <FluentProvider theme={webLightTheme}>
      <div className={styles.root}>
        <HeaderBar count={findings.length} onNewClick={handleNewFinding} />

        {findings.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {findings.map((finding) => (
              <FindingCard
                key={finding.id}
                finding={finding}
                isExpanded={expandedId === finding.id}
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
              <div className={styles.loadMoreContainer}>
                <Button appearance="subtle" onClick={handleLoadMore} size="small">
                  Load more
                </Button>
                {loadMoreError && (
                  <div className={styles.loadMoreError}>
                    Failed to load — try again
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </FluentProvider>
  );
};

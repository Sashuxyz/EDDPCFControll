import * as React from 'react';
import { Button } from '@fluentui/react-components';
import { Add20Regular } from '@fluentui/react-icons';
import { useHeaderStyles } from '../styles/tokens';

interface HeaderBarProps {
  count: number;
  onNewClick: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({ count, onNewClick }) => {
  const styles = useHeaderStyles();

  return (
    <div className={styles.root}>
      <div className={styles.left}>
        <span className={styles.title}>EDD Findings</span>
        <span className={styles.countBadge}>{count}</span>
      </div>
      <Button
        appearance="subtle"
        icon={<Add20Regular />}
        onClick={onNewClick}
        size="small"
      >
        New Finding
      </Button>
    </div>
  );
};

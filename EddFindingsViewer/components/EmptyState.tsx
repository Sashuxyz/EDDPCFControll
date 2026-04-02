import * as React from 'react';
import { useEmptyStyles } from '../styles/tokens';

export const EmptyState: React.FC = () => {
  const styles = useEmptyStyles();

  return (
    <div className={styles.root}>
      <div className={styles.icon} aria-hidden="true">
        &#128269;
      </div>
      <div className={styles.text}>No EDD findings recorded.</div>
    </div>
  );
};

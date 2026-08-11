import styles from './workspace-skeleton.module.css';

interface WorkspaceSkeletonProps {
  label?: string;
}

export function WorkspaceSkeleton({
  label = 'Loading workspace',
}: WorkspaceSkeletonProps) {
  return (
    <div
      className={styles.page}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <span className={styles.srOnly}>{label}</span>

      <aside className={styles.sidebar} aria-hidden="true">
        <div className={styles.brand} />
        <div className={styles.navItem} />
      </aside>

      <main className={styles.main} aria-hidden="true">
        <div className={styles.title} />
        <div className={styles.description} />

        <div className={styles.stats}>
          <div />
          <div />
          <div />
        </div>

        <div className={styles.panel}>
          <div className={styles.panelTitle} />
          <div className={styles.row} />
          <div className={styles.row} />
          <div className={styles.row} />
        </div>
      </main>
    </div>
  );
}
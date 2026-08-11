import Link from 'next/link';
import type { ReactNode } from 'react';

import styles from './app-shell.module.css';

interface AppShellProps {
  children: ReactNode;
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function AppShell({
  children,
  title,
  description,
  actions,
}: AppShellProps) {
  return (
    <div className={styles.shell}>
      <a href="#main-content" className={styles.skipLink}>
        Skip to main content
      </a>

      <aside className={styles.sidebar}>
        <Link href="/dashboard" className={styles.brand}>
          <span className={styles.brandMark}>C</span>
          <span>
            <strong>Central CMS</strong>
            <small>Headless content platform</small>
          </span>
        </Link>

        <nav className={styles.navigation}>
          <Link
            href="/dashboard"
            className={styles.activeNavItem}
          >
            <span aria-hidden="true">▦</span>
            Projects
          </Link>

          <span className={styles.disabledNavItem}>
            <span aria-hidden="true">◫</span>
            Media
            <small>Later</small>
          </span>

          <span className={styles.disabledNavItem}>
            <span aria-hidden="true">⌁</span>
            API Keys
            <small>Later</small>
          </span>
        </nav>

        <div className={styles.sidebarFooter}>
          <span className={styles.statusDot} />
          Local development
        </div>
      </aside>

      <main
        id="main-content"
        className={styles.main}
        tabIndex={-1}
      >

        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Content workspace</p>
            <h1>{title}</h1>
            {description ? <p>{description}</p> : null}
          </div>
          {actions ? (
            <div className={styles.actions}>{actions}</div>
          ) : null}
        </header>

        <section className={styles.content}>{children}</section>
      </main>
    </div>
  );
}
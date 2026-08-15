'use client';

import Link from 'next/link';
import {
  usePathname,
  useRouter,
} from 'next/navigation';
import {
  type ReactNode,
  useEffect,
  useState,
} from 'react';

import { useAuth } from '../features/auth/auth-provider';
import { WorkspaceSkeleton } from './feedback/workspace-skeleton';
import styles from './app-shell.module.css';

interface AppShellProps {
  children: ReactNode;
  title: string;
  description?: string;
  actions?: ReactNode;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

export function AppShell({
  children,
  title,
  description,
  actions,
}: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const {
    user,
    loading,
    logoutUser,
  } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  async function handleLogout() {
    try {
      setLoggingOut(true);
      await logoutUser();
      router.replace('/login');
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  if (loading) {
    return <WorkspaceSkeleton label="Restoring session" />;
  }

  if (!user) {
    return null;
  }

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

        <nav
          className={styles.navigation}
          aria-label="Primary navigation"
        >
          <Link
            href="/dashboard"
            className={
              pathname === '/dashboard' ||
              pathname.startsWith('/projects/')
                ? styles.activeNavItem
                : styles.navItem
            }
          >
            <span aria-hidden="true">▦</span>
            Projects
          </Link>
        </nav>

        <div className={styles.sidebarFooter}>
          <span className={styles.userAvatar}>
            {initials(user.name) || 'U'}
          </span>
          <span className={styles.userDetails}>
            <strong>{user.name}</strong>
            <small>{user.email}</small>
          </span>
          <button
            type="button"
            className={styles.logoutButton}
            onClick={handleLogout}
            disabled={loggingOut}
            aria-label="Logout"
            title="Logout"
          >
            {loggingOut ? '…' : '↪'}
          </button>
        </div>
      </aside>

      <main
        id="main-content"
        className={styles.main}
        tabIndex={-1}
      >
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>
              Content workspace
            </p>
            <h1>{title}</h1>
            {description ? <p>{description}</p> : null}
          </div>

          {actions ? (
            <div className={styles.actions}>{actions}</div>
          ) : null}
        </header>

        <section className={styles.content}>
          {children}
        </section>
      </main>
    </div>
  );
}
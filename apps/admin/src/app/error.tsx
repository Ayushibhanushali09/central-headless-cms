'use client';

import Link from 'next/link';
import { useEffect } from 'react';

import styles from './system-page.module.css';

interface ErrorPageProps {
  error: Error & {
    digest?: string;
  };
  reset: () => void;
}

export default function ErrorPage({
  error,
  reset,
}: ErrorPageProps) {
  useEffect(() => {
    // Replace with production monitoring in Part 10.
    console.error(error);
  }, [error]);

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <span className={styles.code}>ERROR</span>
        <h1>Something went wrong</h1>
        <p>
          The CMS could not complete this request. Retry the
          screen or return to the Dashboard.
        </p>

        {error.digest ? (
          <p>
            Error reference: <code>{error.digest}</code>
          </p>
        ) : null}

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={reset}
          >
            Try again
          </button>
          <Link
            href="/dashboard"
            className={styles.secondaryButton}
          >
            Dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}
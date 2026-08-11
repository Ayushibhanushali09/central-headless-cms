import Link from 'next/link';

import styles from './system-page.module.css';

export default function NotFound() {
  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <span className={styles.code}>404</span>
        <h1>Page not found</h1>
        <p>
          The requested CMS resource does not exist or is no
          longer available.
        </p>
        <div className={styles.actions}>
          <Link
            href="/dashboard"
            className={styles.primaryButton}
          >
            Back to Dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}
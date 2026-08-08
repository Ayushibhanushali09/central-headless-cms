'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

import { AppShell } from '../../../../../components/app-shell';
import {
  getDeliveryUrl,
  getPage,
} from '../../../../../lib/api';
import type { CmsPage } from '../../../../../lib/types';
import styles from './page.module.css';

export default function PageOverview() {
  const params = useParams<{
    projectId: string;
    pageId: string;
  }>();

  const [page, setPage] = useState<CmsPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPage() {
      try {
        setLoading(true);
        setError(null);
        setPage(await getPage(params.pageId));
      } catch (loadError: unknown) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Page could not be loaded.',
        );
      } finally {
        setLoading(false);
      }
    }

    void loadPage();
  }, [params.pageId]);

  const deliveryUrl = page
    ? getDeliveryUrl(page.id)
    : null;

  return (
    <AppShell
      title={page?.name ?? 'Page'}
      description="Manage this Page's schema, content and delivery lifecycle."
      actions={
        <Link
          href={`/projects/${params.projectId}`}
          className={styles.backButton}
        >
          ← Pages
        </Link>
      }
    >
      {error ? (
        <div className={styles.errorMessage}>{error}</div>
      ) : loading ? (
        <div className={styles.loadingCard}>Loading Page…</div>
      ) : page ? (
        <>
          <div className={styles.metadataGrid}>
            <article>
              <span>Page ID</span>
              <strong>{page.id}</strong>
            </article>
            <article>
              <span>Endpoint slug</span>
              <strong>/{page.endpointSlug}</strong>
            </article>
            <article>
              <span>Visibility</span>
              <strong>{page.visibility}</strong>
            </article>
            <article>
              <span>Status</span>
              <strong>{page.status}</strong>
            </article>
          </div>

          <section className={styles.lifecyclePanel}>
            <div>
              <p className={styles.eyebrow}>Page lifecycle</p>
              <h2>Schema, Content and Delivery</h2>
              <p>
                The next build step adds the complete Schema
                Editor, generated Content Form and Publish tools
                to this real Page route.
              </p>
            </div>

            {deliveryUrl ? (
              <a
                href={deliveryUrl}
                target="_blank"
                rel="noreferrer"
                className={styles.deliveryButton}
              >
                Open Published API ↗
              </a>
            ) : null}
          </section>
        </>
      ) : null}
    </AppShell>
  );
}
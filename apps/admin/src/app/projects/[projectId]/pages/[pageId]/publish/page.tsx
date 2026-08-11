'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { AppShell } from '../../../../../../components/app-shell';
import { PageEditorNav } from '../../../../../../components/page-editor-nav';
import { useDialogFocus } from '../../../../../../hooks/use-dialog-focus';
import {
  ApiError,
  getDeliveryUrl,
  getPage,
  getPageContent,
  getPublishedContent,
  publishPageContent,
} from '../../../../../../lib/api';
import type {
  CmsPage,
  PageContentState,
} from '../../../../../../lib/types';
import styles from './page.module.css';

function formatDate(value: string | null): string {
  if (!value) {
    return 'Not published';
  }

  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function prettyJson(value: unknown): string {
  if (value === null || value === undefined) {
    return 'No content available';
  }

  return JSON.stringify(value, null, 2);
}

export default function PublishPage() {
  const params = useParams<{
    projectId: string;
    pageId: string;
  }>();

  const [page, setPage] = useState<CmsPage | null>(null);

  const [contentState, setContentState] =
    useState<PageContentState | null>(null);

  const [deliveryPreview, setDeliveryPreview] = useState<
    Record<string, unknown> | null
  >(null);

  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);

  const [showConfirmation, setShowConfirmation] =
    useState(false);

  const [error, setError] = useState<string | null>(null);

  const [success, setSuccess] = useState<string | null>(
    null,
  );

  const [copied, setCopied] = useState(false);

  const deliveryUrl = useMemo(
    () => getDeliveryUrl(params.pageId),
    [params.pageId],
  );

  const closeConfirmation = useCallback(() => {
    if (!publishing) {
      setShowConfirmation(false);
    }
  }, [publishing]);

  const publishDialogRef = useDialogFocus(
    showConfirmation,
    closeConfirmation,
  );

  const loadPublishingState = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const [pageResult, contentResult] =
        await Promise.all([
          getPage(params.pageId),
          getPageContent(params.pageId),
        ]);

      setPage(pageResult);
      setContentState(contentResult);

      if (
        pageResult.visibility === 'public' &&
        contentResult.publishedVersion > 0
      ) {
        try {
          setDeliveryPreview(
            await getPublishedContent(params.pageId),
          );
        } catch {
          setDeliveryPreview(null);
        }
      } else {
        setDeliveryPreview(null);
      }
    } catch (loadError: unknown) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Publishing state could not be loaded.',
      );
    } finally {
      setLoading(false);
    }
  }, [params.pageId]);

  useEffect(() => {
    void loadPublishingState();
  }, [loadPublishingState]);

  async function handlePublish() {
    if (!contentState) {
      return;
    }

    try {
      setPublishing(true);
      setError(null);
      setSuccess(null);

      const published = await publishPageContent(
        params.pageId,
        {
          expectedDraftVersion:
            contentState.draftVersion,
        },
      );

      setContentState(published);
      setShowConfirmation(false);

      setSuccess(
        `Draft version ${published.publishedFromDraftVersion} published successfully.`,
      );

      if (page?.visibility === 'public') {
        try {
          setDeliveryPreview(
            await getPublishedContent(params.pageId),
          );
        } catch {
          setDeliveryPreview(null);
        }
      }
    } catch (publishError: unknown) {
      if (
        publishError instanceof ApiError &&
        publishError.code === 'STALE_DRAFT_VERSION'
      ) {
        setError(
          'The Draft changed before Publish. Reload and review the latest version.',
        );
      } else {
        setError(
          publishError instanceof Error
            ? publishError.message
            : 'Content could not be published.',
        );
      }
    } finally {
      setPublishing(false);
    }
  }

  async function handleCopyEndpoint() {
    try {
      await navigator.clipboard.writeText(deliveryUrl);

      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 1800);
    } catch {
      setError('Delivery endpoint could not be copied.');
    }
  }

  const canPublish = Boolean(
    contentState &&
      contentState.draftData &&
      contentState.draftVersion > 0 &&
      contentState.hasUnpublishedChanges,
  );

  return (
    <AppShell
      title={page?.name ?? 'Publish Content'}
      description="Review Draft and Published content, then publish an exact Draft version."
      actions={
        <Link
          href={`/projects/${params.projectId}`}
          className={styles.backButton}
        >
          ← Pages
        </Link>
      }
    >
      <PageEditorNav
        projectId={params.projectId}
        pageId={params.pageId}
        active="publish"
      />

      {error ? (
        <div className={styles.errorMessage} role="alert">
          <span>{error}</span>

          <button
            type="button"
            onClick={loadPublishingState}
          >
            Reload
          </button>
        </div>
      ) : null}

      {success ? (
        <div
          className={styles.successMessage}
          role="status"
        >
          {success}
        </div>
      ) : null}

      {loading ? (
        <div className={styles.loadingCard}>
          Loading Publish workspace…
        </div>
      ) : contentState && page ? (
        <>
          <div className={styles.statusGrid}>
            <article>
              <span>Draft version</span>
              <strong>{contentState.draftVersion}</strong>
              <small>
                {formatDate(contentState.draftUpdatedAt)}
              </small>
            </article>

            <article>
              <span>Published version</span>
              <strong>{contentState.publishedVersion}</strong>
              <small>
                {formatDate(contentState.publishedAt)}
              </small>
            </article>

            <article>
              <span>Published from Draft</span>
              <strong>
                {contentState.publishedFromDraftVersion}
              </strong>
              <small>Source Draft version</small>
            </article>

            <article>
              <span>Publish status</span>

              <strong
                className={
                  contentState.hasUnpublishedChanges
                    ? styles.warningValue
                    : styles.okValue
                }
              >
                {contentState.hasUnpublishedChanges
                  ? 'Changes pending'
                  : 'Up to date'}
              </strong>

              <small>{page.visibility} Page</small>
            </article>
          </div>

          <section className={styles.publishPanel}>
            <div>
              <p className={styles.eyebrow}>
                Release content
              </p>

              <h2>
                {canPublish
                  ? `Publish Draft ${contentState.draftVersion}`
                  : 'Published content is up to date'}
              </h2>

              <p>
                Publish copies the validated Draft into the
                public publication without changing the Draft.
              </p>
            </div>

            <button
              type="button"
              className={styles.publishButton}
              disabled={!canPublish || publishing}
              onClick={() => setShowConfirmation(true)}
            >
              {publishing
                ? 'Publishing…'
                : 'Publish Draft'}
            </button>
          </section>

          <div className={styles.comparisonGrid}>
            <section className={styles.jsonPanel}>
              <div className={styles.panelHeading}>
                <div>
                  <p className={styles.eyebrow}>
                    Draft
                  </p>

                  <h2>
                    Version {contentState.draftVersion}
                  </h2>
                </div>

                {contentState.hasUnpublishedChanges ? (
                  <span className={styles.pendingBadge}>
                    Pending
                  </span>
                ) : null}
              </div>

              <pre>
                {prettyJson(contentState.draftData)}
              </pre>
            </section>

            <section className={styles.jsonPanel}>
              <div className={styles.panelHeading}>
                <div>
                  <p className={styles.eyebrow}>
                    Published
                  </p>

                  <h2>
                    Version {contentState.publishedVersion}
                  </h2>
                </div>

                <span className={styles.liveBadge}>
                  Live
                </span>
              </div>

              <pre>
                {prettyJson(contentState.publishedData)}
              </pre>
            </section>
          </div>

          <section className={styles.deliveryPanel}>
            <div className={styles.panelHeading}>
              <div>
                <p className={styles.eyebrow}>
                  Headless API
                </p>

                <h2>Delivery Endpoint</h2>

                <p>
                  Returns only the latest Published JSON.
                </p>
              </div>

              <div className={styles.endpointActions}>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={handleCopyEndpoint}
                >
                  {copied ? 'Copied!' : 'Copy URL'}
                </button>

                {page.visibility === 'public' ? (
                  <a
                    href={deliveryUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.openButton}
                  >
                    Open API ↗
                  </a>
                ) : null}
              </div>
            </div>

            <code className={styles.endpointUrl}>
              {deliveryUrl}
            </code>

            {page.visibility === 'private' ? (
              <div className={styles.privateNotice}>
                This Page is private. Public Delivery remains
                unavailable until private API keys are
                implemented.
              </div>
            ) : deliveryPreview ? (
              <pre className={styles.deliveryPreview}>
                {prettyJson(deliveryPreview)}
              </pre>
            ) : (
              <div className={styles.privateNotice}>
                No public Published content is available yet.
              </div>
            )}
          </section>
        </>
      ) : null}

      {showConfirmation && contentState ? (
        <div
          className={styles.modalBackdrop}
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !publishing
            ) {
              closeConfirmation();
            }
          }}
        >
          <section
            ref={publishDialogRef}
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="publish-dialog-title"
          >
            <p className={styles.eyebrow}>
              Confirm Publish
            </p>

            <h2 id="publish-dialog-title">
              Publish Draft {contentState.draftVersion}?
            </h2>

            <p>
              This will create Published version{' '}
              {contentState.publishedVersion + 1}. The current
              public content will be replaced.
            </p>

            <div className={styles.modalSummary}>
              <span>Current Published</span>

              <strong>
                Version {contentState.publishedVersion}
              </strong>

              <span>New source Draft</span>

              <strong>
                Version {contentState.draftVersion}
              </strong>
            </div>

            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={closeConfirmation}
                disabled={publishing}
              >
                Cancel
              </button>

              <button
                type="button"
                className={styles.publishButton}
                onClick={handlePublish}
                disabled={publishing}
                autoFocus
              >
                {publishing
                  ? 'Publishing…'
                  : 'Confirm Publish'}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </AppShell>
  );
}
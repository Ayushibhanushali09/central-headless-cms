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
import { ContentForm } from '../../../../../../features/content-editor/content-form';
import {
  ApiError,
  getPage,
  getPageContent,
  getPageSchema,
  savePageDraft,
} from '../../../../../../lib/api';
import type {
  CmsPage,
  PageContentState,
  PageSchemaState,
  SchemaValidationIssue,
} from '../../../../../../lib/types';
import styles from './page.module.css';

function serialize(value: Record<string, unknown>): string {
  return JSON.stringify(value);
}

function formatDate(value: string | null): string {
  if (!value) {
    return 'Not available';
  }

  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function extractIssues(
  error: unknown,
): SchemaValidationIssue[] {
  if (!(error instanceof ApiError)) {
    return [];
  }

  if (!Array.isArray(error.details)) {
    return [];
  }

  return error.details.filter(
    (item): item is SchemaValidationIssue => {
      if (
        typeof item !== 'object' ||
        item === null ||
        Array.isArray(item)
      ) {
        return false;
      }

      const issue = item as Record<string, unknown>;

      return (
        typeof issue.path === 'string' &&
        typeof issue.keyword === 'string' &&
        typeof issue.message === 'string'
      );
    },
  );
}

export default function PageContentEditor() {
  const params = useParams<{
    projectId: string;
    pageId: string;
  }>();

  const [page, setPage] = useState<CmsPage | null>(null);
  const [schemaState, setSchemaState] =
    useState<PageSchemaState | null>(null);
  const [contentState, setContentState] =
    useState<PageContentState | null>(null);
  const [formData, setFormData] = useState<
    Record<string, unknown>
  >({});
  const [savedDraft, setSavedDraft] = useState('{}');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [backendIssues, setBackendIssues] = useState<
    SchemaValidationIssue[]
  >([]);

  const isDirty = useMemo(
    () => serialize(formData) !== savedDraft,
    [formData, savedDraft],
  );

  const loadContent = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      setBackendIssues([]);

      const [pageResult, schemaResult, contentResult] =
        await Promise.all([
          getPage(params.pageId),
          getPageSchema(params.pageId),
          getPageContent(params.pageId),
        ]);

      const draft = contentResult.draftData ?? {};

      setPage(pageResult);
      setSchemaState(schemaResult);
      setContentState(contentResult);
      setFormData(draft);
      setSavedDraft(serialize(draft));
    } catch (loadError: unknown) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Page content could not be loaded.',
      );
    } finally {
      setLoading(false);
    }
  }, [params.pageId]);

  useEffect(() => {
    void loadContent();
  }, [loadContent]);

  useEffect(() => {
    function warnBeforeUnload(event: BeforeUnloadEvent) {
      if (isDirty) {
        event.preventDefault();
      }
    }

    window.addEventListener(
      'beforeunload',
      warnBeforeUnload,
    );

    return () => {
      window.removeEventListener(
        'beforeunload',
        warnBeforeUnload,
      );
    };
  }, [isDirty]);

  async function handleSaveDraft(
    contentData: Record<string, unknown>,
  ) {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      setBackendIssues([]);

      const saved = await savePageDraft(params.pageId, {
        contentData,
      });

      const nextDraft = saved.draftData ?? {};

      setContentState(saved);
      setFormData(nextDraft);
      setSavedDraft(serialize(nextDraft));
      setSuccess(
        `Draft version ${saved.draftVersion} saved successfully.`,
      );
    } catch (saveError: unknown) {
      setBackendIssues(extractIssues(saveError));
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Draft could not be saved.',
      );
    } finally {
      setSaving(false);
    }
  }

  function handleBackClick(
    event: React.MouseEvent<HTMLAnchorElement>,
  ) {
    if (
      isDirty &&
      !window.confirm(
        'You have unsaved Draft changes. Leave anyway?',
      )
    ) {
      event.preventDefault();
    }
  }

  const hasSchema =
    schemaState?.schemaDefinition !== null &&
    (schemaState?.schemaVersion ?? 0) > 0;

  return (
    <AppShell
      title={page?.name ?? 'Page Content'}
      description="Edit structured content generated from the current Page Schema."
      actions={
        <Link
          href={`/projects/${params.projectId}`}
          className={styles.backButton}
          onClick={handleBackClick}
        >
          ← Pages
        </Link>
      }
    >
      <PageEditorNav
        projectId={params.projectId}
        pageId={params.pageId}
        active="content"
      />

      {error ? (
        <div className={styles.errorMessage} role="alert">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className={styles.successMessage} role="status">
          {success}
        </div>
      ) : null}

      {backendIssues.length > 0 ? (
        <section className={styles.backendIssues}>
          <strong>Backend validation errors</strong>
          <ul>
            {backendIssues.map((issue, index) => (
              <li
                key={`${issue.path}-${issue.keyword}-${index}`}
              >
                <code>{issue.path}</code>
                <span>{issue.message}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {loading ? (
        <div className={styles.loadingCard}>
          Loading Content Editor…
        </div>
      ) : !hasSchema ? (
        <section className={styles.emptySchema}>
          <h2>Schema required</h2>
          <p>
            Save a valid JSON Schema before editing Page content.
          </p>
          <Link
            href={`/projects/${params.projectId}/pages/${params.pageId}`}
          >
            Open Schema Editor
          </Link>
        </section>
      ) : schemaState?.schemaDefinition ? (
        <>
          <div className={styles.versionGrid}>
            <article>
              <span>Schema version</span>
              <strong>{contentState?.schemaVersion ?? 0}</strong>
            </article>
            <article>
              <span>Draft version</span>
              <strong>{contentState?.draftVersion ?? 0}</strong>
              <small>
                {formatDate(
                  contentState?.draftUpdatedAt ?? null,
                )}
              </small>
            </article>
            <article>
              <span>Published version</span>
              <strong>
                {contentState?.publishedVersion ?? 0}
              </strong>
              <small>
                {formatDate(contentState?.publishedAt ?? null)}
              </small>
            </article>
            <article>
              <span>Unpublished changes</span>
              <strong
                className={
                  contentState?.hasUnpublishedChanges
                    ? styles.warningValue
                    : styles.okValue
                }
              >
                {contentState?.hasUnpublishedChanges
                  ? 'Yes'
                  : 'No'}
              </strong>
            </article>
          </div>

          <section className={styles.contentPanel}>
            <div className={styles.panelHeading}>
              <div>
                <p className={styles.eyebrow}>Editor view</p>
                <h2>Draft Content</h2>
                <p>
                  Fields are generated from Schema version{' '}
                  {schemaState.schemaVersion}.
                </p>
              </div>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={loadContent}
                disabled={saving}
              >
                Reload
              </button>
            </div>

            <ContentForm
              schemaDefinition={schemaState.schemaDefinition}
              formData={formData}
              saving={saving}
              isDirty={isDirty}
              onChange={(data) => {
                setFormData(data);
                setSuccess(null);
                setBackendIssues([]);
              }}
              onSubmit={handleSaveDraft}
            />
          </section>
        </>
      ) : null}
    </AppShell>
  );
}
'use client';

import Link from 'next/link';
import {
  type FormEvent,
  useCallback,
  useEffect,
  useState,
} from 'react';
import { useParams } from 'next/navigation';

import { AppShell } from '../../../components/app-shell';
import {
  createPage,
  getProject,
  getProjectPages,
} from '../../../lib/api';
import type {
  CmsPage,
  PageVisibility,
  Project,
} from '../../../lib/types';
import styles from './page.module.css';

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export default function ProjectWorkspacePage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params.projectId;

  const [project, setProject] = useState<Project | null>(
    null,
  );
  const [pages, setPages] = useState<CmsPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] =
    useState(false);
  const [name, setName] = useState('');
  const [endpointSlug, setEndpointSlug] = useState('');
  const [visibility, setVisibility] =
    useState<PageVisibility>('private');

  const loadWorkspace = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [projectResult, pagesResult] =
        await Promise.all([
          getProject(projectId),
          getProjectPages(projectId),
        ]);

      setProject(projectResult);
      setPages(pagesResult);
    } catch (loadError: unknown) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Project workspace could not be loaded.',
      );
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace]);

  async function handleCreatePage(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    try {
      setSubmitting(true);
      setError(null);

      const page = await createPage(projectId, {
        name,
        endpointSlug: endpointSlug || undefined,
        visibility,
      });

      setPages((current) => [page, ...current]);
      setName('');
      setEndpointSlug('');
      setVisibility('private');
      setShowCreateForm(false);
    } catch (createError: unknown) {
      setError(
        createError instanceof Error
          ? createError.message
          : 'Page could not be created.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell
      title={project?.name ?? 'Project Workspace'}
      description={
        project?.description ||
        'Manage Pages and content endpoints.'
      }
      actions={
        <div className={styles.headerActions}>
          <Link
            href="/dashboard"
            className={styles.secondaryButton}
          >
            ← Projects
          </Link>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={() => setShowCreateForm(true)}
          >
            + New Page
          </button>
        </div>
      }
    >
      <div className={styles.statsGrid}>
        <article className={styles.statCard}>
          <span>Total Pages</span>
          <strong>{pages.length}</strong>
        </article>
        <article className={styles.statCard}>
          <span>Public Pages</span>
          <strong>
            {
              pages.filter(
                (page) => page.visibility === 'public',
              ).length
            }
          </strong>
        </article>
        <article className={styles.statCard}>
          <span>Private Pages</span>
          <strong>
            {
              pages.filter(
                (page) => page.visibility === 'private',
              ).length
            }
          </strong>
        </article>
      </div>

      {error ? (
        <div className={styles.errorMessage} role="alert">
          <span>{error}</span>
          <button type="button" onClick={loadWorkspace}>
            Retry
          </button>
        </div>
      ) : null}

      {showCreateForm ? (
        <section className={styles.formPanel}>
          <div className={styles.panelHeading}>
            <div>
              <h2>Create Page</h2>
              <p>
                Every Page receives its own Delivery endpoint.
              </p>
            </div>
            <button
              type="button"
              className={styles.iconButton}
              onClick={() => setShowCreateForm(false)}
              aria-label="Close form"
            >
              ×
            </button>
          </div>

          <form
            className={styles.pageForm}
            onSubmit={handleCreatePage}
          >
            <label>
              Page name
              <input
                value={name}
                onChange={(event) =>
                  setName(event.target.value)
                }
                minLength={2}
                maxLength={120}
                placeholder="Example: Home Page"
                required
              />
            </label>

            <label>
              Endpoint slug
              <input
                value={endpointSlug}
                onChange={(event) =>
                  setEndpointSlug(
                    event.target.value
                      .toLowerCase()
                      .replace(/\s+/g, '-'),
                  )
                }
                maxLength={100}
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                placeholder="Optional; example: home"
              />
              <small>
                Leave empty to generate from Page name.
              </small>
            </label>

            <label>
              Visibility
              <select
                value={visibility}
                onChange={(event) =>
                  setVisibility(
                    event.target.value as PageVisibility,
                  )
                }
              >
                <option value="private">Private</option>
                <option value="public">Public</option>
              </select>
            </label>

            <div className={styles.formActions}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => setShowCreateForm(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={styles.primaryButton}
                disabled={submitting}
              >
                {submitting ? 'Creating…' : 'Create Page'}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className={styles.pagesPanel}>
        <div className={styles.sectionHeading}>
          <div>
            <h2>Pages</h2>
            <p>Open a Page to manage its content lifecycle.</p>
          </div>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={loadWorkspace}
            disabled={loading}
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <div className={styles.emptyState}>
            Loading Pages…
          </div>
        ) : pages.length === 0 ? (
          <div className={styles.emptyState}>
            <strong>No Pages yet</strong>
            <span>Create the first Page in this Project.</span>
          </div>
        ) : (
          <div className={styles.pageList}>
            {pages.map((page) => (
              <Link
                key={page.id}
                href={`/projects/${projectId}/pages/${page.id}`}
                className={styles.pageRow}
              >
                <span className={styles.pageIcon}>▤</span>
                <span className={styles.pageIdentity}>
                  <strong>{page.name}</strong>
                  <small>/{page.endpointSlug}</small>
                </span>
                <span
                  className={
                    page.visibility === 'public'
                      ? styles.publicBadge
                      : styles.privateBadge
                  }
                >
                  {page.visibility}
                </span>
                <span className={styles.updatedAt}>
                  Updated {formatDate(page.updatedAt)}
                </span>
                <strong className={styles.openAction}>
                  Open →
                </strong>
              </Link>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
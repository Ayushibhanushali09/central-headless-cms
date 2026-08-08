'use client';

import Link from 'next/link';
import {
  type FormEvent,
  useCallback,
  useEffect,
  useState,
} from 'react';

import { AppShell } from '../../components/app-shell';
import {
  createProject,
  getProjects,
} from '../../lib/api';
import type { Project } from '../../lib/types';
import styles from './page.module.css';

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] =
    useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const loadProjects = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setProjects(await getProjects());
    } catch (loadError: unknown) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Projects could not be loaded.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  async function handleCreateProject(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    try {
      setSubmitting(true);
      setError(null);

      const project = await createProject({
        name,
        description: description || undefined,
      });

      setProjects((current) => [project, ...current]);
      setName('');
      setDescription('');
      setShowCreateForm(false);
    } catch (createError: unknown) {
      setError(
        createError instanceof Error
          ? createError.message
          : 'Project could not be created.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell
      title="Projects"
      description="Manage websites, campaigns and their content APIs."
      actions={
        <button
          type="button"
          className={styles.primaryButton}
          onClick={() => setShowCreateForm(true)}
        >
          + New Project
        </button>
      }
    >
      <div className={styles.statsGrid}>
        <article className={styles.statCard}>
          <span>Total projects</span>
          <strong>{projects.length}</strong>
        </article>
        <article className={styles.statCard}>
          <span>Active projects</span>
          <strong>
            {
              projects.filter(
                (project) => project.status === 'active',
              ).length
            }
          </strong>
        </article>
        <article className={styles.statCard}>
          <span>Environment</span>
          <strong className={styles.environment}>Local</strong>
        </article>
      </div>

      {error ? (
        <div className={styles.errorMessage} role="alert">
          <span>{error}</span>
          <button type="button" onClick={loadProjects}>
            Retry
          </button>
        </div>
      ) : null}

      {showCreateForm ? (
        <section className={styles.formPanel}>
          <div className={styles.panelHeading}>
            <div>
              <h2>Create Project</h2>
              <p>
                A Project represents one website or campaign.
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
            className={styles.projectForm}
            onSubmit={handleCreateProject}
          >
            <label>
              Project name
              <input
                value={name}
                onChange={(event) =>
                  setName(event.target.value)
                }
                minLength={2}
                maxLength={120}
                placeholder="Example: Valueye Website"
                required
              />
            </label>

            <label>
              Description
              <textarea
                value={description}
                onChange={(event) =>
                  setDescription(event.target.value)
                }
                maxLength={500}
                rows={3}
                placeholder="Short description of this project"
              />
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
                {submitting ? 'Creating…' : 'Create Project'}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className={styles.projectsSection}>
        <div className={styles.sectionHeading}>
          <div>
            <h2>Your projects</h2>
            <p>Select a project to manage its Pages.</p>
          </div>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={loadProjects}
            disabled={loading}
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <div className={styles.emptyState}>
            Loading Projects…
          </div>
        ) : projects.length === 0 ? (
          <div className={styles.emptyState}>
            <strong>No Projects yet</strong>
            <span>Create the first CMS Project.</span>
          </div>
        ) : (
          <div className={styles.projectGrid}>
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className={styles.projectCard}
              >
                <div className={styles.cardTopRow}>
                  <span className={styles.projectIcon}>
                    {project.name.charAt(0).toUpperCase()}
                  </span>
                  <span className={styles.statusBadge}>
                    {project.status}
                  </span>
                </div>

                <h3>{project.name}</h3>
                <p>
                  {project.description ||
                    'No project description provided.'}
                </p>

                <footer>
                  <span>
                    Updated {formatDate(project.updatedAt)}
                  </span>
                  <strong>Open →</strong>
                </footer>
              </Link>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
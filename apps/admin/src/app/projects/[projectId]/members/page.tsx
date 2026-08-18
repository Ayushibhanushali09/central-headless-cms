'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { AppShell } from '../../../../components/app-shell';
import { useAuth } from '../../../../features/auth/auth-provider';
import {
  addProjectMember,
  ApiError,
  disableProjectMember,
  getProject,
  getProjectMembers,
  updateProjectMember,
} from '../../../../lib/api';
import type {
  AssignableProjectRole,
  Project,
  ProjectMember,
  ProjectRole,
} from '../../../../lib/types';
import styles from './page.module.css';

const OWNER_ASSIGNABLE_ROLES: readonly AssignableProjectRole[] = [
  'admin',
  'editor',
  'viewer',
];

const ADMIN_ASSIGNABLE_ROLES: readonly AssignableProjectRole[] = [
  'editor',
  'viewer',
];

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function roleLabel(role: ProjectRole): string {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function errorMessage(
  error: unknown,
  fallback: string,
): string {
  return error instanceof Error
    ? error.message
    : fallback;
}

export default function ProjectMembersPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params.projectId;
  const { user } = useAuth();

  const [project, setProject] = useState<Project | null>(
    null,
  );
  const [members, setMembers] = useState<ProjectMember[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [email, setEmail] = useState('');
  const [addRole, setAddRole] =
    useState<AssignableProjectRole>('viewer');
  const [adding, setAdding] = useState(false);
  const [busyUserId, setBusyUserId] =
    useState<string | null>(null);

  const loadMembersPage = useCallback(async () => {
    try {
      setLoading(true);
      setAccessDenied(false);
      setError(null);

      const [projectResult, membersResult] =
        await Promise.all([
          getProject(projectId),
          getProjectMembers(projectId),
        ]);

      setProject(projectResult);
      setMembers(membersResult);
    } catch (loadError: unknown) {
      if (
        loadError instanceof ApiError &&
        loadError.status === 403
      ) {
        setAccessDenied(true);
        setError(
          'Only Project Owners and Admins can manage members.',
        );
      } else {
        setError(
          errorMessage(
            loadError,
            'Project members could not be loaded.',
          ),
        );
      }
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadMembersPage();
  }, [loadMembersPage]);

  const actorRole = useMemo<ProjectRole | null>(() => {
    if (!user) {
      return null;
    }

    return (
      members.find(
        (member) => member.userId === user.id,
      )?.role ?? null
    );
  }, [members, user]);

  const assignableRoles =
    actorRole === 'owner'
      ? OWNER_ASSIGNABLE_ROLES
      : ADMIN_ASSIGNABLE_ROLES;

  const activeCount = members.filter(
    (member) => member.status === 'active',
  ).length;

  const disabledCount = members.filter(
    (member) => member.status === 'disabled',
  ).length;

  function replaceMember(updated: ProjectMember): void {
    setMembers((current) => {
      const exists = current.some(
        (member) => member.userId === updated.userId,
      );

      if (!exists) {
        return [updated, ...current];
      }

      return current.map((member) =>
        member.userId === updated.userId
          ? updated
          : member,
      );
    });
  }

  function canManage(member: ProjectMember): boolean {
    if (
      member.userId === user?.id ||
      member.role === 'owner'
    ) {
      return false;
    }

    if (actorRole === 'owner') {
      return true;
    }

    return (
      actorRole === 'admin' &&
      (member.role === 'editor' ||
        member.role === 'viewer')
    );
  }

  async function handleAddMember(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    try {
      setAdding(true);
      setError(null);
      setNotice(null);

      const added = await addProjectMember(projectId, {
        email,
        role: addRole,
      });

      replaceMember(added);
      setEmail('');
      setAddRole('viewer');
      setNotice(
        `${added.name} was added as ${roleLabel(
          added.role,
        )}.`,
      );
    } catch (addError: unknown) {
      setError(
        errorMessage(
          addError,
          'Project member could not be added.',
        ),
      );
    } finally {
      setAdding(false);
    }
  }

  async function handleRoleChange(
    member: ProjectMember,
    role: AssignableProjectRole,
  ) {
    try {
      setBusyUserId(member.userId);
      setError(null);
      setNotice(null);

      const updated = await updateProjectMember(
        projectId,
        member.userId,
        { role },
      );

      replaceMember(updated);
      setNotice(
        `${updated.name} is now ${roleLabel(
          updated.role,
        )}.`,
      );
    } catch (updateError: unknown) {
      setError(
        errorMessage(
          updateError,
          'Member role could not be updated.',
        ),
      );
    } finally {
      setBusyUserId(null);
    }
  }

  async function handleDisable(member: ProjectMember) {
    const confirmed = window.confirm(
      `Disable ${member.name}'s Project membership?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setBusyUserId(member.userId);
      setError(null);
      setNotice(null);

      await disableProjectMember(
        projectId,
        member.userId,
      );

      const refreshed = await getProjectMembers(projectId);
      setMembers(refreshed);
      setNotice(`${member.name} was disabled.`);
    } catch (disableError: unknown) {
      setError(
        errorMessage(
          disableError,
          'Member could not be disabled.',
        ),
      );
    } finally {
      setBusyUserId(null);
    }
  }

  async function handleReactivate(member: ProjectMember) {
    if (member.role === 'owner') {
      return;
    }

    try {
      setBusyUserId(member.userId);
      setError(null);
      setNotice(null);

      const reactivated = await addProjectMember(
        projectId,
        {
          email: member.email,
          role: member.role,
        },
      );

      replaceMember(reactivated);
      setNotice(`${member.name} was reactivated.`);
    } catch (reactivateError: unknown) {
      setError(
        errorMessage(
          reactivateError,
          'Member could not be reactivated.',
        ),
      );
    } finally {
      setBusyUserId(null);
    }
  }

  return (
    <AppShell
      title={
        project
          ? `${project.name} Members`
          : 'Project Members'
      }
      description="Manage Project access and content-operation roles."
      actions={
        <Link
          href={`/projects/${projectId}`}
          className={styles.secondaryButton}
        >
          ← Project
        </Link>
      }
    >
      {error ? (
        <div className={styles.errorMessage} role="alert">
          <span>{error}</span>
          {!accessDenied ? (
            <button
              type="button"
              onClick={loadMembersPage}
              disabled={loading}
            >
              Retry
            </button>
          ) : null}
        </div>
      ) : null}

      {notice ? (
        <div
          className={styles.successMessage}
          role="status"
          aria-live="polite"
        >
          {notice}
        </div>
      ) : null}

      {loading ? (
        <section
          className={styles.loadingPanel}
          role="status"
        >
          Loading Project members…
        </section>
      ) : accessDenied ? (
        <section className={styles.accessPanel}>
          <strong>Member management is restricted</strong>
          <p>
            Ask a Project Owner or Admin to manage this
            Project&apos;s memberships.
          </p>
          <Link
            href={`/projects/${projectId}`}
            className={styles.secondaryButton}
          >
            Return to Project
          </Link>
        </section>
      ) : actorRole ? (
        <>
          <div className={styles.statsGrid}>
            <article>
              <span>Total memberships</span>
              <strong>{members.length}</strong>
            </article>
            <article>
              <span>Active</span>
              <strong>{activeCount}</strong>
            </article>
            <article>
              <span>Disabled</span>
              <strong>{disabledCount}</strong>
            </article>
            <article>
              <span>Your role</span>
              <strong>{roleLabel(actorRole)}</strong>
            </article>
          </div>

          <section className={styles.addPanel}>
            <div className={styles.sectionHeading}>
              <div>
                <h2>Add registered User</h2>
                <p>
                  The User must already have an active Central
                  CMS account.
                </p>
              </div>
            </div>

            <form
              className={styles.addForm}
              onSubmit={handleAddMember}
            >
              <label>
                User email
                <input
                  type="email"
                  value={email}
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                  autoComplete="email"
                  maxLength={254}
                  placeholder="member@example.com"
                  required
                />
              </label>

              <label>
                Project role
                <select
                  value={addRole}
                  onChange={(event) =>
                    setAddRole(
                      event.target
                        .value as AssignableProjectRole,
                    )
                  }
                >
                  {assignableRoles.map((role) => (
                    <option key={role} value={role}>
                      {roleLabel(role)}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="submit"
                className={styles.primaryButton}
                disabled={adding}
              >
                {adding ? 'Adding…' : 'Add member'}
              </button>
            </form>
          </section>

          <section className={styles.membersPanel}>
            <div className={styles.sectionHeading}>
              <div>
                <h2>Project members</h2>
                <p>
                  Disabled memberships remain visible for
                  recovery and audit context.
                </p>
              </div>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={loadMembersPage}
                disabled={loading || busyUserId !== null}
              >
                Refresh
              </button>
            </div>

            {members.length === 0 ? (
              <div className={styles.emptyState}>
                No Project memberships were found.
              </div>
            ) : (
              <div className={styles.tableWrapper}>
                <table className={styles.membersTable}>
                  <thead>
                    <tr>
                      <th scope="col">User</th>
                      <th scope="col">Role</th>
                      <th scope="col">Membership</th>
                      <th scope="col">Updated</th>
                      <th scope="col">
                        <span className={styles.srOnly}>
                          Actions
                        </span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((member) => {
                      const manageable = canManage(member);
                      const busy =
                        busyUserId === member.userId;
                      const isSelf =
                        member.userId === user?.id;

                      return (
                        <tr key={member.userId}>
                          <td>
                            <span
                              className={styles.userIdentity}
                            >
                              <strong>{member.name}</strong>
                              <small>{member.email}</small>
                              {member.userStatus ===
                              'disabled' ? (
                                <small
                                  className={
                                    styles.accountWarning
                                  }
                                >
                                  User account disabled
                                </small>
                              ) : null}
                            </span>
                          </td>
                          <td>
                            {manageable &&
                            member.status === 'active' ? (
                              <select
                                className={styles.roleSelect}
                                value={member.role}
                                onChange={(event) =>
                                  void handleRoleChange(
                                    member,
                                    event.target
                                      .value as AssignableProjectRole,
                                  )
                                }
                                disabled={busy}
                                aria-label={`Role for ${member.name}`}
                              >
                                {assignableRoles.map((role) => (
                                  <option
                                    key={role}
                                    value={role}
                                  >
                                    {roleLabel(role)}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span
                                className={styles.roleBadge}
                              >
                                {roleLabel(member.role)}
                              </span>
                            )}
                          </td>
                          <td>
                            <span
                              className={
                                member.status === 'active'
                                  ? styles.activeBadge
                                  : member.status ===
                                      'disabled'
                                    ? styles.disabledBadge
                                    : styles.invitedBadge
                              }
                            >
                              {member.status}
                            </span>
                          </td>
                          <td className={styles.updatedAt}>
                            {formatDate(member.updatedAt)}
                          </td>
                          <td>
                            <div className={styles.rowActions}>
                              {isSelf ? (
                                <span
                                  className={styles.protectedText}
                                >
                                  Current user
                                </span>
                              ) : member.role === 'owner' ? (
                                <span
                                  className={styles.protectedText}
                                >
                                  Protected
                                </span>
                              ) : manageable &&
                                member.status === 'active' ? (
                                <button
                                  type="button"
                                  className={styles.dangerButton}
                                  onClick={() =>
                                    void handleDisable(member)
                                  }
                                  disabled={busy}
                                >
                                  {busy
                                    ? 'Working…'
                                    : 'Disable'}
                                </button>
                              ) : manageable &&
                                member.status === 'disabled' ? (
                                <button
                                  type="button"
                                  className={
                                    styles.secondaryButton
                                  }
                                  onClick={() =>
                                    void handleReactivate(
                                      member,
                                    )
                                  }
                                  disabled={
                                    busy ||
                                    member.userStatus !==
                                      'active'
                                  }
                                >
                                  {busy
                                    ? 'Working…'
                                    : 'Reactivate'}
                                </button>
                              ) : (
                                <span
                                  className={styles.protectedText}
                                >
                                  No actions
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      ) : (
        <section className={styles.accessPanel}>
          Current membership could not be resolved.
        </section>
      )}
    </AppShell>
  );
}
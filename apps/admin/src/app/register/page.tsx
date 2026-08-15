'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  type FormEvent,
  useEffect,
  useState,
} from 'react';

import { useAuth } from '../../features/auth/auth-provider';
import styles from '../auth.module.css';

export default function RegisterPage() {
  const router = useRouter();
  const {
    user,
    loading,
    registerUser,
  } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] =
    useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) {
      router.replace('/dashboard');
    }
  }, [loading, user, router]);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      await registerUser({
        name,
        email,
        password,
      });

      router.replace('/dashboard');
      router.refresh();
    } catch (registerError: unknown) {
      setError(
        registerError instanceof Error
          ? registerError.message
          : 'Registration failed.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || user) {
    return (
      <div className={styles.sessionLoading}>
        Restoring session…
      </div>
    );
  }

  return (
    <main className={styles.page}>
      <section className={styles.brandPanel}>
        <div className={styles.brand}>
          <span className={styles.brandMark}>C</span>
          <span>
            <strong>Central CMS</strong>
            <small>Headless content platform</small>
          </span>
        </div>

        <div className={styles.brandCopy}>
          <p>Create workspace access</p>
          <h1>Build and publish structured content.</h1>
          <p>
            One platform for Schemas, Drafts, Publications and
            secure content APIs.
          </p>
        </div>
      </section>

      <section className={styles.formSide}>
        <div className={styles.card}>
          <h2>Create account</h2>
          <p>Register to access Central CMS.</p>

          <form
            className={styles.form}
            onSubmit={handleSubmit}
          >
            {error ? (
              <div className={styles.error} role="alert">
                {error}
              </div>
            ) : null}

            <label>
              Full name
              <input
                value={name}
                onChange={(event) =>
                  setName(event.target.value)
                }
                autoComplete="name"
                minLength={2}
                maxLength={120}
                required
                autoFocus
              />
            </label>

            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                autoComplete="email"
                maxLength={254}
                required
              />
            </label>

            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                autoComplete="new-password"
                minLength={10}
                maxLength={128}
                required
              />
            </label>

            <label>
              Confirm password
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(event.target.value)
                }
                autoComplete="new-password"
                minLength={10}
                maxLength={128}
                required
              />
            </label>

            <button
              type="submit"
              className={styles.submitButton}
              disabled={submitting}
            >
              {submitting
                ? 'Creating account…'
                : 'Create account'}
            </button>
          </form>

          <p className={styles.switchText}>
            Already registered?{' '}
            <Link href="/login">Sign in</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
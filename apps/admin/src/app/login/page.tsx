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

export default function LoginPage() {
  const router = useRouter();
  const {
    user,
    loading,
    loginUser,
  } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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

    try {
      setSubmitting(true);
      setError(null);

      await loginUser({
        email,
        password,
      });

      router.replace('/dashboard');
      router.refresh();
    } catch (loginError: unknown) {
      setError(
        loginError instanceof Error
          ? loginError.message
          : 'Login failed.',
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
          <p>Content operations</p>
          <h1>Manage structured content with confidence.</h1>
          <p>
            Define Schemas, edit Drafts, Publish safely and
            deliver JSON to every connected application.
          </p>
        </div>
      </section>

      <section className={styles.formSide}>
        <div className={styles.card}>
          <h2>Welcome back</h2>
          <p>Sign in to your CMS workspace.</p>

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
                autoFocus
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
                autoComplete="current-password"
                maxLength={128}
                required
              />
            </label>

            <button
              type="submit"
              className={styles.submitButton}
              disabled={submitting}
            >
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className={styles.switchText}>
            New to Central CMS?{' '}
            <Link href="/register">Create account</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { AppShell } from '../../../../../components/app-shell';
import { JsonSchemaEditor } from '../../../../../features/schema-editor/json-schema-editor';
import { DEFAULT_PAGE_SCHEMA } from '../../../../../features/schema-editor/schema-template';
import {
  getDeliveryUrl,
  getPage,
  getPageSchema,
  savePageSchema,
  validatePageSchema,
} from '../../../../../lib/api';
import type {
  CmsPage,
  PageSchemaState,
  SchemaValidationIssue,
  SchemaValidationResult,
} from '../../../../../lib/types';
import styles from './page.module.css';
import { PageEditorNav } from '../../../../../components/page-editor-nav';

interface SchemaOutlineItem {
  name: string;
  type: string;
  required: boolean;
}

function parseSchema(
  value: string,
): Record<string, unknown> {
  const parsed = JSON.parse(value) as unknown;

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    Array.isArray(parsed)
  ) {
    throw new Error('Schema must be a JSON object.');
  }

  return parsed as Record<string, unknown>;
}

function localIssue(message: string): SchemaValidationIssue {
  return {
    path: '#',
    keyword: 'json',
    message,
  };
}

export default function PageSchemaEditor() {
  const params = useParams<{
    projectId: string;
    pageId: string;
  }>();

  const [page, setPage] = useState<CmsPage | null>(null);
  const [schemaState, setSchemaState] =
    useState<PageSchemaState | null>(null);
  const [editorValue, setEditorValue] = useState('');
  const [savedValue, setSavedValue] = useState('');
  const [validation, setValidation] =
    useState<SchemaValidationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<
    'validate' | 'save' | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(
    null,
  );

  const isDirty = editorValue !== savedValue;

  const deliveryUrl = page
  ? getDeliveryUrl(page.id)
  : null;

  const loadEditor = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      setValidation(null);

      const [pageResult, schemaResult] =
        await Promise.all([
          getPage(params.pageId),
          getPageSchema(params.pageId),
        ]);

      const hasSavedSchema =
        schemaResult.schemaDefinition !== null;
      const formattedSchema = hasSavedSchema
        ? JSON.stringify(
            schemaResult.schemaDefinition,
            null,
            2,
          )
        : DEFAULT_PAGE_SCHEMA;

      setPage(pageResult);
      setSchemaState(schemaResult);
      setEditorValue(formattedSchema);
      setSavedValue(hasSavedSchema ? formattedSchema : '');
    } catch (loadError: unknown) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Page Schema could not be loaded.',
      );
    } finally {
      setLoading(false);
    }
  }, [params.pageId]);

  useEffect(() => {
    void loadEditor();
  }, [loadEditor]);

  useEffect(() => {
    function warnBeforeUnload(event: BeforeUnloadEvent) {
      if (!isDirty) {
        return;
      }

      event.preventDefault();
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

  const outline = useMemo<SchemaOutlineItem[]>(() => {
    try {
      const schema = parseSchema(editorValue);
      const properties = schema.properties;
      const required = Array.isArray(schema.required)
        ? schema.required.filter(
            (value): value is string =>
              typeof value === 'string',
          )
        : [];

      if (
        typeof properties !== 'object' ||
        properties === null ||
        Array.isArray(properties)
      ) {
        return [];
      }

      return Object.entries(properties).map(
        ([name, definition]) => {
          const fieldDefinition =
            typeof definition === 'object' &&
            definition !== null &&
            !Array.isArray(definition)
              ? (definition as Record<string, unknown>)
              : {};

          return {
            name,
            type:
              typeof fieldDefinition.type === 'string'
                ? fieldDefinition.type
                : 'unknown',
            required: required.includes(name),
          };
        },
      );
    } catch {
      return [];
    }
  }, [editorValue]);

  function parseForAction(): Record<string, unknown> | null {
    try {
      setError(null);
      return parseSchema(editorValue);
    } catch (parseError: unknown) {
      const message =
        parseError instanceof Error
          ? parseError.message
          : 'Schema JSON is invalid.';

      setValidation({
        valid: false,
        schemaHash: null,
        errors: [localIssue(message)],
      });
      setError(message);
      return null;
    }
  }

  async function handleValidate() {
    const schemaDefinition = parseForAction();

    if (!schemaDefinition) {
      return;
    }

    try {
      setAction('validate');
      setError(null);
      setSuccess(null);

      const result = await validatePageSchema(
        params.pageId,
        { schemaDefinition },
      );

      setValidation(result);
      setSuccess(
        result.valid
          ? 'Schema is valid and ready to save.'
          : null,
      );
    } catch (validateError: unknown) {
      setError(
        validateError instanceof Error
          ? validateError.message
          : 'Schema validation failed.',
      );
    } finally {
      setAction(null);
    }
  }

  async function handleSave() {
    const schemaDefinition = parseForAction();

    if (!schemaDefinition) {
      return;
    }

    try {
      setAction('save');
      setError(null);
      setSuccess(null);

      const validationResult = await validatePageSchema(
        params.pageId,
        { schemaDefinition },
      );

      setValidation(validationResult);

      if (!validationResult.valid) {
        return;
      }

      const saved = await savePageSchema(params.pageId, {
        schemaDefinition,
      });

      const formatted = JSON.stringify(
        saved.schemaDefinition,
        null,
        2,
      );

      setSchemaState(saved);
      setEditorValue(formatted);
      setSavedValue(formatted);
      setSuccess(
        `Schema version ${saved.schemaVersion} saved successfully.`,
      );
    } catch (saveError: unknown) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Schema could not be saved.',
      );
    } finally {
      setAction(null);
    }
  }

  function handleFormat() {
    const schemaDefinition = parseForAction();

    if (!schemaDefinition) {
      return;
    }

    setEditorValue(
      JSON.stringify(schemaDefinition, null, 2),
    );
  }

  function handleBackClick(
    event: React.MouseEvent<HTMLAnchorElement>,
  ) {
    if (
      isDirty &&
      !window.confirm(
        'You have unsaved Schema changes. Leave anyway?',
      )
    ) {
      event.preventDefault();
    }
  }

  return (
    <AppShell

      title={page?.name ?? 'Page Schema'}
      description="Define the strict JSON structure used by the Content Editor and Delivery API."
      actions={
        <div className={styles.headerActions}>
          {deliveryUrl && page?.visibility === 'public' ? (
            <a
              href={deliveryUrl}
              target="_blank"
              rel="noreferrer"
              className={styles.deliveryButton}
            >
            Open Published API ↗
            </a>
          ) : null}

          <Link
            href={`/projects/${params.projectId}`}
            className={styles.backButton}
            onClick={handleBackClick}
          >
            ← Pages
          </Link>
        </div>
      }
    >
      <PageEditorNav
        projectId={params.projectId}
        pageId={params.pageId}
        active="schema"
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

      {loading ? (
        <div className={styles.loadingCard}>
          Loading Page Schema…
        </div>
      ) : (
        <div className={styles.editorLayout}>
          <section className={styles.editorPanel}>
            <div className={styles.toolbar}>
              <div>
                <p className={styles.eyebrow}>Developer view</p>
                <h2>JSON Schema</h2>
              </div>

              <div className={styles.toolbarActions}>
                <span
                  className={
                    isDirty
                      ? styles.dirtyBadge
                      : styles.savedBadge
                  }
                >
                  {isDirty ? 'Unsaved changes' : 'Saved'}
                </span>

                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={handleFormat}
                  disabled={action !== null}
                >
                  Format
                </button>

                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={handleValidate}
                  disabled={action !== null}
                >
                  {action === 'validate'
                    ? 'Validating…'
                    : 'Validate'}
                </button>

                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={handleSave}
                  disabled={action !== null || !isDirty}
                >
                  {action === 'save'
                    ? 'Saving…'
                    : 'Save Schema'}
                </button>
              </div>
            </div>

            <div className={styles.editorFrame}>
              <JsonSchemaEditor
                value={editorValue}
                onChange={(value) => {
                  setEditorValue(value);
                  setValidation(null);
                  setSuccess(null);
                }}
                readOnly={action !== null}
              />
            </div>
          </section>

          <aside className={styles.sidePanel}>
            <section className={styles.infoCard}>
              <p className={styles.eyebrow}>Schema metadata</p>
              <dl>
                <div>
                  <dt>Version</dt>
                  <dd>{schemaState?.schemaVersion ?? 0}</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>
                    {validation?.valid
                      ? 'Valid'
                      : validation
                        ? 'Invalid'
                        : 'Not validated'}
                  </dd>
                </div>
                <div>
                  <dt>Hash</dt>
                  <dd
                    className={styles.hashValue}
                    title={schemaState?.schemaHash ?? 'Not saved'}
                  >
                    {schemaState?.schemaHash ?? 'Not saved'}
                  </dd>
                </div>
              </dl>
            </section>

            <section className={styles.infoCard}>
              <p className={styles.eyebrow}>Top-level fields</p>
              {outline.length === 0 ? (
                <p className={styles.mutedText}>
                  No readable properties in the current JSON.
                </p>
              ) : (
                <ul className={styles.outlineList}>
                  {outline.map((field) => (
                    <li key={field.name}>
                      <span>
                        <strong>{field.name}</strong>
                        <small>{field.type}</small>
                      </span>
                      {field.required ? (
                        <em>Required</em>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className={styles.infoCard}>
              <p className={styles.eyebrow}>Validation</p>
              {!validation ? (
                <p className={styles.mutedText}>
                  Validate the Schema to see backend results.
                </p>
              ) : validation.valid ? (
                <div className={styles.validResult}>
                  ✓ Schema is valid
                </div>
              ) : (
                <ul className={styles.errorList}>
                  {validation.errors.map((issue, index) => (
                    <li
                      key={`${issue.path}-${issue.keyword}-${index}`}
                    >
                      <strong>{issue.path}</strong>
                      <span>{issue.message}</span>
                      <small>{issue.keyword}</small>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </aside>
        </div>
      )}
    </AppShell>
  );
}
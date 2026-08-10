'use client';

import Form from '@rjsf/core';
import type { IChangeEvent } from '@rjsf/core';
import validator from '@rjsf/validator-ajv8';
import type {
  RegistryWidgetsType,
  WidgetProps,
} from '@rjsf/utils';
import { useMemo } from 'react';

import {
  createUiSchema,
  prepareSchemaForForm,
} from './schema-form-adapter';
import styles from './content-form.module.css';

interface ContentFormProps {
  schemaDefinition: Record<string, unknown>;
  formData: Record<string, unknown>;
  saving: boolean;
  isDirty: boolean;
  onChange: (data: Record<string, unknown>) => void;
  onSubmit: (data: Record<string, unknown>) => void;
}

function ImageUrlWidget(props: WidgetProps) {
  const value =
    typeof props.value === 'string' ? props.value : '';

  return (
    <div className={styles.imageWidget}>
      <input
        id={props.id}
        type="url"
        value={value}
        placeholder="https://cdn.example.com/image.jpg"
        required={props.required}
        disabled={props.disabled || props.readonly}
        onChange={(event) =>
          props.onChange(event.target.value || undefined)
        }
        onBlur={() => props.onBlur(props.id, value)}
        onFocus={() => props.onFocus(props.id, value)}
      />

      {value ? (
        <div className={styles.imagePreview}>
          {/* External URLs are previewed; S3 upload arrives in Part 7. */}
          <img src={value} alt="Content preview" />
        </div>
      ) : null}
    </div>
  );
}

export function ContentForm({
  schemaDefinition,
  formData,
  saving,
  isDirty,
  onChange,
  onSubmit,
}: ContentFormProps) {
  const schema = useMemo(
    () => prepareSchemaForForm(schemaDefinition),
    [schemaDefinition],
  );

  const uiSchema = useMemo(
    () => createUiSchema(schemaDefinition),
    [schemaDefinition],
  );

  const widgets = useMemo<RegistryWidgetsType>(
    () => ({
      ImageUrlWidget,
    }),
    [],
  );

  function handleChange(
    event: IChangeEvent<Record<string, unknown>>,
  ) {
    onChange(event.formData ?? {});
  }

  function handleSubmit(
    event: IChangeEvent<Record<string, unknown>>,
  ) {
    onSubmit(event.formData ?? {});
  }

  return (
    <div className={styles.formContainer}>
      <Form<Record<string, unknown>>
        schema={schema}
        uiSchema={uiSchema}
        validator={validator}
        widgets={widgets}
        formData={formData}
        onChange={handleChange}
        onSubmit={handleSubmit}
        showErrorList={false}
        noHtml5Validate={false}
        liveValidate={false}
        disabled={saving}
      >
        <div className={styles.formActions}>
          <span>
            {isDirty
              ? 'You have unsaved Draft changes.'
              : 'Draft is saved.'}
          </span>
          <button
            type="submit"
            disabled={saving || !isDirty}
          >
            {saving ? 'Saving Draft…' : 'Save Draft'}
          </button>
        </div>
      </Form>
    </div>
  );
}
'use client';

import dynamic from 'next/dynamic';
import type {
  BeforeMount,
  EditorProps,
} from '@monaco-editor/react';

const MonacoEditor = dynamic<EditorProps>(
  () =>
    import('@monaco-editor/react').then(
      (module) => module.default,
    ),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          minHeight: 520,
          display: 'grid',
          placeItems: 'center',
          color: '#7d899e',
          background: '#fbfcfe',
        }}
      >
        Loading Schema Editor…
      </div>
    ),
  },
);

interface JsonSchemaEditorProps {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
}

const configureMonaco: BeforeMount = (monaco) => {
  monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
    validate: true,
    allowComments: false,
    trailingCommas: 'error',
    schemas: [],
  });
};

export function JsonSchemaEditor({
  value,
  onChange,
  readOnly = false,
}: JsonSchemaEditorProps) {
  return (
    <MonacoEditor
      height="540px"
      language="json"
      theme="vs-light"
      value={value}
      beforeMount={configureMonaco}
      onChange={(nextValue) => onChange(nextValue ?? '')}
      options={{
        readOnly,
        minimap: { enabled: false },
        fontSize: 13,
        lineHeight: 21,
        scrollBeyondLastLine: false,
        automaticLayout: true,
        wordWrap: 'on',
        tabSize: 2,
        formatOnPaste: true,
        formatOnType: true,
        bracketPairColorization: { enabled: true },
        padding: {
          top: 14,
          bottom: 14,
        },
      }}
    />
  );
}
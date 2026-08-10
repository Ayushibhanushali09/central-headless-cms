import Link from 'next/link';

import styles from './page-editor-nav.module.css';

interface PageEditorNavProps {
  projectId: string;
  pageId: string;
  active: 'schema' | 'content';
}

export function PageEditorNav({
  projectId,
  pageId,
  active,
}: PageEditorNavProps) {
  const basePath = `/projects/${projectId}/pages/${pageId}`;

  return (
    <nav
      className={styles.navigation}
      aria-label="Page Editor sections"
    >
      <Link
        href={basePath}
        className={
          active === 'schema'
            ? styles.activeItem
            : styles.item
        }
      >
        Schema
      </Link>
      <Link
        href={`${basePath}/content`}
        className={
          active === 'content'
            ? styles.activeItem
            : styles.item
        }
      >
        Content
      </Link>
    </nav>
  );
}
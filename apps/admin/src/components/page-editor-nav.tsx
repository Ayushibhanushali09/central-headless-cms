import Link from 'next/link';

import styles from './page-editor-nav.module.css';

interface PageEditorNavProps {
  projectId: string;
  pageId: string;
  active: 'schema' | 'content' | 'publish';
}

export function PageEditorNav({
  projectId,
  pageId,
  active,
}: PageEditorNavProps) {
  const basePath = `/projects/${projectId}/pages/${pageId}`;

  function itemClass(
    item: PageEditorNavProps['active'],
  ) {
    return active === item
      ? styles.activeItem
      : styles.item;
  }

  return (
    <nav
      className={styles.navigation}
      aria-label="Page Editor sections"
    >
      <Link
        href={basePath}
        className={itemClass('schema')}
      >
        Schema
      </Link>
      <Link
        href={`${basePath}/content`}
        className={itemClass('content')}
      >
        Content
      </Link>
      <Link
        href={`${basePath}/publish`}
        className={itemClass('publish')}
      >
        Publish &amp; API
      </Link>
    </nav>
  );
}
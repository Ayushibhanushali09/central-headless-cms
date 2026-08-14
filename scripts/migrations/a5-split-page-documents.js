const sourceDocuments = db.page_documents.find({});

let processed = 0;
let schemasUpserted = 0;
let draftsUpserted = 0;
let publicationsUpserted = 0;
let missingPages = 0;

sourceDocuments.forEach((source) => {
  const page = db.pages.findOne({ _id: source.pageId });

  if (!page) {
    print(`Missing Page for pageId ${source.pageId}`);
    missingPages += 1;
    return;
  }

  const createdAt = source.createdAt ?? new Date();
  const updatedAt = source.updatedAt ?? createdAt;

  db.page_schemas.updateOne(
    { pageId: source.pageId },
    {
      $set: {
        schemaDefinition: source.schemaDefinition ?? null,
        schemaVersion: source.schemaVersion ?? 0,
        schemaHash: source.schemaHash ?? '',
        updatedBy: null,
        updatedAt,
      },
      $setOnInsert: {
        createdAt,
      },
    },
    { upsert: true },
  );
  schemasUpserted += 1;

  db.page_drafts.updateOne(
    { pageId: source.pageId },
    {
      $set: {
        schemaVersion: source.schemaVersion ?? 0,
        draftData: source.draftData ?? null,
        draftVersion: source.draftVersion ?? 0,
        draftUpdatedAt: source.draftUpdatedAt ?? null,
        updatedBy: null,
        updatedAt,
      },
      $setOnInsert: {
        createdAt,
      },
    },
    { upsert: true },
  );
  draftsUpserted += 1;

  if (
    source.publishedData !== null &&
    source.publishedData !== undefined &&
    (source.publishedVersion ?? 0) > 0
  ) {
    db.page_publications.updateOne(
      { pageId: source.pageId },
      {
        $set: {
          pagePublicId: page.publicId,
          projectId: page.projectId,
          visibility: page.visibility,
          status: 'published',
          publishedData: source.publishedData,
          publishedVersion: source.publishedVersion,
          publishedFromDraftVersion:
            source.publishedFromDraftVersion ??
            source.draftVersion ??
            1,
          schemaHash: source.schemaHash ?? '',
          publishedAt: source.publishedAt ?? updatedAt,
          publishedBy: null,
          updatedAt,
        },
        $setOnInsert: {
          createdAt,
        },
      },
      { upsert: true },
    );
    publicationsUpserted += 1;
  }

  processed += 1;
});

printjson({
  processed,
  schemasUpserted,
  draftsUpserted,
  publicationsUpserted,
  missingPages,
});
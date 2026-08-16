let processed = 0;
let missingOwner = 0;

for (const project of db.projects.find({})) {
  const owner = db.project_members.findOne({
    projectId: project._id,
    role: 'owner',
    status: 'active',
  });

  if (!owner) {
    print(`No active Owner for Project ${project.publicId}`);
    missingOwner += 1;
    continue;
  }

  db.projects.updateOne(
    {
      _id: project._id,
    },
    {
      $set: {
        createdBy: owner.userId,
      },
    },
  );

  processed += 1;
}

printjson({
  processed,
  missingOwner,
  withoutCreatedBy: db.projects.countDocuments({
    createdBy: { $exists: false },
  }),
});
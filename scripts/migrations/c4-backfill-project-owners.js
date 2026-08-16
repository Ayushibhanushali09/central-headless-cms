db.project_members.createIndex(
  {
    projectId: 1,
    userId: 1,
  },
  {
    unique: true,
    name: 'projectId_1_userId_1',
  },
);

db.project_members.createIndex(
  {
    userId: 1,
    status: 1,
    updatedAt: -1,
  },
  {
    name: 'userId_1_status_1_updatedAt_-1',
  },
);

db.project_members.createIndex(
  {
    projectId: 1,
    status: 1,
    role: 1,
  },
  {
    name: 'projectId_1_status_1_role_1',
  },
);

const ownerEmail = process.env.OWNER_EMAIL;

if (!ownerEmail) {
  throw new Error('OWNER_EMAIL is required.');
}

const owner = db.users.findOne({
  email: ownerEmail.trim().toLowerCase(),
  status: 'active',
});

if (!owner) {
  throw new Error(
    `Active User '${ownerEmail}' was not found.`,
  );
}

let processed = 0;

// Current MVP Projects are assigned to the approved initial owner.
db.projects.find({ status: 'active' }).forEach(
  (project) => {
    db.project_members.updateOne(
      {
        projectId: project._id,
        userId: owner._id,
      },
      {
        $set: {
          role: 'owner',
          status: 'active',
          invitedBy: null,
          acceptedAt: new Date(),
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      {
        upsert: true,
      },
    );

    processed += 1;
  },
);

printjson({
  ownerEmail,
  ownerUserId: owner._id,
  processed,
  memberships:
    db.project_members.countDocuments({
      userId: owner._id,
      status: 'active',
    }),
});
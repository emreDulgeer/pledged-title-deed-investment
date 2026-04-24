const {
  connectToDatabase,
  disconnectDatabase,
  getMongoUri,
  resetDatabaseAndStorage,
} = require("./seedSupport");

async function dropDB() {
  await connectToDatabase();

  const { storage } = await resetDatabaseAndStorage({ clearStorage: true });

  console.log(`MongoDB reset completed: ${getMongoUri()}`);
  if (storage.storageType === "minio") {
    console.log(
      `MinIO bucket reset completed: ${storage.bucket} (${storage.clearedObjects} objects removed)`,
    );
  }

  await disconnectDatabase();
}

dropDB().catch(async (error) => {
  console.error("Database reset failed:", error);
  await disconnectDatabase();
  process.exit(1);
});

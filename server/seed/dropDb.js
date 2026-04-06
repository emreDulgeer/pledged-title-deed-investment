const mongoose = require("mongoose");

async function dropDB() {
  await mongoose.connect(
    process.env.MONGODB_URI ||
      process.env.MONGO_URI ||
      "mongodb://localhost:27021/pledged_platform"
  );
  await mongoose.connection.dropDatabase();
  console.log("✅ Veritabanı tamamen silindi.");
  await mongoose.disconnect();
}

dropDB().catch(console.error);

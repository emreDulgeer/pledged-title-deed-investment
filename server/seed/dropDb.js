const mongoose = require("mongoose");

async function dropDB() {
  await mongoose.connect("mongodb://localhost:27017/pledged_platform");
  await mongoose.connection.dropDatabase();
  console.log("✅ Veritabanı tamamen silindi.");
  await mongoose.disconnect();
}

dropDB().catch(console.error);

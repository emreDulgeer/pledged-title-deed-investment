const mongoose = require("mongoose");
const User = require("./User");

const AdminSchema = new mongoose.Schema({
  accessLevel: {
    type: String,
    enum: ["Global", "FinanceOnly", "SupportOnly"],
    default: "Global",
  },
});

module.exports = User.discriminator("Admin", AdminSchema);

// backend/models/notificationModel.js
const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema({
  username: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, default: "other" },
  readStatus: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Notification", NotificationSchema);

// backend/models/notificationModel.js
const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema({
  username: { type: String, required: true }, // The recipient's username
  message: { type: String, required: true },
  type: { type: String, default: "other" }, // e.g., "new_message"
  readStatus: { type: Boolean, default: false },
  deleted: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Notification", NotificationSchema);

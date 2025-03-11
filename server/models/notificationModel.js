const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema({
  username: { type: String, required: true }, // Recipient's username
  message: { type: String, required: true },
  type: { type: String, default: "other" }, // e.g., "new_message"
  readStatus: { type: Boolean, default: false },
  deleted: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now },
  room: { type: String, required: true },
  messageId: { type: mongoose.Schema.Types.ObjectId, ref: "Message" } // Direct reference to Message model
});

// Index username for efficient queries
NotificationSchema.index({ username: 1 });

module.exports = mongoose.model("Notification", NotificationSchema);

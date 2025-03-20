const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema({
  usernames: [{ type: String, required: true }], // Array of unique recipient usernames
  message: { type: String, required: true },
  type: { type: String, default: "other" }, // e.g., "new_message"
  readStatus: { type: Boolean, default: false },
  deleted: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now },
  room: { type: String, required: true },
  messageId: { type: mongoose.Schema.Types.ObjectId, ref: "Message" } // Direct reference to Message model
});

// Middleware to ensure usernames array is unique
NotificationSchema.pre("save", function (next) {
  this.usernames = [...new Set(this.usernames)]; // Remove duplicates
  next();
});

// Index usernames for efficient queries
NotificationSchema.index({ usernames: 1 });

module.exports = mongoose.model("Notification", NotificationSchema);

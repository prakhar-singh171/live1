// models/Message.js
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  username: String,
  room: String,
  message: String,
  file:String,
  timestamp: { type: Date, default: Date.now },
  seenBy: { type: [String], default: [] }, // Array of usernames who have seen the message
});

module.exports = mongoose.model('Message', messageSchema);

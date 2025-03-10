// models/QuickPoll.js
const mongoose = require("mongoose");

const QuickPollSchema = new mongoose.Schema({
  room: { type: String, required: true },
  question: { type: String, required: true },
  options: [
    {
      text: { type: String, required: true },
      votes: { type: Number, default: 0 },
    },
  ],
  createdBy: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  voters: [{ type: String }], // List of users who voted
});

// Export the model
module.exports = mongoose.model("QuickPoll", QuickPollSchema);

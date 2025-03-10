const QuickPoll = require("../models/QuickPoll"); // Correct import path

// Create a new poll

exports.createPoll = async (io, data) => {
  try {
    const { room, username, question, options } = data;

    // Validate data
    if (!room || !username || !question || !options || options.length < 2) {
      console.error("Invalid poll creation data:", data);
      return;
    }


    // Create poll
    const poll = new QuickPoll({
      room,
      question,
      options: options.map((option) => ({ text: option, votes: 0 })),
      createdBy: username,
    });

    await poll.save();

    // Fetch updated polls for the room
    const polls = await QuickPoll.find({ room });

    // Emit updated polls to the room
    io.to(room).emit("polls", polls);
    
    console.log(`Emitted updated polls to room ${room}:`, polls);

  } catch (error) {
    console.error("Error creating poll:", error);
  }
};

  
// Get all polls for a specific room
exports.getPollsForRoom = async (socket, { room }) => {
    try {
      console.log("Fetching polls for room:", room);
  
      // Ensure `room` is a string before querying
      const polls = await QuickPoll.find({ room: String(room) }).sort({ timestamp: -1 });
  
      console.log("Fetched polls:", polls);
  
      // Emit the polls to the client
      socket.emit("polls", polls);
    } catch (error) {
      console.error("Error fetching polls for room:", error);
      socket.emit("error", { message: "Error fetching polls." });
    }
  };
  
// Handle voting
exports.votePoll = async (io, data) => {
  try {
    const { pollId, optionIndex, username, room } = data;

    const poll = await QuickPoll.findById(pollId);

    if (!poll) {
      console.error("Poll not found");
      return;
    }

    // Check if the user has already voted
    if (poll.voters.includes(username)) {
      console.error("User has already voted");
      return;
    }

    // Update the selected option's vote count
    poll.options[optionIndex].votes += 1;
    poll.voters.push(username);

    await poll.save();

    // Emit the updated poll to all users in the room
    const updatedPolls = await QuickPoll.find({ room }).sort({ createdAt: -1 });
    io.to(room).emit("polls", updatedPolls);
    io.to(room).emit("pollCreated", newPoll); // Optional: Emit the new poll for immediate UI update

  } catch (error) {
    console.error("Error handling vote:", error);
  }
};

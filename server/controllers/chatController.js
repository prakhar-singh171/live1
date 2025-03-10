const Message = require('../models/Message'); // Import Message model

// Join room handler
const joinRoomHandler = async (socket, { username, room }) => {
  try {
    socket.join(room);
    socket.data.username = username;

    console.log(`${username} joined room: ${room}`);

    // Send chat history
    const messageHistory = await Message.find({ room });
    console.log(messageHistory);
    socket.emit('messageHistory', { messageHistory });
  } catch (error) {
    console.error('Error in joinRoomHandler:', error);
  }
};

// Send message handler
const sendMessageHandler = async (io, { username, room, message }) => {
  try {
    const newMessage = new Message({ username, room, message });
    const savedMessage=await newMessage.save();

    io.to(room).emit('message', newMessage);
    return savedMessage;
  } catch (error) {
    console.error('Error in sendMessageHandler:', error);
  }
};

// Update message handler
const updateMessageHandler = async (io, { messageId, username, newContent }) => {
  try {
    const message = await Message.findById(messageId);

    if (!message) {
      console.error('Message not found for updating.');
      return;
    }

    if (message.username !== username) {
      console.error('Unauthorized: Only the author can update this message.');
      return;
    }

    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    if (message.timestamp < tenMinutesAgo) {
      console.error('Edit window expired.');
      return;
    }

    message.message = newContent;
    await message.save();

    io.to(message.room).emit('messageUpdated', {
      messageId: message._id.toString(),
      newMessage: message.message,
    });
  } catch (error) {
    console.error('Error updating message:', error);
  }
};

// Delete message handler
const deleteMessageHandler = async (io, { messageId, username, isAdmin }) => {
    try {
        const { messageId, username, isAdmin } = req.body;
    
        // Find the message by ID
        const message = await Message.findById(messageId);
    
        if (!message) {
          return res.status(404).json({ error: "Message not found." });
        }
    
        // Check if the user is the sender or an admin
        if (message.username !== username && !isAdmin) {
          return res
            .status(403)
            .json({ error: "You are not authorized to delete this message." });
        }
    
        // Check if the message was sent less than 10 minutes ago
        const now = new Date();
        const tenMinutesAgo = new Date(now - 10 * 60 * 1000); // 10 minutes in milliseconds
        if (message.timestamp < tenMinutesAgo) {
          return res.status(400).json({
            error: "You can only delete messages sent within the last 10 minutes.",
          });
        }
    
        // Perform the delete
        await message.deleteOne();
    
        return res
          .status(200)
          .json({ success: true, message: "Message deleted successfully." });
  } catch (error) {
    console.error('Error deleting message:', error);
  }
};

const markMessageAsSeen = async (socket, { messageId, username }) => {
    try {
      const message = await Message.findById(messageId);
  
      if (!message) {
        console.error('Message not found for marking as seen.');
        return;
      }
  
      if (!message.seenBy.includes(username)) {
        message.seenBy.push(username);
        await message.save();
  
        // Emit an event to notify others in the room
        socket.to(message.room).emit('messageSeen', {
          messageId: message._id.toString(),
          seenBy: message.seenBy,
        });
      }
    } catch (error) {
      console.error('Error marking message as seen:', error);
    }
  };


  const markMessagesSeenHandler = async (socket, data, io) => {
    const { room, username } = data;
    try {
      // Update messages in the room where the user hasn't seen them yet
      await Message.updateMany(
        { room, seenBy: { $ne: username } }, // Messages not seen by this user
        { $addToSet: { seenBy: username } } // Add the user to the seenBy array
      );
  
      // Fetch the updated chat history for the room
      const updatedChatHistory = await Message.find({ room }).sort({ _id: 1 });
  
      // Emit the updated chat history to all clients in the room
      io.to(room).emit('chat_history', updatedChatHistory);
    } catch (error) {
      console.error('Error marking messages as seen:', error);
      socket.emit('error', { message: 'Error marking messages as seen.' });
    }
  };


module.exports = {
  joinRoomHandler,
  sendMessageHandler,
  updateMessageHandler,
  deleteMessageHandler,
  markMessagesSeenHandler,
};

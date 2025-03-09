const Message = require('../models/Message'); // Import Message model

// Join room handler
const joinRoomHandler = async (socket, { username, room }) => {
  try {
    socket.join(room);
    console.log(`${username} joined room: ${room}`);

    // Send chat history
    const messageHistory = await Message.find({ room });
    socket.emit('messageHistory', { messageHistory });
  } catch (error) {
    console.error('Error in joinRoomHandler:', error);
  }
};

// Send message handler
const sendMessageHandler = async (io, { username, room, message }) => {
  try {
    const newMessage = new Message({ username, room, message });
    await newMessage.save();

    io.to(room).emit('message', newMessage);
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
    const message = await Message.findById(messageId);

    if (!message) {
      console.error('Message not found for deletion.');
      return;
    }

    if (message.username !== username && !isAdmin) {
      console.error('Unauthorized: Only the author or an admin can delete this message.');
      return;
    }

    await Message.findByIdAndDelete(messageId);

    io.to(message.room).emit('messageDeleted', messageId);
  } catch (error) {
    console.error('Error deleting message:', error);
  }
};

module.exports = {
  joinRoomHandler,
  sendMessageHandler,
  updateMessageHandler,
  deleteMessageHandler,
};

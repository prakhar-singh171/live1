const Message = require('../models/Message');

/**
 * Get chat history for a specific room
 */
exports.getChatHistory = async (socket, io, { username, room }) => {
  socket.join(room);

  try {
    const messageHistory = await Message.find({ room }).sort({ timestamp: 1 });
    console.log(messageHistory);
    socket.emit('messageHistory', messageHistory);

    socket.to(room).emit('message', {
      username: 'System',
      message: `${username} has joined the room.`,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Error fetching message history:', error);
  }
};

/**
 * Send a new message
 */
exports.sendMessage = async (io, { username, room, message }) => {
  const newMessage = new Message({ room, username, message });

  try {
    await newMessage.save();
    io.to(room).emit('message', {
      id: newMessage._id, // Include the ID for edit/delete
      username,
      message,
      timestamp: newMessage.timestamp,
    });
  } catch (error) {
    console.error('Error saving message:', error);
  }
};

/**
 * Update an existing message
 */
exports.updateMessage = async (io, { messageId, username, newContent }) => {
  try {
    console.log(username,messageId,newContent);

    const message = await Message.findById(messageId);

    if (!message) {
      console.error('Message not found for updating.');
      return;
    }

    // Check if the user is the author of the message
    if (message.username !== username) {
      console.error('Unauthorized: Only the author can update this message.');
      return;
    }

    // Check if the message is within the 10-minute edit window
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    if (message.timestamp < tenMinutesAgo) {
      console.error('Edit window expired: Messages can only be edited within 10 minutes.');
      return;
    }

    // Update the message content
    message.message = newContent;
    await message.save();
    console.log(message,typeof message.room);

    io.to(message.room).emit('messageUpdated', {
        messageId: messageId.toString(), // Convert MongoDB ObjectId to string
        newMessage: message.message,
        timestamp: message.timestamp,
      });
      
  } catch (error) {
    console.error('Error updating message:', error);
  }
};

/**
 * Delete a message
 */
exports.deleteMessage = async (io, { messageId, username, isAdmin }) => {
  try {
    console.log(username,messageId,isAdmin);
    const message = await Message.findById(messageId);

    if (!message) {
      console.error('Message not found for deletion.');
      return;
    }

    // Allow deletion only if the user is the author or an admin
    if (message.username !== username && !isAdmin) {
      console.error('Unauthorized: Only the author or an admin can delete this message.');
      return;
    }

    await Message.findByIdAndDelete(messageId);
    console.log(message.room,message.id);
    console.log(typeof message.room)
    io.to(message.room).emit('messageDeleted', messageId.toString()); // Ensure ID is a string
} catch (error) {
    console.error('Error deleting message:', error);
  }
};

/**
 * Handle user disconnect
 */
exports.disconnect = () => {
  console.log('User disconnected.');
};

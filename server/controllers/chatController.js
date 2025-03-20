const Message = require('../models/Message'); // Import Message model
const cloudinary = require('../config/cloudinary');

// Join room handler
const joinRoomHandler = async (socket, { username, room }) => {
  try {
    socket.join(room);
    socket.data.username = username;

    console.log(`${username} joined room: ${room}`);

    // Send chat history
    const messageHistory = await Message.find({ room });
   // console.log(messageHistory);
    socket.emit('messageHistory', { messageHistory });
  } catch (error) {
    console.error('Error in joinRoomHandler:', error);
  }
};

// Send message handler
const sendMessageHandler = async (io, { username, room, message, file }) => {
  try {
    let fileUrl = null;


    if (file) {
      
        const uploadedFile = await cloudinary.uploader.upload(file, {
          resource_type: "auto", 
        });
        fileUrl = uploadedFile.secure_url; 
        console.log("File uploaded successfully:", fileUrl);
     
    }

    const newMessage = new Message({ username, room, message,file:fileUrl });
    const savedMessage=await newMessage.save();

    io.to(room).emit('message', newMessage);
    return savedMessage;
    console.log("Message sent:", { username, message, fileUrl });
  } catch (error) {
    console.error("Error in sendMessageHandler:", error);
    io.to(room).emit("error", { message: error.message });
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
const deleteMessageHandler = async (io, { messageId, username }, socket) => {
  try {
    const message = await Message.findById(messageId);

    if (!message) {
      return socket.emit("error", { message: "Message not found" });
    }

    // Check if the message can be deleted (e.g., within 10 minutes of sending)
    const timeDifference = new Date() - new Date(message.timestamp);
    if (timeDifference > 10 * 60 * 1000) {
      return socket.emit("error", { message: "Cannot delete a message after 10 minutes." });
    }

    // Check if the user is allowed to delete the message
    if (message.username !== username) {
      return socket.emit("error", { message: "You are not authorized to delete this message." });
    }

    // Delete the message
    await Message.findByIdAndDelete(messageId);

    // Notify the room about the deleted message
    io.to(message.room).emit("messageDeleted", messageId);
  } catch (error) {
    console.error("Error deleting message:", error);
    socket.emit("error", { message: "Error deleting message", error });
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
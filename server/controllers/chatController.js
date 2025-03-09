const Message = require('../models/Message');

// Controller functions for chat-related operations
const chatController = {
  /**
   * Handles a user joining a chat room.
   * @param {object} socket - The connected Socket.IO client.
   * @param {object} io - The Socket.IO server instance.
   * @param {object} data - Data containing username and room information.
   */
  async joinRoom(socket, io, { username, room }) {
    socket.join(room);

    try {
      // Fetch message history and send to the client
      const messageHistory = await Message.find({ room }).sort({ timestamp: 1 });
      socket.emit('messageHistory', messageHistory);

      // Notify others in the room about the new user
      socket.to(room).emit('message', {
        username: 'System',
        message: `${username} has joined the room.`,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Error fetching message history:', error);
    }
  },

  /**
   * Handles sending a message.
   * @param {object} io - The Socket.IO server instance.
   * @param {object} data - Data containing username, room, and message.
   */
  async sendMessage(io, { username, room, message }) {
    const newMessage = new Message({ room, username, message });

    try {
      await newMessage.save();

      // Broadcast the new message to the room
      io.to(room).emit('message', {
        username,
        message,
        timestamp: newMessage.timestamp,
      });
    } catch (error) {
      console.error('Error saving message:', error);
    }
  },

  /**
   * Handles a user disconnecting.
   */
  disconnect() {
    console.log('User disconnected.');
  },
};

module.exports = chatController;

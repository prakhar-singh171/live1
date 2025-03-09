const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
      origin: 'http://localhost:5173', // Update to match your frontend URL
      methods: ['GET', 'POST'],
      credentials: true, // Allow cookies if needed
    },
  });
  
// MongoDB connection
require('dotenv').config();
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
mongoose.connection.on('connected', () => {
    console.log('Connected to MongoDB successfully.');
  });
  
  mongoose.connection.on('error', (err) => {
    console.error('Error connecting to MongoDB:', err);
  });
  
const messageSchema = new mongoose.Schema({
  username: String,
  room: String,
  message: String,
  timestamp: { type: Date, default: Date.now },
});

const Message = mongoose.model('Message', messageSchema);

// Socket.IO
io.on('connection', (socket) => {
  console.log('A user connected');

  // Join a room
  socket.on('joinRoom', async ({ username, room }) => {
    socket.join(room);
    console.log(`${username} joined room: ${room}`);

    // Send chat history
    const messageHistory = await Message.find({ room });
    socket.emit('messageHistory', { messageHistory });
  });

  // Send a message
  socket.on('sendMessage', async ({ username, room, message }) => {
    const newMessage = new Message({ username, room, message });
    await newMessage.save();

    io.to(room).emit('message', newMessage);
  });

  // Update a message
  socket.on('updateMessage', async ({ messageId, username, newContent }) => {
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
  });

  // Delete a message
  socket.on('deleteMessage', async ({ messageId, username, isAdmin }) => {
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
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });
});

// Start server
const PORT = 3000;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

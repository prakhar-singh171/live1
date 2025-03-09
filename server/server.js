const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const {
  joinRoomHandler,
  sendMessageHandler,
  updateMessageHandler,
  deleteMessageHandler,
  markMessagesSeenHandler, // Import the new handler
} = require('./controllers/chatController'); // Importing controllers

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173', // Replace with your frontend URL
    methods: ['GET', 'POST'],
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

// Socket.IO
io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on('joinRoom', (data) => joinRoomHandler(socket, data));
  socket.on('sendMessage', (data) => sendMessageHandler(io, data));
  socket.on('updateMessage', (data) => updateMessageHandler(io, data));
  socket.on('deleteMessage', (data) => deleteMessageHandler(io, data));
  socket.on('mark_seen', (data) => markMessagesSeenHandler(socket, data, io)); // Added handler for marking messages as seen

  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });
});

// Start server
const PORT = 3000;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

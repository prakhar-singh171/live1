const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const path = require("path");

const {
  joinRoomHandler,
  sendMessageHandler,
  updateMessageHandler,
  deleteMessageHandler,
  markMessagesSeenHandler,
} = require('./controllers/chatController');
const {
  createPoll,
  getPollsForRoom,
  votePoll,
} = require("./controllers/pollController");

const app = express();
const server = http.createServer(app);

app.use(express.static(path.join(__dirname, "client/build")));

app.get("*", (req, res) => {
  res.sendFile(path.resolve(__dirname, "client/build", "index.html"));
});
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173',
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

  // Handlers for chat
  socket.on('joinRoom', (data) => joinRoomHandler(socket, data));
  socket.on('sendMessage', (data) => sendMessageHandler(io, data));
  socket.on('updateMessage', (data) => updateMessageHandler(io, data));
  socket.on('deleteMessage', (data) => deleteMessageHandler(io, data));
  socket.on('mark_seen', (data) => markMessagesSeenHandler(socket, data, io));

  // Handlers for polls
  socket.on("createPoll", (data) => {
    if (!io) {
        console.error("Socket.IO (io) instance is undefined.");
        return;
      }
      
    console.log("Received createPoll request:", data);
    createPoll(io, data);
  });

  socket.on("getPolls", (room) => {
    console.log("Fetching polls for room:", room);
    getPollsForRoom(socket, room);
  });

  socket.on("votePoll", (data) => {
    console.log("Processing vote for poll:", data);
    votePoll(io, data);
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });
});

// Start server
const PORT = 3000;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

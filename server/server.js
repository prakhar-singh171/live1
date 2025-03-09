require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const connectDB = require('./config/db');
const chatController = require('./controllers/chatController');

// Initialize app and server
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// Middleware
app.use(cors());
app.use(express.json());

// Environment variables
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
connectDB();

// Socket.IO Event Handling
io.on('connection', (socket) => {
  console.log('New user connected.');

  socket.on('joinRoom', (data) => chatController.joinRoom(socket, io, data));
  socket.on('sendMessage', (data) => chatController.sendMessage(io, data));
  socket.on('disconnect', () => chatController.disconnect());
});

// API Endpoint for health check
app.get('/', (req, res) => res.send('TalkSpace server is running.'));

// Start server
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

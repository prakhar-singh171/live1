require('dotenv').config(); // Load environment variables
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');

// Initialize app and server
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// Middleware
app.use(cors());
app.use(express.json());

// Environment variables
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

// Connect to MongoDB
mongoose
  .connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

// MongoDB Schema and Model
const messageSchema = new mongoose.Schema({
  room: String,
  username: String,
  message: String,
  timestamp: { type: Date, default: Date.now },
});
const Message = mongoose.model('Message', messageSchema);

// Socket.IO Event Handling
io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on('joinRoom', async ({ username, room }) => {
    socket.join(room);

    // Send message history
    const messageHistory = await Message.find({ room }).sort({ timestamp: 1 });
    socket.emit('messageHistory', messageHistory);

    // Notify others
    socket.to(room).emit('message', {
      username: 'System',
      message: `${username} has joined the room.`,
    });
  });

  socket.on('sendMessage', async ({ username, room, message }) => {
    const newMessage = new Message({ room, username, message });
    await newMessage.save();

    io.to(room).emit('message', { username, message });
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });
});

// API Endpoint for health check
app.get('/', (req, res) => res.send('TalkSpace server is running.'));

// Start server
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

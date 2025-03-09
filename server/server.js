require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const connectDB = require('./config/db');
const chatController = require('./controllers/chatController');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Connect to MongoDB
connectDB();

// Socket.IO Event Handling
io.on('connection', (socket) => {
  console.log('New user connected.');

  socket.on('joinRoom', (data) => chatController.getChatHistory(socket, io, data)); // Renamed to getChatHistory
  socket.on('sendMessage', (data) => chatController.sendMessage(io, data));
  socket.on('updateMessage', (data) => chatController.updateMessage(io, data));
  socket.on('deleteMessage', (data) => chatController.deleteMessage(io, data));
  socket.on('disconnect', () => chatController.disconnect());
  socket.on('leaveRoom', ({ username, room }) => {
    socket.leave(room);
    io.to(room).emit('message', {
      username: 'System',
      message: `${username} has left the room.`,
      timestamp: new Date(),
    });
  });
  
});

app.get('/', (req, res) => res.send('TalkSpace server is running.'));

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

const express = require('express');
const cors = require('cors'); // Import CORS
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const path = require("path");
const Notification =require("./models/notificationModel.js")
require('dotenv').config();

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
const { sendNotification } = require("./controllers/notificationController.js");

const app = express();

// Use CORS middleware with appropriate options

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "http://localhost:5173");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  next();
});

app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
}));

app.use(express.json());

// Mount API routes (notifications routes) BEFORE static files
const notificationRoutes = require("./routes/notificationRoutes.js");
app.use("/api/notifications", notificationRoutes);

// Serve static files from client/build
app.use(express.static(path.join(__dirname, "client/build")));
app.get("*", (req, res) => {
  res.sendFile(path.resolve(__dirname, "client/build", "index.html"));
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

// MongoDB connection
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

// Socket.IO events
io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on('joinRoom', (data) => joinRoomHandler(socket, data));
  socket.on("sendMessage", async (data) => {
    // Data contains { room, username, message }
    const savedMessage = await sendMessageHandler(io, data); // Ensure this returns the saved message with _id
    if (!savedMessage || !savedMessage._id) {
      console.error("sendMessageHandler did not return a valid message:", savedMessage);
      return;
    }
  
    try {
      // Get all socket connections in the room
      const socketsInRoom = await io.in(data.room).fetchSockets();
      const notifiedUsernames = new Set();
  
      for (const s of socketsInRoom) {
        const recipient = s.data.username; // Ensure this is set when the user joins
        // Only send a notification if:
        // - The recipient is defined
        // - The recipient is not the sender
        // - We haven't already notified that recipient
        if (recipient && recipient !== data.username && !notifiedUsernames.has(recipient)) {
          const notification = await sendNotification(
            recipient,
            `${data.username} sent a new message in room no : ${data.room}.`,
            "new_message",
            savedMessage._id, // Pass the message id for reference
            data.room
          );
          s.emit("notification", notification);
          notifiedUsernames.add(recipient);
        }
      }
    } catch (error) {
      console.error("Notification error:", error);
    }
  });

  socket.on('updateMessage', (data) => updateMessageHandler(io, data));
  socket.on('deleteMessage', (data) => deleteMessageHandler(io, data));
  socket.on('mark_seen', (data) => markMessagesSeenHandler(socket, data, io));
  
  socket.on("createPoll", (data) => {
    if (!io) {
      console.error("Socket.IO (io) instance is undefined.");
      return;
    }
    console.log("Received createPoll request:", data);
    createPoll(io, data);
  });
  socket.on("getPolls", (data) => {
    console.log("Fetching polls for room:", data.room);
    getPollsForRoom(socket, data);
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
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

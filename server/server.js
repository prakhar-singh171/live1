const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config();

const Notification = require("./models/notificationModel.js");
const {
  joinRoomHandler,
  sendMessageHandler,
  updateMessageHandler,
  deleteMessageHandler,
  markMessagesSeenHandler,
} = require("./controllers/chatController");
const {
  createPoll,
  getPollsForRoom,
  votePoll,
} = require("./controllers/pollController");
const { sendNotification } = require("./controllers/notificationController.js");

const app = express();

// CORS configuration
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "http://localhost:5173");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  next();
});
app.use(
  cors({
    origin: "",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  })
);

app.use(express.json());

// Notification routes
const notificationRoutes = require("./routes/notificationRoutes.js");
app.use("/api/notifications", notificationRoutes);

// Serve static files
app.use(express.static(path.join(__dirname, "client/build")));
app.get("*", (req, res) => {
  res.sendFile(path.resolve(__dirname, "client/build", "index.html"));
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
mongoose.connection.on("connected", () => {
  console.log("Connected to MongoDB successfully.");
});
mongoose.connection.on("error", (err) => {
  console.error("Error connecting to MongoDB:", err);
});

// Helper function to notify users in a room and emit sound event
const notifyUsersInRoom = async (io, room, senderUsername, message, type, messageId = null) => {
  try {
    const socketsInRoom = await io.in(room).fetchSockets();
    const notifiedUsernames = new Set();

    for (const socket of socketsInRoom) {
      const recipient = socket.data.username;

      if (recipient && recipient !== senderUsername && !notifiedUsernames.has(recipient)) {
        const notification = await sendNotification(
          recipient,
          message,
          type,
          messageId,
          room
        );
        socket.emit("notification", notification);
        // Emit the "playNotificationSound" event to play the sound on each connected tab
        socket.emit("playNotificationSound");

        notifiedUsernames.add(recipient);
      }
    }
  } catch (error) {
    console.error("Error notifying users in room:", error);
  }
};

// Socket.IO events
io.on("connection", (socket) => {
  console.log("A user connected");

  // Join room
  socket.on("joinRoom", (data) => joinRoomHandler(socket, data));

  // Send message
  socket.on("sendMessage", async (data) => {
    const savedMessage = await sendMessageHandler(io, data);
    if (!savedMessage || !savedMessage._id) {
      console.error("sendMessageHandler did not return a valid message:", savedMessage);
      return;
    }

    try {
      const messageNotification = `${data.username} sent a new message in room no: ${data.room}.`;
      await notifyUsersInRoom(io, data.room, data.username, messageNotification, "new_message", savedMessage._id);
    } catch (error) {
      console.error("Notification error:", error);
    }
  });

  // Update message
  socket.on("updateMessage", (data) => updateMessageHandler(io, data));

  // Delete message
  socket.on("deleteMessage", (data) => deleteMessageHandler(io, data));

  // Mark messages as seen
  socket.on("mark_seen", (data) => markMessagesSeenHandler(socket, data, io));

  // Create poll
  socket.on("createPoll", async (data) => {
    if (!io) {
      console.error("Socket.IO (io) instance is undefined.");
      return;
    }

    try {
      const newPoll = await createPoll(io, data);

      if (!newPoll) {
        console.error("createPoll did not return a valid poll:", newPoll);
        return;
      }

      const pollNotification = `${data.username} created a new poll in room no: ${data.room}.`;
      await notifyUsersInRoom(io, data.room, data.username, pollNotification, "new_poll");

      io.to(data.room).emit("pollCreated", newPoll);
    } catch (error) {
      console.error("Error creating poll and sending notifications:", error);
    }
  });

  // Fetch polls
  socket.on("getPolls", (data) => {
    console.log("Fetching polls for room:", data.room);
    getPollsForRoom(socket, data);
  });

  // Vote on poll
  socket.on("votePoll", (data) => {
    console.log("Processing vote for poll:", data);
    votePoll(io, data);
  });

  socket.on("disconnect", () => {
    console.log("A user disconnected");
  });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
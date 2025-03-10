import React, { useState, useEffect } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import ChatPage from "./ChatPage";
import PollsPage from "./PollsPage";
import NotificationsPanel from "./NotificationsPanel";
import { io } from "socket.io-client";

// Create a single socket instance
const socket = io("http://localhost:3000");

export default function App() {
  const [room, setRoom] = useState(() => localStorage.getItem("room") || "");
  const [username, setUsername] = useState(() => localStorage.getItem("username") || "");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  const navigate = useNavigate();

  // On mount, check if the user is already logged in via localStorage
  useEffect(() => {
    const storedRoom = localStorage.getItem("room");
    const storedUsername = localStorage.getItem("username");
    if (storedRoom && storedUsername) {
      setRoom(storedRoom);
      setUsername(storedUsername);
      setIsLoggedIn(true);
      socket.emit("joinRoom", { username: storedUsername, room: storedRoom });
    }
  }, []);

  // When logged in, you might also mark messages as seen
  useEffect(() => {
    if (isLoggedIn) {
      socket.emit("mark_seen", { room, username });
    }
  }, [isLoggedIn, room, username]);

  const handleJoinRoom = () => {
    if (username && room) {
      localStorage.setItem("room", room);
      localStorage.setItem("username", username);
      setIsLoggedIn(true);
      socket.emit("joinRoom", { username, room });
    }
  };

  const handleLeaveRoom = () => {
    socket.emit("leaveRoom", { username, room });
    localStorage.removeItem("room");
    localStorage.removeItem("username");
    setRoom("");
    setUsername("");
    setIsLoggedIn(false);
    navigate("/");
  };

  const handleNavigateToPolls = () => {
    navigate("/polls");
  };

  const handleBackToChat = () => {
    navigate("/");
    socket.emit("joinRoom", { username, room });

  };

  if (!isLoggedIn) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="bg-white p-6 rounded-lg shadow-lg w-80">
          <h1 className="text-2xl font-bold mb-4 text-center">Join TalkSpace</h1>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full mb-3 p-2 border rounded-md"
          />
          <input
            type="text"
            placeholder="Room Name"
            value={room}
            onChange={(e) => setRoom(e.target.value)}
            className="w-full mb-3 p-2 border rounded-md"
          />
          <button
            onClick={handleJoinRoom}
            className="w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600"
          >
            Join Room
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* NotificationsPanel is mounted at the top level to listen for notifications */}
      <NotificationsPanel username={username} socket={socket} />
      <Routes>
        <Route
          path="/"
          element={
            <ChatPage
            key={room + username}
              socket={socket}
              room={room}
              username={username}
              handleLeaveRoom={handleLeaveRoom}
              handleNavigateToPolls={handleNavigateToPolls}
            />
          }
        />
        <Route
          path="/polls"
          element={
            <PollsPage
              socket={socket}
              room={room}
              username={username}
              onBackToChat={handleBackToChat}
            />
          }
        />
      </Routes>
    </>
  );
}

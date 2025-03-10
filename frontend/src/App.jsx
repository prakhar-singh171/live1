import React, { useState, useEffect } from "react";
import { Routes, Route, Link, useNavigate } from "react-router-dom";
import PollsPage from "./PollsPage"; // Import PollsPage component
import { io } from "socket.io-client";

const socket = io("http://localhost:3000"); // Replace with your backend URL

export default function App() {
  const [room, setRoom] = useState(() => localStorage.getItem("room") || "");
  const [username, setUsername] = useState(() => localStorage.getItem("username") || "");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editText, setEditText] = useState("");
  const navigate = useNavigate(); // For navigation

  useEffect(() => {
    const storedUsername = localStorage.getItem("username");
    const storedRoom = localStorage.getItem("room");

    if (storedUsername && storedRoom) {
      setUsername(storedUsername);
      setRoom(storedRoom);
      setIsLoggedIn(true);

      socket.emit("joinRoom", { username: storedUsername, room: storedRoom });
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      socket.emit("mark_seen", { room, username });
    }
  }, [isLoggedIn, room, username]);

  useEffect(() => {
    socket.on("message", (newMessage) => {
      setMessages((prevMessages) => [...prevMessages, newMessage]);
    });

    socket.on("chat_history", (updatedMessages) => {
      setMessages(updatedMessages);
    });

    socket.on("messageUpdated", ({ messageId, newMessage }) => {
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg._id === messageId ? { ...msg, message: newMessage } : msg
        )
      );
    });

    socket.on("messageDeleted", (messageId) => {
      setMessages((prevMessages) =>
        prevMessages.filter((msg) => msg._id !== messageId)
      );
    });

    socket.on("messageSeenUpdate", (updatedMessages) => {
      setMessages(updatedMessages);
    });

    return () => {
      socket.off("message");
      socket.off("chat_history");
      socket.off("messageUpdated");
      socket.off("messageDeleted");
      socket.off("messageSeenUpdate");
    };
  }, []);

  const handleJoinRoom = () => {
    if (username && room) {
      socket.emit("joinRoom", { username, room });
      setIsLoggedIn(true);
      localStorage.setItem("room", room);
      localStorage.setItem("username", username);
    }
  };

  const handleSendMessage = () => {
    if (message.trim()) {
      socket.emit("sendMessage", { username, room, message });
      setMessage("");
    }
  };

  const handleLeaveRoom = () => {
    socket.emit("leaveRoom", { username, room });
    setRoom("");
    setMessages([]);
    localStorage.removeItem("room");
    localStorage.removeItem("username");
    setIsLoggedIn(false);
    setUsername("");
  };

  const handleEditMessage = (msg) => {
    setEditingMessageId(msg._id);
    setEditText(msg.message);
  };

  const handleSaveEdit = (messageId) => {
    if (editText.trim()) {
      socket.emit("updateMessage", { messageId, username, newContent: editText });
      setEditingMessageId(null);
      setEditText("");
    }
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditText("");
  };

  const handleDeleteMessage = (messageId) => {
    socket.emit("deleteMessage", { messageId, username, isAdmin: username === "admin" });
  };

  const handleNavigateToPolls = () => {
    navigate("/polls");
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
    <Routes>
      <Route
        path="/"
        element={
          <div className="flex h-screen items-center justify-center bg-gray-100">
            <div className="bg-white shadow-lg rounded-lg w-full max-w-lg h-[80vh] flex flex-col">
              <header className="bg-blue-600 text-white p-4 rounded-t-lg flex justify-between items-center">
                <h1 className="text-lg font-bold">TalkSpace - Room: {room}</h1>
                <button
                  onClick={handleLeaveRoom}
                  className="text-sm bg-red-500 py-1 px-3 rounded-md hover:bg-red-600"
                >
                  Leave
                </button>
              </header>

              <main className="flex-grow overflow-y-scroll p-4 bg-gray-50">
                <div className="flex flex-col gap-4">
                  {messages.map((msg) => {
                    const isAuthor = msg.username === username;
                    const canEdit =
                      isAuthor &&
                      new Date() - new Date(msg.timestamp) <= 10 * 60 * 1000; // 10-minute edit window
                    const canDelete = isAuthor || username === "admin";

                    return (
                      <div
                        key={msg._id}
                        className={`relative max-w-md rounded-lg p-4 ${
                          isAuthor
                            ? "bg-green-200 self-end text-right"
                            : "bg-gray-100 self-start text-left"
                        }`}
                      >
                        {editingMessageId === msg._id ? (
                          <>
                            <textarea
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              className="w-full p-2 border rounded-md"
                            />
                            <div className="flex justify-end gap-2 mt-2">
                              <button
                                onClick={() => handleSaveEdit(msg._id)}
                                className="text-xs bg-green-500 py-1 px-2 rounded-md text-white hover:bg-green-600"
                              >
                                Save
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="text-xs bg-gray-500 py-1 px-2 rounded-md text-white hover:bg-gray-600"
                              >
                                Cancel
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <p className="text-sm font-medium">{msg.message}</p>
                            <div className="text-xs text-gray-500 mt-1">
                              Sent by <strong>{msg.username}</strong> at{" "}
                              {new Date(msg.timestamp).toLocaleString()}
                            </div>
                            <div className="text-xs text-gray-400 mt-1">
                              Seen by:{" "}
                              {msg.seenBy && msg.seenBy.length > 0
                                ? msg.seenBy.join(", ")
                                : "No one"}
                            </div>
                            <div className="flex justify-end gap-2 mt-2">
                              {canEdit && (
                                <button
                                  onClick={() => handleEditMessage(msg)}
                                  className="text-xs bg-yellow-500 py-1 px-2 rounded-md text-white hover:bg-yellow-600"
                                >
                                  Edit
                                </button>
                              )}
                              {canDelete && (
                                <button
                                  onClick={() => handleDeleteMessage(msg._id)}
                                  className="text-xs bg-red-500 py-1 px-2 rounded-md text-white hover:bg-red-600"
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </main>

              <footer className="bg-white p-4 flex gap-2 rounded-b-lg">
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="flex-grow p-2 border rounded-md"
                />
                <button
                  onClick={handleSendMessage}
                  className="bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600"
                >
                  Send
                </button>
                <button
                  onClick={handleNavigateToPolls}
                  className="bg-purple-500 text-white py-2 px-4 rounded-md hover:bg-purple-600"
                  aria-label="Navigate to Polls Page"
                >
                  Polls
                </button>
              </footer>
            </div>
          </div>
        }
      />
      <Route path="/polls" element={<PollsPage room={room} username={username} />} />
    </Routes>
  );
}

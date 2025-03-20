import React, { useState, useEffect, useRef } from "react";
import axios from "axios";

export default function ChatPage({
  socket,
  room,
  username,
  handleLeaveRoom,
  handleNavigateToPolls,
}) {
  const [message, setMessage] = useState("");
  const [file, setFile] = useState(null);
  const [messages, setMessages] = useState([]);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editText, setEditText] = useState("");
  const chatEndRef = useRef(null);

  // Set up Socket.IO listeners
  useEffect(() => {
    const handleReceiveMessage = (newMessage) => {
      setMessages((prev) => [...prev, newMessage]);
    };

    const handleChatHistory = (history) => {
      setMessages(history.messageHistory);
    };

    const handleMessageUpdated = ({ messageId, newMessage }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === messageId ? { ...msg, message: newMessage } : msg
        )
      );
    };

    const handleMessageDeleted = (messageId) => {
      setMessages((prev) => prev.filter((msg) => msg._id !== messageId));
    };

    const handleMessageSeenUpdate = (updatedMessages) => {
      setMessages(updatedMessages);
    };

    socket.on("message", handleReceiveMessage);
    socket.on("messageHistory", handleChatHistory);
    socket.on("messageUpdated", handleMessageUpdated);
    socket.on("messageDeleted", handleMessageDeleted);
    socket.on("messageSeenUpdate", handleMessageSeenUpdate);

    return () => {
      socket.off("message", handleReceiveMessage);
      socket.off("messageHistory", handleChatHistory);
      socket.off("messageUpdated", handleMessageUpdated);
      socket.off("messageDeleted", handleMessageDeleted);
      socket.off("messageSeenUpdate", handleMessageSeenUpdate);
    };
  }, [socket]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    socket.emit("joinRoom", { username, room });
  }, [socket, username, room]);

  const handleSendMessage = async () => {
    if (!message.trim() && !file) return;
  
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const fileContent = reader.result; // Convert file to Base64
        console.log("Base64 file content:", fileContent); // Verify file content
  
        socket.emit("sendMessage", {
          room,
          username,
          message,
          file: fileContent, // Send file as Base64
        });
  
        setMessage("");
        setFile(null);
      };
  
      reader.readAsDataURL(file); // Convert file to Base64 string
    } else {
      socket.emit("sendMessage", { room, username, message });
      setMessage("");
    }
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

  const isWithinTimeLimit = (timestamp) => {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    return new Date(timestamp) > tenMinutesAgo;
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <div className="flex-grow"></div>
      <div className="bg-white shadow-lg rounded-lg w-1/4 h-screen flex flex-col">
        <header className="bg-blue-600 text-white p-4 rounded-t-lg flex justify-between items-center">
          <h1 className="text-lg font-bold">LiveCodeHub - Room: {room}</h1>
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
                new Date() - new Date(msg.timestamp) <= 10 * 60 * 1000;
              const canDelete = isAuthor && isWithinTimeLimit(msg.timestamp);

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
                      {msg.file && (
                        <a
                          href={msg.file}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 underline text-sm"
                        >
                          📎 View File
                        </a>
                      )}
                      <div className="text-xs text-gray-500 mt-1">
                        Sent by <strong>{msg.username}</strong> at{" "}
                        {new Date(msg.timestamp).toLocaleString()}
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
            <div ref={chatEndRef}></div>
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
          <input
            type="file"
            onChange={(e) => setFile(e.target.files[0])}
            className="bg-gray-100 border rounded-md p-2"
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
          >
            Polls
          </button>
        </footer>
      </div>
    </div>
  );
}

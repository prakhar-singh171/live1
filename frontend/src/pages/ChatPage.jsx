import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { toast } from "react-toastify";

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
      const newMessages = history.messageHistory || [];
      setMessages(history);
    
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

    const handleReceiveError = (error) => {
      console.error('Error received:', error);
      toast.error(`Error: ${error.message || 'An unknown error occurred.'}`);
    };

    socket.on("message", handleReceiveMessage);
    socket.on("messageHistory", handleChatHistory);
    socket.on("messageUpdated", handleMessageUpdated);
    socket.on("messageDeleted", handleMessageDeleted);
    socket.on("messageSeenUpdate", handleMessageSeenUpdate);
    socket.on('error', handleReceiveError);

    return () => {
      socket.off("message", handleReceiveMessage);
      socket.off("messageHistory", handleChatHistory);
      socket.off("messageUpdated", handleMessageUpdated);
      socket.off("messageDeleted", handleMessageDeleted);
      socket.off("messageSeenUpdate", handleMessageSeenUpdate);
      socket.off('error', handleReceiveError); 
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

  const handleFileUpload = async () => {
    if (!file) return null;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post("http://localhost:3000/api/chat/uploadFile", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      return response.data.fileUrl || null;
    } catch (error) {
      console.error("Error uploading file:", error);
      return null;
    }
  };

  const handleSendMessage = async () => {
    let fileUrl = null;

    if (file) {
      fileUrl = await handleFileUpload();
      if (!fileUrl) {
        console.error("File upload failed. Cannot send message.");
        return;
      }
    }

    // Send message via Socket.IO
    socket.emit("sendMessage", {
      room,
      username,
      message,
      fileUrl,
    });

    setMessage("");
    setFile(null);
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

  const handleInputChange = useCallback((e) => {
    setMessage(e.target.value);
  }, []);

  

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
  {Array.isArray(messages) &&    <div className="flex flex-col gap-4">
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
                            <div className="flex items-center gap-2">
                              <img
                                src="/images/file-icon.png" // Adjust the path to match your project structure
                                alt="File Icon"
                                className="w-6 h-6" // Set appropriate dimensions
                              />
                              <a
                                href={msg.file}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 underline text-sm"
                              >
                                View File
                              </a>
                            </div>
                          )}
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
            <div ref={chatEndRef}></div>
          </div>   }
        </main>

        <footer className="bg-white p-4 flex gap-2 rounded-b-lg">
          <input
            type="text"
            placeholder="Type a message..."
            value={message}
            onChange={handleInputChange}
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

import React, { useState, useEffect, useRef } from "react";

export default function ChatPage({
  socket,
  room,
  username,
  handleLeaveRoom,
  handleNavigateToPolls,
}) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editText, setEditText] = useState("");
  const chatEndRef = useRef(null);


  // Set up Socket.IO listeners
  useEffect(() => {
    // Listener for new individual messages
    const handleReceiveMessage = (newMessage) => {
      console.log("New message received:", newMessage);
      setMessages((prev) => [...prev, newMessage]);
    };

    // Listener for full chat history (e.g., on join)
    const handleChatHistory = (history) => {
      console.log("Received chat history:", history);
      setMessages(history);
    };

    // Listener for message updates (editing)
    const handleMessageUpdated = ({ messageId, newMessage }) => {
      console.log("Message updated:", messageId, newMessage);
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === messageId ? { ...msg, message: newMessage } : msg
        )
      );
    };

    // Listener for message deletions
    const handleMessageDeleted = (messageId) => {
      console.log("Message deleted:", messageId);
      setMessages((prev) => prev.filter((msg) => msg._id !== messageId));
    };

    // Listener for seen status updates
    const handleMessageSeenUpdate = (updatedMessages) => {
      console.log("Message seen update:", updatedMessages);
      setMessages(updatedMessages);
    };

    socket.on("message", handleReceiveMessage);
    socket.on("chat_history", handleChatHistory);
    socket.on("messageUpdated", handleMessageUpdated);
    socket.on("messageDeleted", handleMessageDeleted);
    socket.on("messageSeenUpdate", handleMessageSeenUpdate);

    return () => {
      socket.off("message", handleReceiveMessage);
      socket.off("chat_history", handleChatHistory);
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

  // Send a new message
  const handleSendMessage = () => {
    if (message.trim()) {
      socket.emit("sendMessage", { room, username, message });
      setMessage("");
    }
  };

  // Edit functionality
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

  // Delete functionality
  const handleDeleteMessage = (messageId) => {
    socket.emit("deleteMessage", { messageId, username, isAdmin: username === "admin" });
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Filler to take up remaining space on the left */}
      <div className="flex-grow"></div>
      
      {/* Chat container occupies 1/4th of the screen width and full height */}
      <div className="bg-white shadow-lg rounded-lg w-1/4 h-screen flex flex-col">
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
  );
  
}

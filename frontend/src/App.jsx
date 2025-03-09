import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000'); // Update as per your backend

export default function App() {
  const [username, setUsername] = useState('');
  const [room, setRoom] = useState('');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    socket.on('message', (newMessage) => {
      setMessages((prevMessages) => [...prevMessages, newMessage]);
    });

    socket.on('messageHistory', (messageHistory) => {
      setMessages(messageHistory);
    });

    return () => {
      socket.off('message');
      socket.off('messageHistory');
    };
  }, []);

  const handleJoinRoom = () => {
    if (username && room) {
      socket.emit('joinRoom', { username, room });
      setIsLoggedIn(true);
    }
  };

  const handleSendMessage = () => {
    if (message.trim()) {
      socket.emit('sendMessage', { username, room, message });
      setMessage('');
    }
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
    <div className="flex h-screen items-center justify-center bg-gray-100">
      <div className="bg-white shadow-lg rounded-lg w-full max-w-lg h-[80vh] flex flex-col">
        <header className="bg-blue-600 text-white p-4 rounded-t-lg">
          <h1 className="text-lg font-bold text-center">TalkSpace - Room: {room}</h1>
        </header>

        <main className="flex-grow overflow-y-scroll p-4 bg-gray-50">
          <div className="flex flex-col gap-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`relative max-w-md rounded-lg p-4 ${
                  msg.username === username
                    ? 'bg-green-200 self-end text-right'
                    : 'bg-gray-100 self-start text-left'
                }`}
              >
                <p className="text-sm font-medium">{msg.message}</p>
                <div className="text-xs text-gray-500 mt-1">
                  {new Date(msg.timestamp).toLocaleString()}
                </div>
              </div>
            ))}
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
        </footer>
      </div>
    </div>
  );
}

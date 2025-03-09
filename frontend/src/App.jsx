import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import dayjs from 'dayjs';

const SERVER_URL ='http://localhost:3000';
const socket = io(SERVER_URL);

function App() {
  const [username, setUsername] = useState('');
  const [room, setRoom] = useState('');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    socket.on('messageHistory', (history) => {
      setMessages(history);
    });

    socket.on('message', (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    return () => socket.disconnect();
  }, []);

  const joinRoom = () => {
    if (username && room) {
      socket.emit('joinRoom', { username, room });
      setJoined(true);
    }
  };

  const sendMessage = () => {
    if (message) {
      socket.emit('sendMessage', { username, room, message });
      setMessage('');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      {!joined ? (
        <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
          <h2 className="text-2xl font-bold mb-4 text-center">Welcome to TalkSpace</h2>
          <input
            type="text"
            className="w-full p-2 mb-4 border border-gray-300 rounded"
            placeholder="Enter your username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            type="text"
            className="w-full p-2 mb-4 border border-gray-300 rounded"
            placeholder="Enter a room name"
            value={room}
            onChange={(e) => setRoom(e.target.value)}
          />
          <button
            className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
            onClick={joinRoom}
          >
            Join Room
          </button>
        </div>
      ) : (
        <div className="bg-white p-4 rounded-lg shadow-lg w-full max-w-lg">
          <h2 className="text-xl font-semibold mb-4">Room: {room}</h2>
          <div className="overflow-y-auto h-80 border border-gray-200 rounded mb-4 p-2 bg-gray-50">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`mb-2 flex ${
                  msg.username === username ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-xs p-2 rounded-lg ${
                    msg.username === username
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-black'
                  }`}
                >
                  <div className="text-sm font-semibold">
                    {msg.username === username ? 'You' : msg.username}
                  </div>
                  <div className="text-sm">{msg.message}</div>
                  <div className="text-xs text-gray-400 mt-1 text-right">
                    {dayjs(msg.timestamp).format('MMM D, h:mm A')}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center">
            <input
              type="text"
              className="flex-grow p-2 border border-gray-300 rounded-l"
              placeholder="Type a message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            />
            <button
              className="bg-blue-500 text-white px-4 rounded-r hover:bg-blue-600"
              onClick={sendMessage}
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

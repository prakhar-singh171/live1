import React, { useState, useEffect } from "react";
import { io } from "socket.io-client";

const socket = io("http://localhost:3000"); // Replace with your backend URL

export default function PollsPage({ room, username, onBackToChat }) {
  const [polls, setPolls] = useState([]);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [isCreatingPoll, setIsCreatingPoll] = useState(false);

  useEffect(() => {
    if (room && username) {
      socket.emit("getPolls", { room });
  
      socket.on("polls", (receivedPolls) => {
        setPolls(receivedPolls);
      });
  
      socket.on("pollUpdated", (updatedPoll) => {
        setPolls((prevPolls) =>
          prevPolls.map((poll) =>
            poll._id === updatedPoll._id ? updatedPoll : poll
          )
        );
      });
  
      return () => {
        socket.off("polls");
        socket.off("pollUpdated");
      };
    }
  }, [room, username]);

  useEffect(() => {
  if (room && username) {
    socket.emit("getPolls", { room });

    socket.on("polls", (receivedPolls) => {
      setPolls(receivedPolls);
    });

    socket.on("pollUpdated", (updatedPoll) => {
      setPolls((prevPolls) =>
        prevPolls.map((poll) =>
          poll._id === updatedPoll._id ? updatedPoll : poll
        )
      );
    });

    return () => {
      socket.off("polls");
      socket.off("pollUpdated");
    };
  }
}, [room, username]);

  
  const handleCreatePoll = () => {
    if (pollQuestion.trim() && pollOptions.every((opt) => opt.trim())) {
      socket.emit("createPoll", {
        room,
        username,
        question: pollQuestion,
        options: pollOptions,
      });
      setPollQuestion("");
      setPollOptions(["", ""]);
      setIsCreatingPoll(false);
    }
  };

  useEffect(() => {
    socket.on("pollCreated", (newPoll) => {
      setPolls((prevPolls) => [...prevPolls, newPoll]);
    });
  
    return () => {
      socket.off("pollCreated");
    };
  }, []);

  
  const handleVote = (pollId, optionIndex) => {
    socket.emit("votePoll", { pollId, username, optionIndex });
  };

  const handleAddOption = () => {
    setPollOptions([...pollOptions, ""]);
  };

  const handleOptionChange = (index, value) => {
    const updatedOptions = [...pollOptions];
    updatedOptions[index] = value;
    setPollOptions(updatedOptions);
  };

  return (
    <div className="flex flex-col items-center p-6 bg-gray-100 h-screen">
      <header className="flex justify-between items-center w-full max-w-2xl mb-4">
        <h1 className="text-xl font-bold">Polls for Room: {room}</h1>
        <button
          onClick={onBackToChat}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Back to Chat
        </button>
      </header>

      <main className="w-full max-w-2xl bg-white shadow-md rounded-lg p-4">
        {isCreatingPoll ? (
          <div className="mb-6">
            <h2 className="text-lg font-bold mb-2">Create a New Poll</h2>
            <input
              type="text"
              placeholder="Poll Question"
              value={pollQuestion}
              onChange={(e) => setPollQuestion(e.target.value)}
              className="w-full mb-2 p-2 border rounded-md"
            />
            {pollOptions.map((option, index) => (
              <div key={index} className="mb-2 flex items-center gap-2">
                <input
                  type="text"
                  placeholder={`Option ${index + 1}`}
                  value={option}
                  onChange={(e) => handleOptionChange(index, e.target.value)}
                  className="flex-grow p-2 border rounded-md"
                />
              </div>
            ))}
            <button
              onClick={handleAddOption}
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
            >
              Add Option
            </button>
            <button
              onClick={handleCreatePoll}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 ml-2"
            >
              Create Poll
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsCreatingPoll(true)}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mb-4"
          >
            Create New Poll
          </button>
        )}

        {polls.length === 0 ? (
          <p className="text-center text-gray-500">No polls available.</p>
        ) : (
          <div className="space-y-6">
            {polls.map((poll) => (
              <div key={poll._id} className="border p-4 rounded-md">
                <h3 className="text-lg font-bold mb-2">{poll.question}</h3>
                <p className="text-xs text-gray-500">
                  Created by <strong>{poll.createdBy}</strong> at{" "}
                  {new Date(poll.timestamp).toLocaleString()}
                </p>
                <div className="mt-4 space-y-2">
                  {poll.options.map((option, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center"
                    >
                      <span>{option.text}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">
                          {option.votes} votes
                        </span>
                        <button
                          onClick={() => handleVote(poll._id, index)}
                          className="bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                          disabled={poll.voters.includes(username)}
                        >
                          {poll.voters.includes(username) ? "Voted" : "Vote"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

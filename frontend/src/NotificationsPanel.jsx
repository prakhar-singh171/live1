import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function NotificationsPanel({ username, socket }) {
  const [notifications, setNotifications] = useState([]);
  const [audioEnabled, setAudioEnabled] = useState(false); // Start with audio disabled
  const audioRef = useRef(null);

  // Fetch notifications from REST API on mount
  useEffect(() => {
    if (!username) return;

    const fetchNotifications = async () => {
      try {
        const response = await axios.get(`http://localhost:3000/api/notifications/${username}`);
        const uniqueNotifications = Array.from(
          new Map(response.data.map((notif) => [notif._id, notif])).values()
        );
        setNotifications(uniqueNotifications);
        console.log("Fetched notifications:", uniqueNotifications);
      } catch (error) {
        console.error("Error fetching notifications:", error);
      }
    };

    fetchNotifications();
  }, [username]);

  // Listen for real-time notifications
  useEffect(() => {
    if (!socket) return;

    const handleNotification = (notification) => {
      console.log("Received real-time notification:", notification);

      // Play notification sound only if audio is enabled and after user interaction
      if (audioEnabled && audioRef.current) {
        audioRef.current.play().catch((error) => {
          console.error("Error playing notification sound:", error);
        });
      }

      toast.info(notification.message, {
        position: "top-right",
        autoClose: 5000,
      });

      setNotifications((prev) => {
        const updatedNotifications = [notification, ...prev];
        return Array.from(new Map(updatedNotifications.map((notif) => [notif._id, notif])).values());
      });
    };

    socket.on("notification", handleNotification);
    return () => {
      socket.off("notification", handleNotification);
    };
  }, [socket, audioEnabled]);

  // Global click listener to enable audio on first interaction
  useEffect(() => {
    const enableAudio = () => {
      setAudioEnabled(true); // Enable audio after first user interaction
      console.log("Audio enabled");
      document.removeEventListener("click", enableAudio); // Remove event listener after the first click
    };

    document.addEventListener("click", enableAudio); // Add event listener for user interaction
    return () => {
      document.removeEventListener("click", enableAudio); // Cleanup on unmount
    };
  }, []);

  // Audio load and error checking
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.addEventListener("canplaythrough", () => {
        console.log("Audio file is ready to play");
      });

      audioRef.current.addEventListener("error", () => {
        console.error("Error loading the audio file.");
      });
    }
  }, []);

  const handleMarkAsRead = async (id) => {
    try {
      await axios.put(`http://localhost:3000/api/notifications/${id}/read`, { readStatus: true });
      setNotifications((prev) =>
        prev.map((notif) => (notif._id === id ? { ...notif, readStatus: true } : notif))
      );
      toast.success("Notification marked as read", { autoClose: 3000 });
    } catch (error) {
      console.error("Error marking notification as read:", error.response?.data || error.message);
      toast.error("Error marking notification as read", { autoClose: 3000 });
    }
  };

  const handleDeleteNotification = async (id) => {
    try {
      await axios.delete(`http://localhost:3000/api/notifications/${id}`);
      setNotifications((prev) => prev.filter((notif) => notif._id !== id));
      toast.success("Notification deleted", { autoClose: 3000 });
    } catch (error) {
      console.error("Error deleting notification:", error.response?.data || error.message);
      toast.error("Error deleting notification", { autoClose: 3000 });
    }
  };

  const handleDeleteAll = async () => {
    try {
      await axios.delete(`http://localhost:3000/api/notifications/user/${username}`);
      setNotifications([]);
      toast.success("All notifications deleted", { autoClose: 3000 });
    } catch (error) {
      console.error("Error deleting all notifications:", error.response?.data || error.message);
      toast.error("Error deleting all notifications", { autoClose: 3000 });
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto bg-gray-50 rounded shadow my-4">
      {/* Audio element for notification sound */}
      <audio ref={audioRef} src="/sounds/notification.wav" preload="auto" />

      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Your Notifications</h2>
        {notifications.length > 0 && (
          <button
            onClick={handleDeleteAll}
            className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 text-xs"
          >
            Delete All
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <p className="text-gray-500">No notifications available.</p>
      ) : (
        notifications.map((notif) => (
          <div key={notif._id} className="border p-4 rounded mb-2">
            <p className="text-sm">{notif.message}</p>
            <p className="text-xs text-gray-500">
              {new Date(notif.timestamp).toLocaleString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
                month: "short",
                day: "2-digit",
                year: "numeric",
              })}
            </p>
            <div className="mt-2 flex gap-2">
              {!notif.readStatus && (
                <button
                  onClick={() => handleMarkAsRead(notif._id)}
                  className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 text-xs"
                >
                  Mark as Read
                </button>
              )}
              <button
                onClick={() => handleDeleteNotification(notif._id)}
                className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 text-xs"
              >
                Delete
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

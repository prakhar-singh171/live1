// backend/controllers/notificationController.js
const Notification = require("../models/notificationModel.js");

const sendNotification = async (username, message, type = "other") => {
  try {
    const notification = new Notification({
      username,
      message,
      type,
      readStatus: false,
      timestamp: new Date()
    });
    await notification.save();
    console.log("Notification sent to user:", username);
    return notification;
  } catch (error) {
    console.error("Error sending notification:", error);
    throw error;
  }
};

const getUserNotifications = async (req, res) => {
  try {
    const { username } = req.params;
    const notifications = await Notification.find({ username }).sort({ timestamp: -1 });
    if (!notifications || notifications.length === 0) {
      return res.status(404).json({ message: "No notifications found for this user." });
    }
    res.status(200).json(notifications);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ message: "Error fetching notifications", error });
  }
};

const markNotificationAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const { readStatus } = req.body;
    const notification = await Notification.findByIdAndUpdate(id, { readStatus }, { new: true });
    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }
    res.status(200).json({ message: "Notification marked as read", notification });
  } catch (error) {
    console.error("Error updating notification:", error);
    res.status(500).json({ message: "Error updating notification", error });
  }
};

const deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;
    console.log("Deleting notification:", notificationId);
    const deletedNotification = await Notification.findByIdAndDelete(notificationId);
    if (!deletedNotification) {
      return res.status(404).json({ message: "Notification not found." });
    }
    res.status(200).json({ message: "Notification deleted successfully." });
  } catch (error) {
    console.error("Error deleting notification:", error);
    res.status(500).json({ message: "Error deleting notification", error });
  }
};

// New controller: Delete all notifications for a specific user
const deleteAllNotificationsForUser = async (req, res) => {
  try {
    const { username } = req.params;
    const result = await Notification.deleteMany({ username });
    res.status(200).json({ message: "All notifications deleted successfully.", result });
  } catch (error) {
    console.error("Error deleting all notifications:", error);
    res.status(500).json({ message: "Error deleting all notifications", error });
  }
};

module.exports = {
  sendNotification,
  getUserNotifications,
  markNotificationAsRead,
  deleteNotification,
  deleteAllNotificationsForUser,
};

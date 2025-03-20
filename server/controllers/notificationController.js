const Notification = require("../models/notificationModel.js");

// Send notification to multiple users
const sendNotification = async (recipientUsernames, message, type = "other", messageId = null, room) => {
  try {
    console.log(room, "Room for notification");

    // Check if a similar notification already exists for the same type and room
    const existing = await Notification.findOne({
      type,
      room,
      messageId,
    });

    if (existing) {
      // Merge new recipients into the existing notification's usernames array
      const uniqueUsernames = Array.from(new Set([...existing.usernames, ...recipientUsernames]));
      existing.usernames = uniqueUsernames;
      await existing.save();

      console.log(`Updated notification with new usernames for room ${room}`);
      return existing;
    }

    // Create a new notification if no similar one exists
    const notification = new Notification({
      usernames: recipientUsernames,
      message,
      type,
      room,
      readStatus: false,
      timestamp: Date.now(),
      messageId,
    });
    await notification.save();

    console.log("Notification sent to users:", recipientUsernames);
    return notification;
  } catch (error) {
    console.error("Error sending notification:", error);
    throw error;
  }
};

// Get notifications for a specific user
const getUserNotifications = async (req, res) => {
  try {
    const { username } = req.params;
    const notifications = await Notification.find({ usernames: username })
      .sort({ timestamp: -1 })
      .exec();

    res.status(200).json(notifications);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ message: "Error fetching notifications", error });
  }
};

// Mark notification as read
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

// Delete a specific notification
const deleteNotification = async (req, res) => {
  try {
    const {notificationId } = req.params;
    console.log('dsfd')
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

// Delete all notifications for a specific user
const deleteAllNotificationsForUser = async (req, res) => {
  try {
    const { username } = req.params;
    const result = await Notification.updateMany(
      { usernames: username },
      { $pull: { usernames: username } }
    );

    res.status(200).json({ message: "All notifications for the user removed successfully.", result });
  } catch (error) {
    console.error("Error deleting all notifications for user:", error);
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

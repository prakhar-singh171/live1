// backend/controllers/notificationController.js
const Notification = require('../models/notificationModel.js'); // Import Message model

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

module.exports={sendNotification}

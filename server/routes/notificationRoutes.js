// backend/routes/notificationRoutes.js
const express = require("express");
const {
  getUserNotifications,
  markNotificationAsRead,
  deleteNotification,
  deleteAllNotificationsForUser
} = require("../controllers/notificationController.js");

const router = express.Router();
console.log('dfdsf')
router.get("/:username", getUserNotifications);
router.put("/:id/read", markNotificationAsRead);
router.delete("/removeUser/:notificationId", deleteNotification);
router.delete("/user/:username", deleteAllNotificationsForUser);

module.exports = router;

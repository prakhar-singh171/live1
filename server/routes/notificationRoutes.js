// backend/routes/notificationRoutes.js
const express = require("express");
const {
  getUserNotifications,
  markNotificationAsRead,
  deleteNotification,
} = require("../controllers/notificationController.js");

const router = express.Router();

router.get("/:username", getUserNotifications);
router.put("/:id/read", markNotificationAsRead);
router.delete("/:notificationId", deleteNotification);

module.exports = router;

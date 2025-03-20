// routes/messageRoutes.js
const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload'); // Assuming you have multer middleware set up
const { sendMessageHandler } = require('../controllers/chatController');

// Route to send a message (including file upload)
router.post('/send', upload.single('file'), async (req, res) => {
  const { username, room, message } = req.body;
  const file = req.file;  // Get the uploaded file from the request

  try {
    // Call sendMessageHandler with the file
    const savedMessage = await sendMessageHandler(req.app.get('io'), { 
      username, 
      room, 
      message, 
      file: file // Pass file details
    });

    // Send back the saved message as a response
    res.status(201).json(savedMessage);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Error sending message' });
  }
});

module.exports = router;

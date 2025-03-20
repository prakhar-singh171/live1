const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Set up storage configuration for multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Define the directory where files will be uploaded
    const uploadDir = 'uploads/';
    // Check if the directory exists, if not, create it
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir); // Store the file in 'uploads' directory
  },
  filename: (req, file, cb) => {
    // Set the filename to be the current timestamp + the original file extension
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

// Initialize multer with storage configuration
const upload = multer({ storage: storage });

// Handle file upload POST request
router.post('/upload', upload.single('file'), (req, res) => {
  try {
    // File has been successfully uploaded
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    // Send back the file URL or file path to the client
    const fileUrl = `http://localhost:3000/uploads/${req.file.filename}`;
    return res.json({ fileUrl });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ message: 'File upload failed', error: error.message });
  }
});

module.exports = router;

const express = require("express");
const  upload  = require("../config/multer.js");
const { uploadFile } = require("../controllers/chatController.js");


const router = express.Router();

// Route for file uploads
router.post("/uploadFile", upload.single("file"), uploadFile);

module.exports = router;

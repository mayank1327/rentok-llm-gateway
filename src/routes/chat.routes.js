const express = require("express");

const authenticateApiKey = require("../middleware/auth.middleware.js");
const validateChatRequest = require("../middleware/validate-chat-request");
const { createChat } = require("../controllers/chat.controller");

const router = express.Router();

router.post(
  "/completions",
  authenticateApiKey,
  validateChatRequest,
  createChat
);

module.exports = router;
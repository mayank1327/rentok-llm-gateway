function validateChatRequest(req, res, next) {
    const { model, messages } = req.body || {};
  
    if (typeof model !== "string" || !model.trim()) {
      return res.status(400).json({
        error: {
          message: "model must be a non-empty string",
        },
      });
    }
  
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        error: {
          message: "messages must be a non-empty array",
        },
      });
    }
  
    const validRoles = ["system", "user", "assistant"];
  
    const hasInvalidMessage = messages.some((message) => {
      return (
        !message ||
        typeof message !== "object" ||
        Array.isArray(message) ||
        !validRoles.includes(message.role) ||
        typeof message.content !== "string" ||
        !message.content.trim()
      );
    });
  
    if (hasInvalidMessage) {
      return res.status(400).json({
        error: {
          message:
            "Each message must have a valid role and non-empty string content",
        },
      });
    }
  
    return next();
  }
  
  module.exports = validateChatRequest;
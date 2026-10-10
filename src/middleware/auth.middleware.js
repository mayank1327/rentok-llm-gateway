const crypto = require("node:crypto");
const ApiKey = require("../models/api-key.model");

async function authenticateApiKey(req, res, next) {
  const authorization = req.headers.authorization;

  // Reject requests that do not provide a Bearer token.
  if (!authorization || !authorization.startsWith("Bearer ")) {
    return res.status(401).json({
      error: {
        message: "Missing or invalid API key",
      },
    });
  }

  const rawKey = authorization.slice("Bearer ".length).trim();

  if (!rawKey) {
    return res.status(401).json({
      error: {
        message: "Missing or invalid API key",
      },
    });
  }

  // Hash the supplied key because MongoDB stores only its hash.
  const keyHash = crypto
    .createHash("sha256")
    .update(rawKey)
    .digest("hex");

  try {
    const apiKey = await ApiKey.findOne({
      keyHash,
      isActive: true,
    });

    if (!apiKey) {
      return res.status(401).json({
        error: {
          message: "Missing or invalid API key",
        },
      });
    }

    // Make the authenticated key's basic details available downstream.
    req.apiKey = {
      id: apiKey._id,
      name: apiKey.name,
    };

    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = authenticateApiKey;
const mongoose = require("mongoose");

const usageSchema = new mongoose.Schema(
  {
    apiKeyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ApiKey",
      required: true,
    },
    model: {
      type: String,
      required: true,
    },
    inputTokens: {
      type: Number,
      required: true,
    },
    outputTokens: {
      type: Number,
      required: true,
    },
    totalTokens: {
      type: Number,
      required: true,
    },
    costUSD: {
      type: Number,
      required: true,
    },
    costINR: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Usage", usageSchema);
const mongoose = require("mongoose");

const apiKeySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    keyHash: {
      type: String,
      required: true,
      unique: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    budgetLimit: {
        type: Number,
        required: true,
        min: 0,
        default: 100,
    },
    spentAmount: {
        type: Number,
        required: true,
        min: 0,
        default: 0,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("ApiKey", apiKeySchema);
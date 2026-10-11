
const ApiKey = require("../models/api-key.model");

async function reserveBudget(apiKeyId, amountInINR) {
  if (!Number.isFinite(amountInINR) || amountInINR <= 0) {
    throw new Error("Reservation amount must be a positive number");
  }

  const apiKey = await ApiKey.findOneAndUpdate(
    {
      _id: apiKeyId,
      isActive: true,
      $expr: {
        $lte: [
          { $add: ["$spentAmount", amountInINR] },
          "$budgetLimit",
        ],
      },
    },
    {
      $inc: {
        spentAmount: amountInINR,
      },
    },
    {
      new: true,
      runValidators: true,
    }
  );

  if (!apiKey) {
    const error = new Error("Budget limit exceeded");
    error.statusCode = 429;
    throw error;
  }

  return apiKey;
}

async function releaseBudget(apiKeyId, amountInINR) {
  if (!Number.isFinite(amountInINR) || amountInINR <= 0) {
    throw new Error("Release amount must be a positive number");
  }

  return ApiKey.findOneAndUpdate(
    {
      _id: apiKeyId,
      spentAmount: { $gte: amountInINR },
    },
    {
      $inc: {
        spentAmount: -amountInINR,
      },
    },
    {
      new: true,
    }
  );
}

module.exports = {
  reserveBudget,
  releaseBudget,
};

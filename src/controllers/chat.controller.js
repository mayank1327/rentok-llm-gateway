
const { createChatCompletion } = require("../services/groq.service");
const {
  estimateRequestCost,
} = require("../services/cost-estimator.service");
const {
  reserveBudget,
  releaseBudget,
} = require("../services/budget.service");

async function createChat(req, res, next) {
  let reservedAmount = 0;
  let budgetReserved = false;

  try {
    const { model, messages } = req.body;

    const estimate = estimateRequestCost({ model, messages });
    reservedAmount = estimate.estimatedCostINR;

    await reserveBudget(req.apiKey.id, reservedAmount);
    budgetReserved = true;

    const completion = await createChatCompletion({
      model,
      messages,
    });

    return res.status(200).json(completion);
  } catch (error) {
    if (budgetReserved) {
      try {
        await releaseBudget(req.apiKey.id, reservedAmount);
      } catch (releaseError) {
        console.error(
          "Failed to release budget reservation:",
          releaseError.message
        );
      }
    }

    return next(error);
  }
}

module.exports = {
  createChat,
};

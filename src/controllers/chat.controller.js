const { createChatCompletion } = require("../services/groq.service");
const {
  estimateRequestCost,
  calculateActualCost,
} = require("../services/cost-estimator.service");
const {
  reserveBudget,
  releaseBudget,
  reconcileBudget,
} = require("../services/budget.service");
const Usage = require("../models/usage.model");

async function createChat(req, res, next) {
  let reservedAmount = 0;
  let budgetReserved = false;
  let budgetReconciled = false;

  try {
    const { model, messages } = req.body;

    const estimate = estimateRequestCost({ model, messages });
    reservedAmount = estimate.estimatedCostINR;

    await reserveBudget(req.apiKey.id, reservedAmount);
    budgetReserved = true;

    const completion = await createChatCompletion({ model, messages });

    const usage = completion.usage;

    if (
      !usage ||
      !Number.isFinite(usage.prompt_tokens) ||
      !Number.isFinite(usage.completion_tokens) ||
      !Number.isFinite(usage.total_tokens)
    ) {
      throw new Error("Actual token usage missing from provider response");
    }

    const actualCost = calculateActualCost({
      model,
      inputTokens: usage.prompt_tokens,
      outputTokens: usage.completion_tokens,
    });

    await reconcileBudget(
      req.apiKey.id,
      reservedAmount,
      actualCost.costINR
    );
    budgetReconciled = true;

    await Usage.create({
      apiKeyId: req.apiKey.id,
      model,
      inputTokens: usage.prompt_tokens,
      outputTokens: usage.completion_tokens,
      totalTokens: usage.total_tokens,
      costUSD: actualCost.costUSD,
      costINR: actualCost.costINR,
    });

    return res.status(200).json(completion);
  } catch (error) {
    if (budgetReserved && !budgetReconciled) {
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

module.exports = { createChat };

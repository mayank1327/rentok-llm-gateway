const { createChatCompletion } = require("./groq.service");

const {
  estimateRequestCost,
  calculateActualCost,
} = require("./cost-estimator.service");

const {
  reserveBudget,
  releaseBudget,
  reconcileBudget,
} = require("./budget.service");

const Usage = require("../models/usage.model");

async function processChatRequest({ apiKeyId, model, messages }) {
  let reservedAmount = 0;
  let budgetReserved = false;
  let budgetReconciled = false;
  let providerSucceeded = false;

  try {
    // 1. Estimate request cost
    const estimate = estimateRequestCost({ model, messages });
    reservedAmount = estimate.estimatedCostINR;

    // 2. Reserve budget
    await reserveBudget(apiKeyId, reservedAmount);
    budgetReserved = true;

    // 3. Call LLM provider
    const completion = await createChatCompletion({ model, messages });
    providerSucceeded = true;
    // 4. Get and validate actual token usage
    const usage = completion.usage;

    if (
      !usage ||
      !Number.isFinite(usage.prompt_tokens) ||
      !Number.isFinite(usage.completion_tokens) ||
      !Number.isFinite(usage.total_tokens)
    ) {
      throw new Error("Actual token usage missing from provider response");
    }

    // 5. Calculate actual cost
    const actualCost = calculateActualCost({
      model,
      inputTokens: usage.prompt_tokens,
      outputTokens: usage.completion_tokens,
    });

    // 6. Reconcile budget
    await reconcileBudget(
      apiKeyId,
      reservedAmount,
      actualCost.costINR
    );
    budgetReconciled = true;

    // 7. Save usage document
    await Usage.create({
      apiKeyId,
      model,
      inputTokens: usage.prompt_tokens,
      outputTokens: usage.completion_tokens,
      totalTokens: usage.total_tokens,
      costUSD: actualCost.costUSD,
      costINR: actualCost.costINR,
    });

    // 8. Return provider response
    return completion;
  } catch (error) {
    if (budgetReserved && !providerSucceeded) {
      try {
        await releaseBudget(apiKeyId, reservedAmount);
      } catch (releaseError) {
        console.error(
          "Failed to release budget reservation:",
          releaseError.message
        );
      }
    }

    throw error;
  }
}

module.exports = { processChatRequest };
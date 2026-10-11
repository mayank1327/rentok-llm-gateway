
const MODEL_PRICING = require("../config/model-pricing");

const MAX_OUTPUT_TOKENS = 1024;

function estimateInputTokens(messages) {
  const totalCharacters = messages.reduce((total, message) => {
    return total + message.role.length + message.content.length;
  }, 0);

  // Rough estimate, not an exact tokenizer.
  return Math.ceil(totalCharacters / 4);
}

function estimateCostInUSD({
  model,
  inputTokens,
  outputTokens,
}) {
  const pricing = MODEL_PRICING[model];

  if (!pricing) {
    throw new Error(`Pricing not configured for model: ${model}`);
  }

  const inputCost =
    (inputTokens / 1_000_000) *
    pricing.inputPricePerMillionTokens;

  const outputCost =
    (outputTokens / 1_000_000) *
    pricing.outputPricePerMillionTokens;

  return inputCost + outputCost;
}

function estimateRequestCost({ model, messages }) {
  const inputTokens = estimateInputTokens(messages);

  const estimatedCostUSD = estimateCostInUSD({
    model,
    inputTokens,
    outputTokens: MAX_OUTPUT_TOKENS,
  });

  const usdToInrRate = Number(process.env.USD_TO_INR_RATE);

  if (!Number.isFinite(usdToInrRate) || usdToInrRate <= 0) {
  throw new Error("Invalid USD_TO_INR_RATE configuration");
}

const estimatedCostINR = estimatedCostUSD * usdToInrRate;


  return {
    estimatedInputTokens: inputTokens,
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    estimatedCostUSD,
    estimatedCostINR,
  };
}

function calculateActualCost({ model, inputTokens, outputTokens }) {
    const costUSD = estimateCostInUSD({
      model,
      inputTokens,
      outputTokens,
    });
  
    const usdToInrRate = Number(process.env.USD_TO_INR_RATE);
  
    if (!Number.isFinite(usdToInrRate) || usdToInrRate <= 0) {
      throw new Error("Invalid USD_TO_INR_RATE configuration");
    }
  
    return {
      costUSD,
      costINR: costUSD * usdToInrRate,
    };
  }

module.exports = {
  estimateInputTokens,
  estimateCostInUSD,
  estimateRequestCost,
  calculateActualCost,
  MAX_OUTPUT_TOKENS,
};


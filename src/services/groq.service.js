const Groq = require("groq-sdk");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
  timeout: 30000,
  maxRetries: 0,
});

async function createChatCompletion({ model, messages }) {
  try {
    return await groq.chat.completions.create({
      model,
      messages,
    });
  } catch (error) {
    if (error.name === "APIConnectionTimeoutError") {
      const providerError = new Error("LLM provider request timed out");
      providerError.statusCode = 504;
      throw providerError;
    }

    if (error.name === "APIConnectionError") {
      const providerError = new Error("LLM provider is unavailable");
      providerError.statusCode = 502;
      throw providerError;
    }

    if (error.status === 401 || error.status === 403) {
      const providerError = new Error("LLM provider authentication failed");
      providerError.statusCode = 502;
      throw providerError;
    }

    if (error.status === 429) {
      const providerError = new Error("LLM provider rate limit exceeded");
      providerError.statusCode = 429;
      throw providerError;
    }

    if (error.status >= 500) {
      const providerError = new Error("LLM provider server error");
      providerError.statusCode = 502;
      throw providerError;
    }

    throw error;
  }
}

module.exports = {
  createChatCompletion,
};

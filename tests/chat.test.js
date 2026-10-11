
  jest.mock("../src/models/api-key.model", () => ({
    findOne: jest.fn(),
  }));

  jest.mock("../src/models/usage.model", () => ({
    create: jest.fn().mockResolvedValue({}),
  }));
  
  jest.mock("groq-sdk", () =>
    jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn(),
        },
      },
    }))
  );

  jest.mock("../src/services/budget.service", () => ({
    reserveBudget: jest.fn().mockResolvedValue({}),
    releaseBudget: jest.fn().mockResolvedValue({}),
    reconcileBudget: jest.fn().mockResolvedValue({}),
  }));
  
  jest.mock("../src/services/cost-estimator.service", () => ({
    estimateRequestCost: jest.fn().mockReturnValue({
      estimatedInputTokens: 10,
      maxOutputTokens: 1024,
      estimatedCostUSD: 0.001,
      estimatedCostINR: 0.09,
    }),
  
    calculateActualCost: jest.fn().mockReturnValue({
      costUSD: 0.00001,
      costINR: 0.0009,
    }),
  }));
  
  const request = require("supertest");
  const ApiKey = require("../src/models/api-key.model");
  const Groq = require("groq-sdk");
  const app = require("../src/app");
  
  const groqClient = Groq.mock.results[0].value;
  const groqCreate = groqClient.chat.completions.create;
  
  const validApiKey = {
    _id: "test-key-id",
    name: "Test API Key",
  };
  
  const validBody = {
    model: "test-model",
    messages: [
      {
        role: "user",
        content: "Hello",
      },
    ],
  };
  
  const mockCompletion = {
    id: "test-completion-id",
    object: "chat.completion",
    choices: [
      {
        message: {
          role: "assistant",
          content: "Hello! How can I help?",
        },
      },
    ],
    usage: {
      prompt_tokens: 10,
      completion_tokens: 5,
      total_tokens: 15,
    },
  };
  
  describe("POST /v1/chat/completions", () => {
    beforeEach(() => {
      jest.clearAllMocks();
  
      ApiKey.findOne.mockResolvedValue(validApiKey);
      groqCreate.mockResolvedValue(mockCompletion);
    });
  
    // Authentication tests
  
    it("should reject a request with a missing API key", async () => {
      const response = await request(app)
        .post("/v1/chat/completions")
        .send(validBody);
  
      expect(response.status).toBe(401);
      expect(response.body.error.message).toBe(
        "Missing or invalid API key"
      );
      expect(ApiKey.findOne).not.toHaveBeenCalled();
      expect(groqCreate).not.toHaveBeenCalled();
    });
  
    it("should reject an invalid API key", async () => {
      ApiKey.findOne.mockResolvedValue(null);
  
      const response = await request(app)
        .post("/v1/chat/completions")
        .set("Authorization", "Bearer invalid-key")
        .send(validBody);
  
      expect(response.status).toBe(401);
      expect(groqCreate).not.toHaveBeenCalled();
    });
  
    // Request validation tests
  
    it("should reject a request without a model", async () => {
      const { model, ...body } = validBody;
  
      const response = await request(app)
        .post("/v1/chat/completions")
        .set("Authorization", "Bearer test-key")
        .send(body);
  
      expect(response.status).toBe(400);
      expect(groqCreate).not.toHaveBeenCalled();
    });
  
    it("should reject a request without messages", async () => {
      const response = await request(app)
        .post("/v1/chat/completions")
        .set("Authorization", "Bearer test-key")
        .send({ model: "test-model" });
  
      expect(response.status).toBe(400);
      expect(groqCreate).not.toHaveBeenCalled();
    });
  
    it("should reject an empty messages array", async () => {
      const response = await request(app)
        .post("/v1/chat/completions")
        .set("Authorization", "Bearer test-key")
        .send({
          model: "test-model",
          messages: [],
        });
  
      expect(response.status).toBe(400);
      expect(groqCreate).not.toHaveBeenCalled();
    });
  
    it("should reject an invalid message role", async () => {
      const response = await request(app)
        .post("/v1/chat/completions")
        .set("Authorization", "Bearer test-key")
        .send({
          model: "test-model",
          messages: [
            {
              role: "invalid",
              content: "Hello",
            },
          ],
        });
  
      expect(response.status).toBe(400);
      expect(groqCreate).not.toHaveBeenCalled();
    });
  
    it("should reject empty message content", async () => {
      const response = await request(app)
        .post("/v1/chat/completions")
        .set("Authorization", "Bearer test-key")
        .send({
          model: "test-model",
          messages: [
            {
              role: "user",
              content: "   ",
            },
          ],
        });
  
      expect(response.status).toBe(400);
      expect(groqCreate).not.toHaveBeenCalled();
    });
  
    // Successful request
  
    it("should return the provider completion for a valid request", async () => {
      const response = await request(app)
        .post("/v1/chat/completions")
        .set("Authorization", "Bearer test-key")
        .send(validBody);
  
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockCompletion);
  
      expect(groqCreate).toHaveBeenCalledWith({
        model: validBody.model,
        messages: validBody.messages,
      });
    });
  
    // Provider error handling tests
  
    it("should return 504 when the provider request times out", async () => {
      const error = new Error("Timeout");
      error.name = "APIConnectionTimeoutError";
  
      groqCreate.mockRejectedValue(error);
  
      const response = await request(app)
        .post("/v1/chat/completions")
        .set("Authorization", "Bearer test-key")
        .send(validBody);
  
      expect(response.status).toBe(504);
      expect(response.body.error.message).toBe(
        "LLM provider request timed out"
      );
    });
  
    it("should return 502 when the provider is unavailable", async () => {
      const error = new Error("Connection failed");
      error.name = "APIConnectionError";
  
      groqCreate.mockRejectedValue(error);
  
      const response = await request(app)
        .post("/v1/chat/completions")
        .set("Authorization", "Bearer test-key")
        .send(validBody);
  
      expect(response.status).toBe(502);
      expect(response.body.error.message).toBe(
        "LLM provider is unavailable"
      );
    });
  
    it("should return 502 for provider authentication errors", async () => {
      const error = new Error("Unauthorized");
      error.status = 401;
  
      groqCreate.mockRejectedValue(error);
  
      const response = await request(app)
        .post("/v1/chat/completions")
        .set("Authorization", "Bearer test-key")
        .send(validBody);
  
      expect(response.status).toBe(502);
      expect(response.body.error.message).toBe(
        "LLM provider authentication failed"
      );
    });
  
    it("should return 429 when the provider rate limit is exceeded", async () => {
      const error = new Error("Rate limited");
      error.status = 429;
  
      groqCreate.mockRejectedValue(error);
  
      const response = await request(app)
        .post("/v1/chat/completions")
        .set("Authorization", "Bearer test-key")
        .send(validBody);
  
      expect(response.status).toBe(429);
      expect(response.body.error.message).toBe(
        "LLM provider rate limit exceeded"
      );
    });
  
    it("should return 502 when the provider returns a server error", async () => {
      const error = new Error("Provider server error");
      error.status = 500;
  
      groqCreate.mockRejectedValue(error);
  
      const response = await request(app)
        .post("/v1/chat/completions")
        .set("Authorization", "Bearer test-key")
        .send(validBody);
  
      expect(response.status).toBe(502);
      expect(response.body.error.message).toBe(
        "LLM provider server error"
      );
    });
  
    it("should return 500 for an unexpected internal error", async () => {
      groqCreate.mockRejectedValue(new Error("Unexpected error"));
  
      const response = await request(app)
        .post("/v1/chat/completions")
        .set("Authorization", "Bearer test-key")
        .send(validBody);
  
      expect(response.status).toBe(500);
      expect(response.body.error.message).toBe(
        "Internal server error"
      );
    });
  });
  
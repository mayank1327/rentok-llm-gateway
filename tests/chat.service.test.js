
jest.mock("../src/services/groq.service", () => ({
    createChatCompletion: jest.fn(),
  }));
  
  jest.mock("../src/services/cost-estimator.service", () => ({
    estimateRequestCost: jest.fn(),
    calculateActualCost: jest.fn(),
  }));
  
  jest.mock("../src/services/budget.service", () => ({
    reserveBudget: jest.fn(),
    releaseBudget: jest.fn(),
    reconcileBudget: jest.fn(),
  }));
  
  jest.mock("../src/models/usage.model", () => ({
    create: jest.fn(),
  }));
  
  const { createChatCompletion } = require("../src/services/groq.service");
  
  const {
    estimateRequestCost,
    calculateActualCost,
  } = require("../src/services/cost-estimator.service");
  
  const {
    reserveBudget,
    releaseBudget,
    reconcileBudget,
  } = require("../src/services/budget.service");
  
  const Usage = require("../src/models/usage.model");
  
  const { processChatRequest } = require("../src/services/chat.service");
  
  describe("Chat Service - Failure and Edge Cases", () => {
    const request = {
      apiKeyId: "test-key-id",
      model: "openai/gpt-oss-20b",
      messages: [{ role: "user", content: "Hello" }],
    };
  
    const completion = {
      id: "test-completion-id",
      choices: [],
      usage: {
        prompt_tokens: 10,
        completion_tokens: 5,
        total_tokens: 15,
      },
    };
  
    beforeEach(() => {
      jest.clearAllMocks();
  
      estimateRequestCost.mockReturnValue({
        estimatedCostINR: 0.09,
        estimatedCostUSD: 0.001,
        estimatedInputTokens: 10,
        maxOutputTokens: 1024,
      });
  
      calculateActualCost.mockReturnValue({
        costUSD: 0.00001,
        costINR: 0.0009,
      });
  
      reserveBudget.mockResolvedValue({});
      releaseBudget.mockResolvedValue({});
      reconcileBudget.mockResolvedValue({});
      createChatCompletion.mockResolvedValue(completion);
      Usage.create.mockResolvedValue({});
    });
  
    it("should not call provider when budget reservation fails", async () => {
      reserveBudget.mockRejectedValue(
        new Error("Budget limit exceeded")
      );
  
      await expect(processChatRequest(request)).rejects.toThrow(
        "Budget limit exceeded"
      );
  
      expect(createChatCompletion).not.toHaveBeenCalled();
      expect(releaseBudget).not.toHaveBeenCalled();
      expect(Usage.create).not.toHaveBeenCalled();
    });
  
    it("should release reserved budget when provider fails", async () => {
      createChatCompletion.mockRejectedValue(
        new Error("Provider unavailable")
      );
  
      await expect(processChatRequest(request)).rejects.toThrow(
        "Provider unavailable"
      );
  
      expect(releaseBudget).toHaveBeenCalledWith(
        request.apiKeyId,
        0.09
      );
  
      expect(Usage.create).not.toHaveBeenCalled();
    });
  
    it("should not release reservation when provider usage is missing", async () => {
      createChatCompletion.mockResolvedValue({
        ...completion,
        usage: undefined,
      });
  
      await expect(processChatRequest(request)).rejects.toThrow(
        "Actual token usage missing from provider response"
      );
  
      expect(releaseBudget).not.toHaveBeenCalled();
  
      expect(calculateActualCost).not.toHaveBeenCalled();
      expect(Usage.create).not.toHaveBeenCalled();
    });
  
    it("should reject invalid token usage", async () => {
      createChatCompletion.mockResolvedValue({
        ...completion,
        usage: {
          prompt_tokens: 10,
          completion_tokens: NaN,
          total_tokens: 15,
        },
      });
  
      await expect(processChatRequest(request)).rejects.toThrow(
        "Actual token usage missing from provider response"
      );
  
      expect(calculateActualCost).not.toHaveBeenCalled();
      expect(Usage.create).not.toHaveBeenCalled();
    });
  
    it("should calculate actual cost and reconcile the reservation", async () => {
      calculateActualCost.mockReturnValue({
        costUSD: 0.002,
        costINR: 0.18,
      });
  
      await processChatRequest(request);
  
      expect(reconcileBudget).toHaveBeenCalledWith(
        request.apiKeyId,
        0.09,
        0.18
      );
  
      expect(Usage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          apiKeyId: request.apiKeyId,
          model: request.model,
          inputTokens: 10,
          outputTokens: 5,
          totalTokens: 15,
          costUSD: 0.002,
          costINR: 0.18,
        })
      );
    });
  
    it("should not release reservation if reconciliation fails after provider success", async () => {
      reconcileBudget.mockRejectedValue(
        new Error("Reconciliation failed")
      );
  
      await expect(processChatRequest(request)).rejects.toThrow(
        "Reconciliation failed"
      );
  
      // This assertion is expected to fail with the current implementation.
      expect(releaseBudget).not.toHaveBeenCalled();
      expect(Usage.create).not.toHaveBeenCalled();
    });
  
    it("should not release reservation if Usage save fails after provider success", async () => {
      Usage.create.mockRejectedValue(
        new Error("Usage save failed")
      );
  
      await expect(processChatRequest(request)).rejects.toThrow(
        "Usage save failed"
      );
  
      // This assertion is expected to fail with the current implementation.
      expect(releaseBudget).not.toHaveBeenCalled();
      expect(reconcileBudget).toHaveBeenCalled();
    });
  
    it("should not hide the original error if reservation release fails", async () => {
      createChatCompletion.mockRejectedValue(
        new Error("Provider unavailable")
      );
  
      releaseBudget.mockRejectedValue(
        new Error("Release failed")
      );
  
      const consoleErrorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});
  
      try {
        await expect(processChatRequest(request)).rejects.toThrow(
          "Provider unavailable"
        );
  
        expect(releaseBudget).toHaveBeenCalled();
        expect(consoleErrorSpy).toHaveBeenCalled();
      } finally {
        consoleErrorSpy.mockRestore();
      }
    });
  });
  
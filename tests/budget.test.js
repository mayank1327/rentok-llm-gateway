
jest.mock("../src/models/api-key.model", () => ({
    findOneAndUpdate: jest.fn(),
  }));
  
  const ApiKey = require("../src/models/api-key.model");
  const {
    reserveBudget,
    releaseBudget,
  } = require("../src/services/budget.service");
  const {
    estimateCostInUSD,
    estimateRequestCost,
    estimateInputTokens,
  } = require("../src/services/cost-estimator.service");
  
  describe("Budget Service", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });
  
    it("should reserve budget when enough budget is available", async () => {
      ApiKey.findOneAndUpdate.mockResolvedValue({
        _id: "key-1",
        budgetLimit: 100,
        spentAmount: 20,
      });
  
      const result = await reserveBudget("key-1", 10);
  
      expect(result.spentAmount).toBe(20);
      expect(ApiKey.findOneAndUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          _id: "key-1",
          isActive: true,
        }),
        { $inc: { spentAmount: 10 } },
        expect.objectContaining({ new: true })
      );
    });
  
    it("should reject when budget is insufficient", async () => {
      ApiKey.findOneAndUpdate.mockResolvedValue(null);
  
      await expect(reserveBudget("key-1", 10)).rejects.toMatchObject({
        message: "Budget limit exceeded",
        statusCode: 429,
      });
    });
  
    it("should reject zero or negative reservation amounts", async () => {
      await expect(reserveBudget("key-1", 0)).rejects.toThrow(
        "Reservation amount must be a positive number"
      );
  
      await expect(reserveBudget("key-1", -1)).rejects.toThrow(
        "Reservation amount must be a positive number"
      );
  
      expect(ApiKey.findOneAndUpdate).not.toHaveBeenCalled();
    });
  
    it("should reject non-finite reservation amounts", async () => {
      await expect(reserveBudget("key-1", NaN)).rejects.toThrow(
        "Reservation amount must be a positive number"
      );
    });
  
    it("should release a previous reservation", async () => {
      ApiKey.findOneAndUpdate.mockResolvedValue({
        _id: "key-1",
        spentAmount: 15,
      });
  
      await releaseBudget("key-1", 5);
  
      expect(ApiKey.findOneAndUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          _id: "key-1",
          spentAmount: { $gte: 5 },
        }),
        { $inc: { spentAmount: -5 } },
        expect.objectContaining({ new: true })
      );
    });
  
    it("should reject invalid release amounts", async () => {
      await expect(releaseBudget("key-1", 0)).rejects.toThrow(
        "Release amount must be a positive number"
      );
    });
  });
  
  describe("Cost Estimator", () => {
    beforeEach(() => {
      process.env.USD_TO_INR_RATE = "90";
    });
  
    it("should estimate input token count", () => {
      const messages = [
        { role: "user", content: "Hello" },
      ];
  
      expect(estimateInputTokens(messages)).toBe(3);
    });
  
    it("should calculate USD cost for the configured model", () => {
      const cost = estimateCostInUSD({
        model: "openai/gpt-oss-20b",
        inputTokens: 1_000_000,
        outputTokens: 1_000_000,
      });
  
      expect(cost).toBeCloseTo(0.375);
    });
  
    it("should reject an unconfigured model", () => {
      expect(() =>
        estimateCostInUSD({
          model: "unknown-model",
          inputTokens: 100,
          outputTokens: 100,
        })
      ).toThrow("Pricing not configured for model: unknown-model");
    });
  
    it("should estimate request cost in USD and INR", () => {
      const result = estimateRequestCost({
        model: "openai/gpt-oss-20b",
        messages: [
          { role: "user", content: "Hello" },
        ],
      });
  
      expect(result.estimatedInputTokens).toBe(3);
      expect(result.maxOutputTokens).toBe(1024);
      expect(result.estimatedCostUSD).toBeGreaterThan(0);
      expect(result.estimatedCostINR).toBeCloseTo(
        result.estimatedCostUSD * 90
      );
    });
  });
  
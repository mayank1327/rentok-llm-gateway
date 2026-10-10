require("dotenv").config();

const crypto = require("node:crypto");
const mongoose = require("mongoose");
const connectDatabase = require("../src/config/database");
const ApiKey = require("../src/models/api-key.model");

async function createApiKey() {
  try {
    await connectDatabase();

    const name = process.argv.slice(2).join(" ").trim();

    if (!name) {
      throw new Error(
        'Provide a key name, e.g. npm run create-key -- "Test Key"'
      );
    }

    const rawKey = `rk_${crypto.randomBytes(32).toString("hex")}`;

    const keyHash = crypto
      .createHash("sha256")
      .update(rawKey)
      .digest("hex");

    await ApiKey.create({
      name,
      keyHash,
    });

    console.log("\nAPI key created successfully.");
    console.log("Name:", name);
    console.log("Your API key (copy it now):", rawKey);
    console.log("Store this key securely; it won't be shown again.\n");
  } catch (error) {
    console.error("Failed to create API key:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

createApiKey();
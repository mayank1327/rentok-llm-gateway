const express = require("express");

const healthRoutes = require("./routes/health.routes");
const chatRoutes = require("./routes/chat.routes");
const errorHandler = require("./middleware/error-handler");

const app = express();

app.use(express.json());

app.use("/health", healthRoutes);
app.use("/v1/chat", chatRoutes);

app.use(errorHandler);

module.exports = app;
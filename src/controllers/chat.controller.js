const { createChatCompletion } = require("../services/groq.service");

async function createChat(req, res, next) {
  try {
    const { model, messages } = req.body;

    const completion = await createChatCompletion({
      model,
      messages,
    });

    return res.status(200).json(completion);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createChat,
};
const { ChatTogetherAI } = require("@langchain/community/chat_models/togetherai");
require('dotenv').config();

// Initialize the Together.ai model
const model = new ChatTogetherAI({
    model: "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo",
    apiKey: process.env.TOGETHER_AI_API_KEY,
    temperature: 0,
});

module.exports = { model };

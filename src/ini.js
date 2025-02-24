const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { GoogleGenerativeAIEmbeddings } = require('@langchain/google-genai');
const { AstraDBVectorStore } = require('@langchain/community/vectorstores/astradb');
const pdf = require('pdf-parse');

// Load environment variables
dotenv.config();

// Initialize Gemini embeddings
const embeddings = new GoogleGenerativeAIEmbeddings({
    apiKey: process.env.GOOGLE_API_KEY,
    modelName: "embedding-001"
});

// AstraDB configuration
const astraConfig = {
    token: process.env.ASTRA_DB_APPLICATION_TOKEN,
    endpoint: process.env.ASTRA_DB_ENDPOINT,
    collection: process.env.ASTRA_DB_COLLECTION || "pdf_chunks",
    collectionOptions: {
        vector: {
            dimension: 768,
            metric: "cosine",
        },
    },
};

// Export configured instances
module.exports = {
    fs,
    path,
    pdf,
    embeddings,
    astraConfig,
    AstraDBVectorStore
};

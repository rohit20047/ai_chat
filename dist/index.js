"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const google_genai_1 = require("@langchain/google-genai");
const astradb_1 = require("@langchain/community/vectorstores/astradb");
const dotenv = __importStar(require("dotenv"));
// Load environment variables
dotenv.config();
// Initialize embeddings
const embeddings = new google_genai_1.GoogleGenerativeAIEmbeddings({
    apiKey: process.env.GOOGLE_API_KEY,
    modelName: "embedding-001"
});
// AstraDB configuration
const astraConfig = {
    token: process.env.ASTRA_DB_APPLICATION_TOKEN,
    endpoint: process.env.ASTRA_DB_ENDPOINT,
    collection: process.env.ASTRA_DB_COLLECTION ?? "pdf_chunks",
    collectionOptions: {
        vector: {
            dimension: 768,
            metric: "cosine",
        },
    },
};
// Example async function to perform similarity search
async function performSearch(query, numResults = 3) {
    try {
        const vectorStore = await astradb_1.AstraDBVectorStore.fromExistingIndex(embeddings, astraConfig);
        const results = await vectorStore.similaritySearch(query, numResults);
        return {
            query,
            results
        };
    }
    catch (error) {
        console.error('Error performing search:', error);
        throw error;
    }
}
// Example usage
async function main() {
    try {
        const searchResult = await performSearch("What is the main topic of this document?");
        console.log('Search Results:', JSON.stringify(searchResult, null, 2));
    }
    catch (error) {
        console.error('Error in main:', error);
    }
}
// Run the main function
if (require.main === module) {
    main().catch(console.error);
}
//# sourceMappingURL=index.js.map
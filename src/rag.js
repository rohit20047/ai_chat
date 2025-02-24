const { embeddings, astraConfig, AstraDBVectorStore } = require('./ini');
const { ChatTogetherAI } = require("@langchain/community/chat_models/togetherai");
const { StringOutputParser } = require("@langchain/core/output_parsers");
const { RunnableSequence } = require("@langchain/core/runnables");
const { formatDocumentsAsString } = require("langchain/util/document");
const { ChatPromptTemplate } = require("@langchain/core/prompts");
const { z } = require("zod");
const { zodToJsonSchema } = require("zod-to-json-schema");
require('dotenv').config();

// Define response schemas
const technicalDocsResponseSchema = z.object({
    type: z.literal("TECHNICAL_WITH_DOCS"),
    priority: z.string().default("HIGH - Documentation Available"),
    responseTime: z.string().default("Immediate - Using Available Documentation"),
    answer: z.string(),
    confidence: z.number().min(0).max(1).default(0.95),
    sourcesUsed: z.number().default(1),
    relevantDocs: z.array(z.string()).default([])
});

const technicalNonDocsResponseSchema = z.object({
    type: z.literal("TECHNICAL_NO_DOCS"),
    message: z.string(),
    contactInfo: z.object({
        email: z.string(),
        phone: z.string(),
        supportHours: z.string()
    }),
    ticketPriority: z.string()
});

const billingResponseSchema = z.object({
    type: z.literal("BILLING"),
    message: z.string(),
    contactInfo: z.object({
        email: z.string(),
        phone: z.string(),
        hours: z.string()
    }),
    securityNote: z.string()
});

const irrelevantResponseSchema = z.object({
    type: z.literal("IRRELEVANT"),
    message: z.string(),
    suggestion: z.string(),
    availableCategories: z.array(z.string())
});

// Initialize the Together.ai model
const model = new ChatTogetherAI({
    model: "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo",
    apiKey: process.env.TOGETHER_AI_API_KEY,
    temperature: 0,
});

// Create the retriever
async function createRetriever() {
    const vectorStore = await AstraDBVectorStore.fromExistingIndex(
        embeddings,
        astraConfig
    );
    return vectorStore;
}

// Function to check document relevance
async function checkDocumentRelevance(query, context) {
    const relevancePrompt = ChatPromptTemplate.fromTemplate(`
    Analyze if the following context contains relevant information to answer the query.
    This is our highest priority check - if there's ANY relevant information in the context that could help answer the query, respond with YES.
    Even partial matches should be considered relevant.

    Query: {query}
    
    Context: {context}
    
    Respond with just one word: YES or NO.
    `);

    const relevanceChain = RunnableSequence.from([
        relevancePrompt,
        model,
        new StringOutputParser()
    ]);

    const relevanceCheck = await relevanceChain.invoke({
        query: query,
        context: context
    });

    return relevanceCheck.trim().toUpperCase() === 'YES';
}

// Function to classify query type
async function classifyQuery(query, context = "") {
    // First, check if we have relevant documentation
    const hasRelevantDocs = await checkDocumentRelevance(query, context);
    
    // If we have relevant docs, prioritize it as TECHNICAL_WITH_DOCS
    if (hasRelevantDocs) {
        return "TECHNICAL_WITH_DOCS";
    }

    const classificationPrompt = ChatPromptTemplate.fromTemplate(`
    Analyze the following query to classify it into one of these categories.
    Note: Documentation-based queries have already been handled, so focus on other aspects.

    Categories:
    - TECHNICAL_NO_DOCS: If it's a technical question (but we've already determined no relevant docs exist)
    - BILLING: If it's related to payments, payment methods, invoices, charges, refunds, pricing, or any financial matters
    - IRRELEVANT: If it doesn't fit any of the above categories or is completely unrelated
    
    Query: {query}
    
    Respond with just one word: TECHNICAL_NO_DOCS, BILLING, or IRRELEVANT.
    `);

    const classificationChain = RunnableSequence.from([
        classificationPrompt,
        model,
        new StringOutputParser()
    ]);

    const classification = await classificationChain.invoke({
        query: query
    });

    return classification.trim().toUpperCase();
}

// Create prompt template for technical queries with docs
const technicalDocsPrompt = ChatPromptTemplate.fromTemplate(`
You are a technical support AI assistant. Use the following context to answer the technical question.
If the context contains relevant information, provide a detailed response.

Context: {context}

Question: {question}

Provide a response in JSON format with these exact fields:
- type: Always "TECHNICAL_WITH_DOCS"
- priority: "HIGH - Documentation Available"
- responseTime: "Immediate - Using Available Documentation"
- answer: A detailed answer based on the context
- confidence: A number between 0 and 1 indicating confidence
- sourcesUsed: Number of relevant sources used
- relevantDocs: Array of relevant document snippets used

Remember to format as pure JSON without any markdown or code blocks.
`);

// Function to handle query based on classification
async function handleQuery(query, queryType, context) {
    switch (queryType) {
        case 'TECHNICAL_WITH_DOCS':
            try {
                const systemPrompt = {
                    role: "system",
                    content: "You are a technical support AI. You must return a valid JSON response with the exact structure provided. Do not include any additional formatting or explanation."
                };

                const userPrompt = {
                    role: "user",
                    content: `Context: ${context}\n\nQuestion: ${query}\n\nProvide your response in this EXACT JSON structure (no additional text or formatting):\n{"type":"TECHNICAL_WITH_DOCS","priority":"HIGH - Documentation Available","responseTime":"Immediate - Using Available Documentation","answer":"your answer here","confidence":0.95,"sourcesUsed":1,"relevantDocs":[]}`
                };

                const response = await model.invoke([systemPrompt, userPrompt]);
                
                let parsedResponse;
                try {
                    // First attempt: direct parse
                    parsedResponse = JSON.parse(response.content);
                } catch (parseError) {
                    try {
                        // Second attempt: clean and parse
                        const cleaned = response.content
                            .replace(/```json\s*|\s*```/g, '')  // Remove markdown
                            .replace(/[\u201C\u201D]/g, '"')    // Replace smart quotes
                            .replace(/[\r\n]/g, '')            // Remove newlines
                            .replace(/\s+/g, ' ')              // Normalize spaces
                            .trim();
                        parsedResponse = JSON.parse(cleaned);
                    } catch (secondError) {
                        console.error("Failed both parse attempts:", secondError);
                        throw new Error("Could not parse response");
                    }
                }

                // Ensure we have the minimum required fields
                if (!parsedResponse.answer) {
                    throw new Error("Response missing required fields");
                }

                // Return a properly structured response
                return {
                    type: "TECHNICAL_WITH_DOCS",
                    priority: "HIGH - Documentation Available",
                    responseTime: "Immediate - Using Available Documentation",
                    answer: parsedResponse.answer,
                    confidence: typeof parsedResponse.confidence === 'number' ? parsedResponse.confidence : 0.95,
                    sourcesUsed: typeof parsedResponse.sourcesUsed === 'number' ? parsedResponse.sourcesUsed : 1,
                    relevantDocs: Array.isArray(parsedResponse.relevantDocs) ? parsedResponse.relevantDocs : []
                };

            } catch (error) {
                console.error("Error handling technical docs response:", error);
                return {
                    type: "TECHNICAL_NO_DOCS",
                    message: "Unable to process the technical documentation response. Redirecting to support.",
                    contactInfo: {
                        email: "tech@support.com",
                        phone: "1-800-XXX-YYYY",
                        supportHours: "24/7"
                    },
                    ticketPriority: "High"
                };
            }
        
        case 'TECHNICAL_NO_DOCS':
            return {
                type: "TECHNICAL_NO_DOCS",
                message: "Your technical question requires specialized attention as it's not covered in our documentation.",
                contactInfo: {
                    email: "tech@support.com",
                    phone: "1-800-XXX-YYYY",
                    supportHours: "24/7"
                },
                ticketPriority: "High"
            };
        
        case 'BILLING':
            return {
                type: "BILLING",
                message: "For your security, billing inquiries must be handled through our secure billing channels.",
                contactInfo: {
                    email: "billing@support.com",
                    phone: "1-800-XXX-XXXX",
                    hours: "Monday-Friday, 9 AM - 5 PM EST"
                },
                securityNote: "Never share payment information through unsecured channels."
            };
        
        case 'IRRELEVANT':
            return {
                type: "IRRELEVANT",
                message: "Your query doesn't match our supported categories or may be outside our scope.",
                suggestion: "Please rephrase your question or choose from our available support categories.",
                availableCategories: [
                    "Technical Support",
                    "Billing & Payments",
                    "Product Information"
                ]
            };
    }
}

const documentService = require('./services/documentService');
const classificationService = require('./services/classificationService');
const responseService = require('./services/responseService');

async function askQuestion(query) {
    try {
        console.log("Analyzing query type...");
        
        // Get relevant documents
        const context = await documentService.getRelevantDocuments(query);
        
        // Classify the query
        const queryType = await classificationService.classifyQuery(query, context);
        console.log("Query classified as:", queryType);
        
        // Handle the query based on its type
        const response = await responseService.handleQuery(query, queryType, context);
        
        console.log("\nResponse:", JSON.stringify(response, null, 2));
        console.log("\n---");
        
        return response;
    } catch (error) {
        console.error("Error processing query:", error);
        return {
            type: "ERROR",
            message: "An error occurred while processing your query.",
            error: error.message
        };
    }
}

// Export the main function
module.exports = { askQuestion };

// Example questions to test the system
async function main() {
    const questions = [
        
        " How long does it take for a product inquiry to receive a response? "
    ]

    for (const question of questions) {
        await askQuestion(question);
        console.log("\n---\n");
    }
}

// Run the system
main().catch(console.error);

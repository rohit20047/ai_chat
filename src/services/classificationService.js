const { ChatPromptTemplate } = require("@langchain/core/prompts");
const { StringOutputParser } = require("@langchain/core/output_parsers");
const { RunnableSequence } = require("@langchain/core/runnables");
const { model } = require('../config/modelConfig');

class ClassificationService {
    async checkDocumentRelevance(query, context) {
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

    async classifyQuery(query, context = "") {
        // First, check if we have relevant documentation
        const hasRelevantDocs = await this.checkDocumentRelevance(query, context);
        
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
}

module.exports = new ClassificationService();

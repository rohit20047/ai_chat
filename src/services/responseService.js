const { model } = require('../config/modelConfig');

class ResponseService {
    async handleTechnicalWithDocs(query, context) {
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

            if (!parsedResponse.answer) {
                throw new Error("Response missing required fields");
            }

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
            return this.handleTechnicalNoDocs();
        }
    }

    handleTechnicalNoDocs() {
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
    }

    handleBilling() {
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
    }

    handleIrrelevant() {
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

    async handleQuery(query, queryType, context) {
        switch (queryType) {
            case 'TECHNICAL_WITH_DOCS':
                return await this.handleTechnicalWithDocs(query, context);
            case 'TECHNICAL_NO_DOCS':
                return this.handleTechnicalNoDocs();
            case 'BILLING':
                return this.handleBilling();
            case 'IRRELEVANT':
                return this.handleIrrelevant();
            default:
                return this.handleIrrelevant();
        }
    }
}

module.exports = new ResponseService();

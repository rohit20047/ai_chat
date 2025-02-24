const { embeddings, astraConfig, AstraDBVectorStore } = require('../ini');
const { formatDocumentsAsString } = require("langchain/util/document");

class DocumentService {
    async createRetriever() {
        const vectorStore = await AstraDBVectorStore.fromExistingIndex(
            embeddings,
            astraConfig
        );
        return vectorStore;
    }

    async getRelevantDocuments(query) {
        const vectorStore = await this.createRetriever();
        const relevantDocs = await vectorStore.asRetriever(5).getRelevantDocuments(query);
        return formatDocumentsAsString(relevantDocs);
    }
}

module.exports = new DocumentService();

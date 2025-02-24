const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');
const dotenv = require('dotenv');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { GoogleGenerativeAIEmbeddings } = require('@langchain/google-genai');
const { AstraDBVectorStore } = require('@langchain/community/vectorstores/astradb');

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

// Function to split text into chunks
function splitIntoChunks(text, chunkSize = 1000) {
    const chunks = [];
    const words = text.split(' ');
    let currentChunk = '';

    for (const word of words) {
        if ((currentChunk + ' ' + word).length <= chunkSize) {
            currentChunk += (currentChunk ? ' ' : '') + word;
        } else {
            chunks.push(currentChunk);
            currentChunk = word;
        }
    }
    
    if (currentChunk) {
        chunks.push(currentChunk);
    }

    return chunks;
}

// Function to store chunks in AstraDB
async function storeChunksInAstraDB(chunks) {
    try {
        // Create metadata for each chunk
        const metadata = chunks.map((_, index) => ({ chunk_id: index }));

        // Store chunks in AstraDB
        const vectorStore = await AstraDBVectorStore.fromTexts(
            chunks,
            metadata,
            embeddings,
            astraConfig
        );

        console.log(`Successfully stored ${chunks.length} chunks in AstraDB`);
        
        // Example similarity search
        const query = "What is the main topic of this document?";
        const searchResults = await vectorStore.similaritySearch(query, 3);
        console.log("\nExample similarity search results:", searchResults);

    } catch (error) {
        console.error('Error storing chunks in AstraDB:', error);
        throw error;
    }
}

// Function to process a PDF file
async function processPDF(pdfPath) {
    try {
        console.log('Reading PDF file:', pdfPath);
        // Read the PDF file
        const dataBuffer = fs.readFileSync(pdfPath);
        
        console.log('Parsing PDF content...');
        // Parse PDF content
        const data = await pdf(dataBuffer);
        
        // Get the text content
        const text = data.text;
        console.log('Extracted text length:', text.length);
        
        // Split into chunks
        const chunks = splitIntoChunks(text);
        console.log('Created chunks:', chunks.length);
        
        // Create output directory if it doesn't exist
        const outputDir = path.join(__dirname, '..', 'output');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir);
        }
        
        // Save chunks to separate files
        const fileName = path.basename(pdfPath, '.pdf');
        chunks.forEach((chunk, index) => {
            const outputPath = path.join(outputDir, `${fileName}_chunk_${index + 1}.txt`);
            fs.writeFileSync(outputPath, chunk);
            console.log(`Created chunk ${index + 1}: ${outputPath}`);
        });

        console.log('Storing chunks in AstraDB...');
        // Store chunks in AstraDB
        await storeChunksInAstraDB(chunks);

        console.log(`\nProcessing complete! Total chunks created and stored: ${chunks.length}`);
        
    } catch (error) {
        console.error('Error processing PDF:', error);
        throw error;
    }
}

// Function to process all PDFs in a directory
async function processAllPDFs() {
    const rootDir = path.join(__dirname, '..');
    
    try {
        console.log('Scanning directory for PDFs:', rootDir);
        const files = fs.readdirSync(rootDir);
        const pdfFiles = files.filter(file => path.extname(file).toLowerCase() === '.pdf');
        
        if (pdfFiles.length === 0) {
            console.log('No PDF files found in the root directory');
            return;
        }

        console.log(`Found ${pdfFiles.length} PDF file(s):`, pdfFiles);
        
        for (const pdfFile of pdfFiles) {
            const pdfPath = path.join(rootDir, pdfFile);
            console.log(`\nProcessing: ${pdfFile}`);
            await processPDF(pdfPath);
        }

    } catch (error) {
        console.error('Error reading directory:', error);
    }
}

// Run the script
processAllPDFs();
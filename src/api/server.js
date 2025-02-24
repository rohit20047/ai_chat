const express = require('express');
const cors = require('cors');
const { askQuestion } = require('../rag');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Main query endpoint
app.post('/api/query', async (req, res) => {
    try {
        const { query } = req.body;
        
        if (!query || typeof query !== 'string') {
            return res.status(400).json({
                error: 'Invalid request',
                message: 'Query must be a non-empty string'
            });
        }

        const response = await askQuestion(query);
        res.json(response);
    } catch (error) {
        console.error('Error processing query:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: 'Internal server error',
        message: err.message
    });
});

const PORT = process.env.PORT || 3000;

// Start server
function startServer() {
    try {
        app.listen(PORT, () => {
            console.log(`Server is running on http://localhost:${PORT}`);
            console.log(`Health check: http://localhost:${PORT}/api/health`);
            console.log(`Query endpoint: http://localhost:${PORT}/api/query`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Export for testing purposes
module.exports = { app, startServer };

// Start the server if this file is run directly
if (require.main === module) {
    startServer();
}

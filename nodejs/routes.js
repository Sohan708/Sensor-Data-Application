/**
 * API routes for the server
 */
const express = require('express');
const router = express.Router();
const apiClient = require('./apiClient');

// API status endpoint
router.get('/status', (req, res) => {
    const bufferStatus = apiClient.getBufferStatus();
    
    res.json({
        status: 'running',
        bufferedData: bufferStatus.bufferedData,
        isProcessing: bufferStatus.isProcessing,
        lastUpdated: new Date().toISOString()
    });
});

module.exports = router;

/**
 * API Client module for sending sensor data to the remote API
 */
const fetch = require('node-fetch');
const config = require('./config');

// Buffer to store data if API is unavailable
let dataBuffer = [];
let isProcessing = false;

/**
 * Send data to the API with retry mechanism
 * @param {Object} data - Sensor data to send
 * @param {number} retry - Current retry attempt
 */
async function sendToAPI(data, retry = 0) {
    try {
        const response = await fetch(config.api.url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data),
            timeout: 10000 // 10 seconds timeout
        });

        if (!response.ok) {
            throw new Error(`API responded with status: ${response.status}`);
        }

        console.log(`Successfully sent data to API: ${data.sensor_id} at ${data.date}`);
    } catch (error) {
        console.error(`Error sending data to API (attempt ${retry + 1}/${config.api.retryLimit}):`, error.message);
        
        if (retry < config.api.retryLimit) {
            console.log(`Retrying in ${config.api.retryDelay / 1000} seconds...`);
            setTimeout(() => sendToAPI(data, retry + 1), config.api.retryDelay);
        } else {
            console.log('Adding to buffer after max retries');
            dataBuffer.push(data);
            // Process buffer later
            if (!isProcessing) processBuffer();
        }
    }
}

/**
 * Process buffered data items one by one
 */
async function processBuffer() {
    if (dataBuffer.length === 0 || isProcessing) {
        return;
    }

    isProcessing = true;
    console.log(`Processing buffered data. Items in buffer: ${dataBuffer.length}`);

    try {
        // Take first item from buffer
        const data = dataBuffer[0];
        
        const response = await fetch(config.api.url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data),
            timeout: 10000
        });

        if (response.ok) {
            console.log(`Successfully sent buffered data to API: ${data.sensor_id} at ${data.date}`);
            dataBuffer.shift(); // Remove from buffer
        } else {
            console.log(`API still not responding correctly. Will retry later.`);
            isProcessing = false;
            return;
        }
    } catch (error) {
        console.error('Error processing buffer:', error.message);
        isProcessing = false;
        return;
    }

    isProcessing = false;
    
    // If there are more items in buffer, process next after delay
    if (dataBuffer.length > 0) {
        setTimeout(processBuffer, 5000);
    } else {
        console.log('Buffer empty.');
    }
}

/**
 * Get the current buffer status
 */
function getBufferStatus() {
    return {
        bufferedData: dataBuffer.length,
        isProcessing
    };
}

module.exports = {
    sendToAPI,
    processBuffer,
    getBufferStatus
};

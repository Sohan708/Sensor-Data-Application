/**
 * Pipe Reader module for reading data from the named pipe
 */
const fs = require('fs');
const config = require('./config');
const apiClient = require('./apiClient');

let pipeReader = null;

/**
 * Set up the reader for the named pipe
 */
function setupPipeReader() {
    console.log(`Setting up pipe reader for ${config.pipe}`);
    
    // Check if pipe exists
    try {
        if (!fs.existsSync(config.pipe)) {
            console.log(`Pipe ${config.pipe} does not exist. Waiting for it to be created...`);
            setTimeout(setupPipeReader, 5000);
            return;
        }

        pipeReader = fs.createReadStream(config.pipe, { encoding: 'utf8' });
        console.log('Pipe reader created successfully');

        let buffer = '';

        pipeReader.on('data', (chunk) => {
            buffer += chunk;
            
            // Process complete JSON objects
            const endIndex = buffer.lastIndexOf('}');
            if (endIndex !== -1) {
                const jsonStr = buffer.substring(0, endIndex + 1);
                buffer = buffer.substring(endIndex + 1);
                
                try {
                    const data = JSON.parse(jsonStr);
                    console.log(`Received data from sensor: ${data.sensor_id} at ${data.date}`);
                    apiClient.sendToAPI(data);
                } catch (error) {
                    console.error('Error parsing JSON:', error);
                }
            }
        });

        pipeReader.on('error', (err) => {
            console.error('Error reading from pipe:', err);
            pipeReader.close();
            // Try to reestablish connection after delay
            setTimeout(setupPipeReader, 5000);
        });

        pipeReader.on('end', () => {
            console.log('Pipe ended. Reopening...');
            pipeReader.close();
            // Try to reestablish connection after delay
            setTimeout(setupPipeReader, 5000);
        });
    } catch (err) {
        console.error('Error setting up pipe reader:', err);
        setTimeout(setupPipeReader, 5000);
    }
}

/**
 * Close the pipe reader
 */
function closePipeReader() {
    if (pipeReader) {
        pipeReader.close();
        pipeReader = null;
    }
}

module.exports = {
    setupPipeReader,
    closePipeReader
};

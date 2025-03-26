/**
 * D6T Temperature Sensor Data Forwarder
 * Main application file
 */
const express = require('express');
const config = require('./config');
const pipeReader = require('./pipeReader');
const routes = require('./routes');

// Create Express application
const app = express();
app.use(express.json());

// Register routes
app.use('/', routes);

// Start Express server
app.listen(config.port, () => {
    console.log(`Server running on port ${config.port}`);
    console.log(`Configured to forward data to: ${config.api.url}`);
    console.log('Setting up pipe reader...');
    pipeReader.setupPipeReader();
});

// Handle process termination
process.on('SIGINT', () => {
    console.log('Shutting down...');
    pipeReader.closePipeReader();
    process.exit(0);
});

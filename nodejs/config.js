/**
 * Configuration for the Sensor Data Forwarder application
 */
module.exports = {
    pipe: '/tmp/sensor_data_pipe',
    port: 3000,
    api: {
        url: 'http://192.168.5.117:3000/temperature-data',  // Windows IP Address
        retryLimit: 5,
        retryDelay: 3000  // 3 seconds
    }
};

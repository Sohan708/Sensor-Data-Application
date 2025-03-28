/**
 * Combined schema and utilities for sensor data processing
 * Contains functionality for date formatting, anomaly detection, and schema definitions
 */
const moment = require('moment');
const config = require('./config');

// ===== DATE UTILITIES =====

/**
 * Format date and time according to the required format
 * @param {Date} dateObj - Date object to format 
 * @returns {Object} - Formatted date and time strings
 */
function formatDateTime(dateObj) {
    const momentDate = moment(dateObj);
    return {
        date: momentDate.format('YYYY/MM/DD'),
        time: momentDate.format('HH:mm:ss.SSS'),
        created_at: momentDate.format('YYYY/MM/DD HH:mm:ss.SSS')
    };
}

/**
 * Get current date and time formatted according to schema requirements
 * @returns {Object} - Formatted current date and time
 */
function getCurrentDateTime() {
    return formatDateTime(new Date());
}

// ===== ANOMALY DETECTION =====

/**
 * Check if temperature data contains anomalies
 * @param {Array} temperatureData - Array of temperature readings
 * @returns {Object} - Anomaly detection result
 */
function detectAnomalies(temperatureData) {
    let isAbnormal = false;
    let anomalyReason = '';
    
    // Check for too low temperatures
    const minTemp = Math.min(...temperatureData);
    if (minTemp < config.temperature.minNormal) {
        isAbnormal = true;
        anomalyReason = `Temperature exceeded ${config.temperature.minNormal}°C above`;
    }
    
    // Check for too high temperatures
    const maxTemp = Math.max(...temperatureData);
    if (maxTemp > config.temperature.maxNormal) {
        isAbnormal = true;
        anomalyReason = `Temperature exceeded ${config.temperature.maxNormal}°C up`;
    }
    
    return {
        isAbnormal,
        anomalyReason,
        minTemp,
        maxTemp
    };
}

/**
 * Get alert status text based on anomaly state
 * @param {Boolean} isAbnormal - Whether the temperature is abnormal
 * @returns {String} - 'active' or 'recovered'
 */
function getAlertStatus(isAbnormal) {
    return isAbnormal ? 'active' : 'recovered';
}

// ===== TEMPERATURE DATA SCHEMA =====

/**
 * Create a temperature reading document according to schema
 * @param {Object} data - Raw temperature data
 * @param {Boolean} isAbnormal - Whether the temperature is abnormal
 * @returns {Object} - Formatted temperature reading document
 */
function createTemperatureDocument(data, isAbnormal = false) {
    // Ensure sensor_id is present
    const sensorId = data.sensor_id || 'D6T-001';
    
    // Get formatted date and time
    const dateObj = data.timestamp ? new Date(data.timestamp) : new Date();
    const dateTime = formatDateTime(dateObj);
    
    // Ensure temperature data is an array
    let temperatureData = data.temperature_data;
    if (!Array.isArray(temperatureData) && typeof data.temperature !== 'undefined') {
        // Convert single temperature value to array if needed
        temperatureData = [data.temperature];
    }
    
    // Create the document according to schema
    return {
        sensor_id: sensorId,
        date: dateTime.date,
        time: dateTime.time,
        temperature_data: temperatureData,
        alert_flag: isAbnormal ? 1 : 0,
        created_at: dateTime.created_at
    };
}

// ===== ALERTS LOG SCHEMA =====

/**
 * Create an alert document according to schema
 * @param {Object} data - Sensor data
 * @param {Boolean} isAbnormal - Whether the temperature is abnormal
 * @param {String} reason - Reason for the alert or recovery
 * @returns {Object} - Formatted alert document
 */
function createAlertDocument(data, isAbnormal, reason) {
    // Ensure sensor_id is present
    const sensorId = data.sensor_id || 'D6T-001';
    
    // Get formatted date and time
    const dateObj = data.timestamp ? new Date(data.timestamp) : new Date();
    const dateTime = formatDateTime(dateObj);
    
    // Create the document according to schema
    return {
        sensor_id: sensorId,
        date: dateTime.date,
        time: dateTime.time,
        alert_reason: reason,
        status: isAbnormal ? 'active' : 'recovered',
        created_at: dateTime.created_at
    };
}

module.exports = {
    // Date utilities
    formatDateTime,
    getCurrentDateTime,
    
    // Anomaly detection
    detectAnomalies,
    getAlertStatus,
    
    // Schema functions
    createTemperatureDocument,
    createAlertDocument
};

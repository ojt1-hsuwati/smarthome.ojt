const mongoose = require('mongoose');

// Define schema for sensor data
const sensorDataSchema = new mongoose.Schema({
  temperature: { type: String, required: true },
  humidity: { type: String, required: true },
  distance: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

// Create and export the model
const SensorData = mongoose.model('SensorData', sensorDataSchema);
module.exports = SensorData;
const mongoose = require('mongoose');

// Define schema for relay control actions
const relayControlSchema = new mongoose.Schema({
  relay: { type: String, required: true },
  state: { type: String, required: true },  // 'on' or 'off'
  timestamp: { type: Date, default: Date.now },
});

// Create and export the model
const RelayControl = mongoose.model('RelayControl', relayControlSchema);
module.exports = RelayControl;
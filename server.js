const express = require('express');
const mqtt = require('mqtt');
const http = require('http');
const cors = require('cors');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const SensorData = require('./models/SensorData');
const RelayControl = require('./models/RelayControl');
const moment = require('moment');
const app = express();

const server = http.createServer(app);
const io = socketIo(server);

// Middleware
app.use(express.json());
app.use(express.static('public')); // Serve frontend

// MQTT Setup
const mqttBrokerUrl = 'mqtt://127.0.0.1:1883'; 
const mqttClient = mqtt.connect(mqttBrokerUrl, {
  username: 'smarthome',
  password: 'asdffdsa',
});

const topics = {
  temperature: 'home/sensors/temperature',
  humidity: 'home/sensors/humidity',
  distance: 'home/sensors/distance',
  date: 'home/sensors/date',
  relayControl: 'home/relays/control',
};

// MongoDB Connection with Retry
const mongooseRetry = async () => {
  let connected = false;
  while (!connected) {
    try {
      await mongoose.connect('mongodb://127.0.0.1:27017/smarthome', {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 30000,
        socketTimeoutMS: 45000,
      });
      console.log('Connected to MongoDB');
      connected = true;
    } catch (err) {
      console.log('MongoDB connection error:', err);
      console.log('Retrying in 5 seconds...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
};

mongooseRetry();

// MQTT Subscription
mqttClient.on('connect', () => {
  console.log('MQTT connected');
  mqttClient.subscribe(Object.values(topics), (err) => {
    if (err) console.error('Subscription error:', err);
  });
});

// Handle MQTT Messages
mqttClient.on('message', (topic, message) => {
  const data = message.toString();
  console.log(`MQTT message: ${topic} -> ${data}`);

  if (topic === topics.relayControl) {
    const relayState = JSON.parse(data);
    const buttonColor = relayState.state === 'on' ? 'green' : 'red';
    io.emit('buttonColorChange', { color: buttonColor, relay: relayState.relay });

    const relayControl = new RelayControl({
      relay: relayState.relay,
      state: relayState.state,
    });

    relayControl.save()
      .then(() => console.log('Relay control saved'))
      .catch(err => console.log('Error saving relay control data:', err));
  }

  if (topic === topics.temperature || topic === topics.humidity || topic === topics.distance || topic === topics.date) {
    const sensorData = new SensorData({
      temperature: topic === topics.temperature ? data : 'N/A',
      humidity: topic === topics.humidity ? data : 'N/A',
      distance: topic === topics.distance ? data : 'N/A',
      date: topic === topics.date ? data : 'N/A',
    });

    sensorData.save()
      .then(() => console.log('Sensor data saved'))
      .catch(err => console.log('Error saving sensor data:', err));

    const currentDate = moment(new Date()).format("DD.MM.YYYY hh:mm:ss A");
    io.emit('sensorData', { topic, data: currentDate });
  }
});

// API for Relay Control
app.post('/api/relay', (req, res) => {
  const { relay, state } = req.body;
  if (!relay || !['on', 'off'].includes(state)) {
    return res.status(400).send({ error: 'Invalid parameters' });
  }

  const controlMessage = JSON.stringify({ relay, state });
  mqttClient.publish(topics.relayControl, controlMessage, (err) => {
    if (err) return res.status(500).send({ error: 'Failed to publish' });
    res.send({ message: 'Relay command sent', controlMessage });
  });
});

// API for retrieving sensor data
app.get('/api/sensors', (req, res) => {
  SensorData.find()
    .sort({ timestamp: -1 })
    .limit(10)
    .then(data => res.json(data))
    .catch(err => res.status(500).send({ error: 'Error fetching sensor data' }));
});

// Start Server
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server running at http://127.0.0.1:${PORT}`);
});
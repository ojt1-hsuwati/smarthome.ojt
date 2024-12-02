const express = require('express');
const mqtt = require('mqtt');
const http = require('http');
const cors = require('cors');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const SensorData = require('./models/SensorData'); // Import SensorData model
const RelayControl = require('./models/RelayControl'); // Import RelayControl model
const moment = require('moment');
const app = express();


const server = http.createServer(app);
const io = socketIo(server);

const socket = io('http://192.168.0.118:1883', {
  transports: ['websocket', 'polling'], // Ensure compatibility
});

socket.on('connect', () => {
  console.log('Connected to the server');
});
// Middleware
// app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Serve frontend

// MQTT Setup
const mqttBrokerUrl = 'mqtt://192.168.0.118:1883'; 
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

//MongoDB Connection
mongoose.connect('mongodb://192.168.0.118:27017/smarthome')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.log('MongoDB connection error:', err));

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
      console.log(topics.relayControl);
      // Parse the relay control message to change the button color
      const relayState = JSON.parse(data);
      const buttonColor = relayState.state === 'on' ? 'green' : 'red'; // Green for "on", red for "off"

    // Emit relay control message to frontend with the button color
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
    // Store sensor data in MongoDB
    const sensorData = new SensorData({
      temperature: topic === topics.temperature ? data : 'N/A',
      humidity: topic === topics.humidity ? data : 'N/A',
      distance: topic === topics.distance ? data : 'N/A',
      date: topic === topics.date ? data : 'N/A',
    });

    sensorData.save()
      .then(() => console.log('Sensor data saved'))
      .catch(err => console.log('Error saving sensor data:', err));

// Send the current date immediately to the connected client
  const initialDate = moment(new Date()).format("DD.MM.YYYY hh:mm:ss A");
  io.emit('sensorData', { topic: 'topic', data: initialDate });

      if (topic == topics.date){
// Start sending real-time date updates every second
      const intervalId = setInterval(() => {
      const currentDate = moment(new Date()).format("DD.MM.YYYY hh:mm:ss A");
      io.emit('sensorData', { topic: 'topic', data: currentDate });
  }, 1000);
      } else {
      io.emit('sensorData', { topic, data });
}
  }
});
  

// API for Relay Control
app.post('/api/relay', (req, res) => {
  const { relay, state } = req.body; // { relay: "light", state: "on" }
  if (!relay || !['on', 'off'].includes(state)) {
    return res.status(400).send({ error: 'Invalid parameters' });
  }

  const controlMessage = JSON.stringify({ relay, state });
  mqttClient.publish(topics.relayControl, controlMessage, (err) => {
    if (err) return res.status(500).send({ error: 'Failed to publish' });
    res.send({ message: 'Relay command sent', controlMessage });
  });
});

// API for retrieving sensor data (for frontend)
app.get('/api/sensors', (req, res) => {
  SensorData.find()
    .sort({ timestamp: -1 })
    .limit(10)  // Get the latest 10 sensor readings
    .then(data => res.json(data))
    .catch(err => res.status(500).send({ error: 'Error fetching sensor data' }));
});

// Start Server
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server running at http://192.168.0.118:${PORT}`);
});
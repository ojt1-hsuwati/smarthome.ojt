import mqtt from 'mqtt';

const SENSOR_TOPIC = 'esp32/sensors';
const CONTROL_TOPIC = 'esp32/controls';

// MQTT Broker Configuration
export const client = mqtt.connect('mqtt://192.168.0.118:1883', {
  username: 'smarthome',
  password: 'asdffdsa',
});

// Connect to MQTT Broker
export const connect = () => {
  console.log('Connected to MQTT broker.');
  client.subscribe(SENSOR_TOPIC, (err) => {
    if (err) {
      console.error('Failed to subscribe to topic:', err);
    } else {
      console.log(`Subscribed to topic: ${SENSOR_TOPIC}`);
    }
  });
};

// Listen for Incoming Messages
export const message = () => {
  client.on('message', (topic, message) => {
    console.log(`Message received on topic ${topic}: ${message.toString()}`);
    if (topic === SENSOR_TOPIC) {
      // Parse incoming sensor data
      const sensorData = JSON.parse(message.toString());
      console.log('Sensor Data:', sensorData);

      // Example: Publish control message based on sensor data
      if (sensorData.temperature > 30) {
        const controlMessage = JSON.stringify({ relay1: true });
        client.publish(CONTROL_TOPIC, controlMessage);
        console.log('Published control message:', controlMessage);
      }
    }
  });
};

// Handle Errors
client.on('error', (err) => {
  console.error('MQTT error:', err);
});

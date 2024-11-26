const apiUrl = 'http://192.168.0.113:3000';

// Fetch sensor data
async function fetchSensorData() {
  try {
    const response = await fetch(`${apiUrl}/sensors`);
    const data = await response.json();
    document.getElementById('temperature').textContent = data.temperature;
    document.getElementById('humidity').textContent = data.humidity;
    document.getElementById('distance').textContent = data.distance;
  } catch (error) {
    console.error('Error fetching sensor data:', error);
  }
}

// Toggle relay state
async function toggleRelay(relay, state) {
  try {
    const response = await fetch(`${apiUrl}/relay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ relay, state }),
    });
    const message = await response.text();
    alert(message);
  } catch (error) {
    console.error('Error toggling relay:', error);
  }
}

// Refresh sensor data every 5 seconds
setInterval(fetchSensorData, 5000);
fetchSensorData();
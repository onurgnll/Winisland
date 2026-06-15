const { execFile } = require('child_process');
const https = require('https');
const { getResourcePath } = require('./paths');

const WEATHER_CODES = {
  0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️',
  45: '🌫️', 48: '🌫️', 51: '🌦️', 53: '🌦️', 55: '🌧️',
  61: '🌧️', 63: '🌧️', 65: '🌧️', 71: '🌨️', 73: '🌨️', 75: '🌨️',
  80: '🌦️', 81: '🌧️', 82: '⛈️', 95: '⛈️', 96: '⛈️', 99: '⛈️',
};

function httpGet(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'Winisland/1.0' } }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (err) {
          reject(err);
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(12000, () => {
      req.destroy(new Error('timeout'));
    });
  });
}

function getWindowsLocation() {
  const scriptPath = getResourcePath('scripts', 'get-location.ps1');

  return new Promise((resolve, reject) => {
    execFile(
      'powershell',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', scriptPath],
      { windowsHide: true, timeout: 20000 },
      (err, stdout) => {
        if (err) return reject(err);
        const parts = stdout.trim().split(',');
        if (parts.length !== 2) return reject(new Error('invalid coords'));
        const lat = parseFloat(parts[0]);
        const lon = parseFloat(parts[1]);
        if (Number.isNaN(lat) || Number.isNaN(lon)) return reject(new Error('invalid coords'));
        resolve({ lat, lon });
      },
    );
  });
}

async function getIpLocation() {
  const data = await httpGet('http://ip-api.com/json/?fields=status,city,lat,lon&lang=tr');
  if (data.status !== 'success' || !data.lat || !data.lon) throw new Error('no ip location');
  return {
    lat: data.lat,
    lon: data.lon,
    city: data.city,
  };
}

async function reverseGeocode(lat, lon) {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=tr&zoom=10`;
  const data = await httpGet(url);
  const city = data.address?.city
    || data.address?.town
    || data.address?.province
    || data.address?.state
    || data.address?.county
    || 'Konum';
  return city;
}

async function fetchWeather(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=auto`;
  const data = await httpGet(url);
  const temp = Math.round(data.current?.temperature_2m ?? 0);
  const code = data.current?.weather_code ?? 0;
  return {
    temp,
    icon: WEATHER_CODES[code] || '🌡️',
  };
}

async function getLocationWeather() {
  let lat;
  let lon;
  let city;

  try {
    const coords = await getWindowsLocation();
    lat = coords.lat;
    lon = coords.lon;
    city = await reverseGeocode(lat, lon);
  } catch {
    const ipLoc = await getIpLocation();
    lat = ipLoc.lat;
    lon = ipLoc.lon;
    city = ipLoc.city || await reverseGeocode(lat, lon).catch(() => 'Konum');
  }

  const weather = await fetchWeather(lat, lon);

  return {
    city,
    temp: weather.temp,
    icon: weather.icon,
  };
}

module.exports = { getLocationWeather };

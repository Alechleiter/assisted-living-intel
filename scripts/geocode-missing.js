const fs = require("fs");
const path = require("path");
const https = require("https");

const dataPath = path.resolve(__dirname, "../src/data/facilities.json");
const facilities = JSON.parse(fs.readFileSync(dataPath, "utf-8"));

const missing = facilities.filter((f) => f.capacity >= 25 && !f.lat);
console.log(`Found ${missing.length} facilities with 25+ beds missing coordinates.\n`);

function nominatim(address, city, state, zip) {
  const query = encodeURIComponent(`${address}, ${city}, ${state} ${zip}`);
  const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&countrycodes=us&limit=1`;

  return new Promise((resolve) => {
    const req = https.get(url, { headers: { "User-Agent": "FacilityGeocoder/1.0" } }, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const results = JSON.parse(data);
          if (results.length > 0) {
            resolve({ lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) });
          } else {
            resolve(null);
          }
        } catch {
          resolve(null);
        }
      });
      res.on("error", () => resolve(null));
    });
    req.on("error", () => resolve(null));
  });
}

function nominatimFallback(city, state, zip) {
  const query = encodeURIComponent(`${city}, ${state} ${zip}`);
  const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&countrycodes=us&limit=1`;

  return new Promise((resolve) => {
    const req = https.get(url, { headers: { "User-Agent": "FacilityGeocoder/1.0" } }, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const results = JSON.parse(data);
          if (results.length > 0) {
            resolve({ lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) });
          } else {
            resolve(null);
          }
        } catch {
          resolve(null);
        }
      });
      res.on("error", () => resolve(null));
    });
    req.on("error", () => resolve(null));
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  let exactMatch = 0;
  let cityMatch = 0;
  let failed = 0;

  for (let i = 0; i < missing.length; i++) {
    const f = missing[i];
    process.stdout.write(`[${i + 1}/${missing.length}] ${f.name} (${f.capacity} beds)... `);

    let coords = await nominatim(f.address, f.city, f.state, f.zip);
    await sleep(1100);

    if (coords) {
      f.lat = Math.round(coords.lat * 1e6) / 1e6;
      f.lng = Math.round(coords.lng * 1e6) / 1e6;
      console.log(`EXACT (${f.lat}, ${f.lng})`);
      exactMatch++;
    } else {
      coords = await nominatimFallback(f.city, f.state, f.zip);
      await sleep(1100);

      if (coords) {
        f.lat = Math.round(coords.lat * 1e6) / 1e6;
        f.lng = Math.round(coords.lng * 1e6) / 1e6;
        console.log(`CITY-LEVEL (${f.lat}, ${f.lng})`);
        cityMatch++;
      } else {
        console.log("FAILED");
        failed++;
      }
    }
  }

  fs.writeFileSync(dataPath, JSON.stringify(facilities, null, 2), "utf-8");
  console.log(`\nDone. Exact: ${exactMatch}, City-level: ${cityMatch}, Failed: ${failed}`);
}

run();

/**
 * Geocode facilities using the US Census Bureau Geocoder (free, no API key).
 * Uses the individual address endpoint with concurrency control.
 * Falls back to city+state+zip if full address fails.
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FACILITIES_PATH = resolve(__dirname, "../src/data/facilities.json");

const CENSUS_URL = "https://geocoding.geo.census.gov/geocoder/locations/address";
const CONCURRENCY = 5; // concurrent requests
const RETRY_DELAY = 2000;
const MAX_RETRIES = 2;

async function geocodeAddress(street, city, state, zip) {
  const params = new URLSearchParams({
    street,
    city,
    state,
    zip,
    benchmark: "Public_AR_Current",
    format: "json",
  });

  const res = await fetch(`${CENSUS_URL}?${params}`, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const match = data?.result?.addressMatches?.[0];
  if (match) {
    return {
      lat: match.coordinates.y,
      lng: match.coordinates.x,
    };
  }
  return null;
}

async function geocodeWithRetry(facility, retries = 0) {
  try {
    // Try full address first
    let result = await geocodeAddress(
      facility.address,
      facility.city,
      facility.state,
      facility.zip
    );
    if (result) return result;

    // Fallback: just city + state + zip
    result = await geocodeAddress("", facility.city, facility.state, facility.zip);
    return result;
  } catch (err) {
    if (retries < MAX_RETRIES) {
      await new Promise((r) => setTimeout(r, RETRY_DELAY));
      return geocodeWithRetry(facility, retries + 1);
    }
    return null;
  }
}

async function processBatch(facilities, startIdx) {
  const promises = facilities.map(async (facility, i) => {
    const idx = startIdx + i;
    const coords = await geocodeWithRetry(facility);
    if (coords) {
      facility.lat = coords.lat;
      facility.lng = coords.lng;
      process.stdout.write(`\r  Geocoded ${idx + 1}/${total} - ${facility.name.substring(0, 40)}...`);
    } else {
      process.stdout.write(`\r  MISSED  ${idx + 1}/${total} - ${facility.name.substring(0, 40)}...`);
    }
    return facility;
  });
  return Promise.all(promises);
}

// Load facilities
const facilities = JSON.parse(readFileSync(FACILITIES_PATH, "utf-8"));
const total = facilities.length;

// Skip already geocoded
const needsGeocoding = facilities.filter((f) => !f.lat || !f.lng);
console.log(`\nTotal facilities: ${total}`);
console.log(`Already geocoded: ${total - needsGeocoding.length}`);
console.log(`Need geocoding: ${needsGeocoding.length}\n`);

if (needsGeocoding.length === 0) {
  console.log("All facilities already have coordinates. Done!");
  process.exit(0);
}

// Process in batches
let processed = 0;
for (let i = 0; i < needsGeocoding.length; i += CONCURRENCY) {
  const batch = needsGeocoding.slice(i, i + CONCURRENCY);
  await processBatch(batch, processed);
  processed += batch.length;
  // Small delay between batches to be polite
  if (i + CONCURRENCY < needsGeocoding.length) {
    await new Promise((r) => setTimeout(r, 300));
  }
}

// Count results
const geocoded = facilities.filter((f) => f.lat && f.lng).length;
const missed = facilities.filter((f) => !f.lat || !f.lng).length;

console.log(`\n\nResults:`);
console.log(`  Geocoded: ${geocoded}/${total}`);
console.log(`  Missed: ${missed}/${total}`);

// Save
writeFileSync(FACILITIES_PATH, JSON.stringify(facilities, null, 2));
console.log(`\nSaved to ${FACILITIES_PATH}`);

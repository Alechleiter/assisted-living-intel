const fs = require("fs");
const path = require("path");

const csvPath = path.resolve("C:\\Users\\albea\\Downloads\\RCFE TAM 2026 MAY .csv");
const existingPath = path.resolve(__dirname, "../src/data/facilities.json");
const outputPath = existingPath;

const csvRaw = fs.readFileSync(csvPath, "utf-8");
const existing = JSON.parse(fs.readFileSync(existingPath, "utf-8"));

const enrichedMap = {};
existing.forEach((f) => {
  enrichedMap[f.number] = {
    gpo: f.gpo || "None",
    lat: f.lat || null,
    lng: f.lng || null,
    parentCompany: f.parentCompany || "Independent",
  };
});

function parseCSVLine(line) {
  const fields = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        fields.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
  }
  fields.push(current.trim());
  return fields;
}

const lines = csvRaw.split("\n");
const facilities = [];
const seen = new Set();

for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;

  const fields = parseCSVLine(line);
  const [type, number, name, licensee, administrator, phone, address, city, state, zip, county, , capacityStr, status, licenseDate] = fields;

  if (!number || !name || !capacityStr) continue;

  const capacity = parseInt(capacityStr, 10);
  if (isNaN(capacity) || capacity <= 0) continue;

  if (seen.has(number)) continue;
  seen.add(number);

  const enriched = enrichedMap[number] || {};

  facilities.push({
    type: type || "RESIDENTIAL CARE ELDERLY",
    number,
    name,
    licensee: licensee || "",
    administrator: administrator || "",
    phone: phone || "",
    address: address || "",
    city: city || "",
    state: state || "CA",
    zip: zip || "",
    county: county || "",
    capacity,
    status: status || "LICENSED",
    licenseDate: licenseDate || "",
    gpo: enriched.gpo || "None",
    lat: enriched.lat || null,
    lng: enriched.lng || null,
    parentCompany: enriched.parentCompany || "Independent",
  });
}

facilities.sort((a, b) => b.capacity - a.capacity);

fs.writeFileSync(outputPath, JSON.stringify(facilities, null, 2), "utf-8");

console.log(`Wrote ${facilities.length} facilities to ${outputPath}`);
console.log(`Enriched (had GPO/coords/parent): ${Object.keys(enrichedMap).length}`);
console.log(`Matched enrichments: ${facilities.filter((f) => enrichedMap[f.number]).length}`);

const small = facilities.filter((f) => f.capacity < 25).length;
const medium = facilities.filter((f) => f.capacity >= 25 && f.capacity < 100).length;
const large = facilities.filter((f) => f.capacity >= 100).length;
console.log(`Size breakdown: <25 beds: ${small}, 25-99 beds: ${medium}, 100+ beds: ${large}`);

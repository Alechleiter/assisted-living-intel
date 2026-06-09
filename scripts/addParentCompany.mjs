/**
 * Adds parentCompany field to facilities.json based on keyword matching
 * against the licensee (and facility name as fallback) fields.
 *
 * Order matters — first match wins. More specific patterns go first.
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FACILITIES_PATH = resolve(__dirname, "../src/data/facilities.json");

// Top 20 operators — order matters (first match wins)
// Each entry: [displayName, ...keywords to match in licensee OR name]
const OPERATORS = [
  ["Oakmont Management Group", "OAKMONT"],
  ["Brookdale Senior Living", "BROOKDALE", "BLC ", "BLC-", "BKD "],
  ["Integral Senior Living", "INTEGRAL"],
  ["Pacifica Senior Living", "PACIFICA"],
  ["Atria Senior Living", "ATRIA"],
  ["Sunrise Senior Living", "SUNRISE"],
  ["NorthStar Senior Living", "NORTHSTAR"],
  ["Belmont Village", "BELMONT VILLAGE"],
  ["Emeritus Corporation", "EMERITUS", "SUMMERVILLE"],
  ["Cogir Management", "COGIR", "CADENCE SL"],
  ["Merrill Gardens", "MERRILL GARDENS", "MERRILL GP"],
  ["Front Porch Communities", "FRONT PORCH"],
  ["Aegis Senior Communities", "AEGIS"],
  ["HumanGood", "HUMANGOOD"],
  ["Watermark Retirement", "WATERMARK"],
  ["Carlton Senior Living", "CARLTON"],
  ["Kisco Senior Living", "KISCO"],
  ["Welltower", "WELLTOWER"],
  ["Covenant Living", "COVENANT"],
  ["Sequoia Living", "SEQUOIA"],
  ["Savant Senior Living", "SAVANT"],
  ["Episcopal Communities & Services", "EPISCOPAL COMMUNITIES", "ECS MANAGEMENT"],
  ["Continuing Life", "LA COSTA GLEN", "REATA GLEN", "STONERIDGE CREEK", "GLEN AT SCRIPPS", "GLEN AT HEATHER", "WISTERIA WARNER", "UNIVERSITY VILLAGE THOUSAND", "MORNINGSIDE OF FULLERTON"],
];

const facilities = JSON.parse(readFileSync(FACILITIES_PATH, "utf-8"));

let matched = 0;
facilities.forEach((f) => {
  const haystack = `${f.licensee} ${f.name}`.toUpperCase();
  let found = false;
  for (const [displayName, ...keywords] of OPERATORS) {
    for (const kw of keywords) {
      if (haystack.includes(kw)) {
        f.parentCompany = displayName;
        found = true;
        matched++;
        break;
      }
    }
    if (found) break;
  }
  if (!found) {
    f.parentCompany = "Independent";
  }
});

// Stats
const groups = {};
facilities.forEach((f) => {
  if (!groups[f.parentCompany]) groups[f.parentCompany] = { count: 0, beds: 0 };
  groups[f.parentCompany].count++;
  groups[f.parentCompany].beds += f.capacity;
});

console.log("\nParent Company Assignment Results:");
console.log("==================================");
Object.entries(groups)
  .sort((a, b) => b[1].count - a[1].count)
  .forEach(([name, data]) => {
    console.log(`  ${name}: ${data.count} sites, ${data.beds.toLocaleString()} beds`);
  });
console.log(`\nTotal matched to operators: ${matched}/${facilities.length}`);

writeFileSync(FACILITIES_PATH, JSON.stringify(facilities, null, 2));
console.log(`\nSaved to ${FACILITIES_PATH}`);

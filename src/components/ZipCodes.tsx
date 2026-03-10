"use client";

import { useState, useMemo } from "react";
import type { Facility } from "../app/page";

type Props = {
  facilities: Facility[];
};

type SortKey = "zip" | "count" | "capacity" | "avg";
type SortDir = "asc" | "desc";

export default function ZipCodes({ facilities }: Props) {
  const [search, setSearch] = useState("");
  const [countyFilter, setCountyFilter] = useState("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("capacity");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const counties = useMemo(
    () => ["ALL", ...Array.from(new Set(facilities.map((f) => f.county))).sort()],
    [facilities]
  );

  const zipData = useMemo(() => {
    const map: Record<string, { zip: string; count: number; capacity: number; county: string; cities: Set<string> }> = {};
    facilities.forEach((f) => {
      if (!map[f.zip]) map[f.zip] = { zip: f.zip, count: 0, capacity: 0, county: f.county, cities: new Set() };
      map[f.zip].count++;
      map[f.zip].capacity += f.capacity;
      map[f.zip].cities.add(f.city);
    });
    return Object.values(map).map((d) => ({
      ...d,
      avg: Math.round(d.capacity / d.count),
      citiesList: Array.from(d.cities).join(", "),
    }));
  }, [facilities]);

  const filtered = useMemo(() => {
    let data = zipData;
    if (countyFilter !== "ALL") data = data.filter((d) => d.county === countyFilter);
    if (search) {
      const q = search.toLowerCase();
      data = data.filter(
        (d) =>
          d.zip.includes(q) ||
          d.county.toLowerCase().includes(q) ||
          d.citiesList.toLowerCase().includes(q)
      );
    }
    data.sort((a, b) => {
      const mul = sortDir === "asc" ? 1 : -1;
      if (sortKey === "zip") return mul * a.zip.localeCompare(b.zip);
      return mul * ((a[sortKey] as number) - (b[sortKey] as number));
    });
    return data;
  }, [zipData, search, countyFilter, sortKey, sortDir]);

  const totals = useMemo(
    () => ({
      zips: filtered.length,
      facilities: filtered.reduce((s, d) => s + d.count, 0),
      capacity: filtered.reduce((s, d) => s + d.capacity, 0),
    }),
    [filtered]
  );

  const maxCap = useMemo(() => Math.max(...filtered.map((d) => d.capacity), 1), [filtered]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const SortIcon = ({ col }: { col: SortKey }) => (
    <span className="ml-1 inline-block" style={{ color: sortKey === col ? "var(--accent)" : "var(--text-muted)", fontSize: 10 }}>
      {sortKey === col ? (sortDir === "asc" ? "\u25B2" : "\u25BC") : "\u25BC"}
    </span>
  );

  return (
    <div>
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card p-5">
          <p className="text-xs uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>Zip Codes</p>
          <p className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--accent)" }}>
            {totals.zips.toLocaleString()}
          </p>
        </div>
        <div className="card p-5">
          <p className="text-xs uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>Facilities</p>
          <p className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--accent)" }}>
            {totals.facilities.toLocaleString()}
          </p>
        </div>
        <div className="card p-5">
          <p className="text-xs uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>Total Rooms</p>
          <p className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--accent)" }}>
            {totals.capacity.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
        <div className="relative flex-1 w-full">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="search-input"
            placeholder="Search zip code, city, or county..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          value={countyFilter}
          onChange={(e) => setCountyFilter(e.target.value)}
          className="text-sm"
        >
          {counties.map((c) => (
            <option key={c} value={c}>
              {c === "ALL" ? "All Counties" : c}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr style={{ background: "var(--bg-secondary)", borderBottom: "1px solid var(--border)" }}>
                {[
                  { key: "zip" as SortKey, label: "Zip Code", align: "left" },
                  { key: "zip" as SortKey, label: "County", align: "left", noSort: true },
                  { key: "zip" as SortKey, label: "Cities", align: "left", noSort: true },
                  { key: "count" as SortKey, label: "Facilities", align: "right" },
                  { key: "capacity" as SortKey, label: "Total Rooms", align: "right" },
                  { key: "avg" as SortKey, label: "Avg Rooms", align: "right" },
                  { key: "capacity" as SortKey, label: "Capacity", align: "left", noSort: true, isBar: true },
                ].map((col, i) => (
                  <th
                    key={i}
                    className={`text-xs font-medium uppercase tracking-wider px-4 py-3 cursor-pointer select-none ${col.align === "right" ? "text-right" : ""}`}
                    style={{ color: "var(--text-muted)" }}
                    onClick={() => !col.noSort && toggleSort(col.key)}
                  >
                    {col.label}
                    {!col.noSort && <SortIcon col={col.key} />}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 100).map((d) => (
                <tr key={d.zip} className="table-row">
                  <td className="px-4 py-3 text-sm font-mono font-semibold" style={{ color: "var(--accent)" }}>
                    {d.zip}
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: "var(--text-secondary)" }}>
                    {d.county}
                  </td>
                  <td className="px-4 py-3 text-xs max-w-48 truncate" style={{ color: "var(--text-secondary)" }}>
                    {d.citiesList}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-mono" style={{ color: "var(--text-primary)" }}>
                    {d.count}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm font-bold font-mono" style={{ color: "var(--text-primary)" }}>
                      {d.capacity.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-mono" style={{ color: "var(--text-secondary)" }}>
                    {d.avg.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 w-40">
                    <div className="capacity-bar-bg">
                      <div className="capacity-bar-fill" style={{ width: `${(d.capacity / maxCap) * 100}%` }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length > 100 && (
          <div className="px-4 py-3 text-xs text-center" style={{ color: "var(--text-muted)", borderTop: "1px solid var(--border)" }}>
            Showing 100 of {filtered.length} zip codes. Use search or filters to narrow results.
          </div>
        )}
        {filtered.length === 0 && (
          <div className="px-4 py-12 text-sm text-center" style={{ color: "var(--text-muted)" }}>
            No zip codes match your search.
          </div>
        )}
      </div>
    </div>
  );
}

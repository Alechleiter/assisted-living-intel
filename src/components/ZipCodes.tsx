"use client";

import { Fragment, useState, useMemo, useCallback } from "react";
import * as XLSX from "xlsx";
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
  const [expandedZip, setExpandedZip] = useState<string | null>(null);

  const counties = useMemo(
    () => ["ALL", ...Array.from(new Set(facilities.map((f) => f.county))).sort()],
    [facilities]
  );

  const zipData = useMemo(() => {
    const map: Record<string, { zip: string; count: number; capacity: number; county: string; cities: Set<string>; premier: number; vizient: number; facilities: Facility[] }> = {};
    facilities.forEach((f) => {
      if (!map[f.zip]) map[f.zip] = { zip: f.zip, count: 0, capacity: 0, county: f.county, cities: new Set(), premier: 0, vizient: 0, facilities: [] };
      map[f.zip].count++;
      map[f.zip].capacity += f.capacity;
      map[f.zip].cities.add(f.city);
      if (f.gpo.includes("Premier")) map[f.zip].premier++;
      if (f.gpo.includes("Vizient")) map[f.zip].vizient++;
      map[f.zip].facilities.push(f);
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

  const exportToExcel = useCallback(() => {
    const rows = filtered.map((d) => ({
      "Zip Code": d.zip,
      "County": d.county,
      "Cities": d.citiesList,
      "Facilities": d.count,
      "Total Rooms": d.capacity,
      "Avg Rooms": d.avg,
      "Premier": d.premier,
      "Vizient": d.vizient,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [
      { wch: 10 }, { wch: 18 }, { wch: 30 }, { wch: 10 },
      { wch: 12 }, { wch: 10 }, { wch: 8 }, { wch: 8 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Zip Codes");
    XLSX.writeFile(wb, `CA_Assisted_Living_ZipCodes_${filtered.length}.xlsx`);
  }, [filtered]);

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
        <button onClick={exportToExcel} className="export-btn" title="Export current filtered results to Excel">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Export Excel
        </button>
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
                  { key: "zip" as SortKey, label: "Premier", align: "center", noSort: true },
                  { key: "zip" as SortKey, label: "Vizient", align: "center", noSort: true },
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
              {filtered.slice(0, 100).map((d) => {
                const isExpanded = expandedZip === d.zip;
                return (
                  <Fragment key={d.zip}>
                    <tr
                      className="table-row cursor-pointer"
                      style={isExpanded ? { background: "var(--bg-secondary)" } : undefined}
                      onClick={() => setExpandedZip(isExpanded ? null : d.zip)}
                    >
                      <td className="px-4 py-3 text-sm font-mono font-semibold" style={{ color: "var(--accent)" }}>
                        <span className="inline-block mr-2 text-[10px] transition-transform" style={{ color: "var(--text-muted)", transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)" }}>&#9654;</span>
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
                      <td className="px-4 py-3 text-center">
                        {d.premier > 0 ? (
                          <span className="text-xs font-bold font-mono" style={{ color: "#3b82f6" }}>{d.premier}</span>
                        ) : (
                          <span className="text-xs" style={{ color: "var(--text-muted)" }}>—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {d.vizient > 0 ? (
                          <span className="text-xs font-bold font-mono" style={{ color: "#8b5cf6" }}>{d.vizient}</span>
                        ) : (
                          <span className="text-xs" style={{ color: "var(--text-muted)" }}>—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 w-40">
                        <div className="capacity-bar-bg">
                          <div className="capacity-bar-fill" style={{ width: `${(d.capacity / maxCap) * 100}%` }} />
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={9} style={{ padding: 0, background: "var(--bg-secondary)" }}>
                          <div className="px-6 py-4" style={{ borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
                            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>
                              {d.count} {d.count === 1 ? "Facility" : "Facilities"} in {d.zip}
                            </p>
                            <div className="grid gap-2">
                              {d.facilities
                                .sort((a, b) => b.capacity - a.capacity)
                                .map((f) => (
                                  <div
                                    key={f.number}
                                    className="flex items-center gap-4 px-4 py-3 rounded-lg"
                                    style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}
                                  >
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                                        {f.name}
                                      </p>
                                      <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                                        {f.address}, {f.city}
                                      </p>
                                    </div>
                                    <div className="text-right shrink-0">
                                      <p className="text-sm font-bold font-mono" style={{ color: "var(--accent)" }}>
                                        {f.capacity.toLocaleString()}
                                      </p>
                                      <p className="text-[10px] uppercase" style={{ color: "var(--text-muted)" }}>rooms</p>
                                    </div>
                                    <div className="text-right shrink-0 w-16">
                                      {f.phone && f.phone !== "N/A" ? (
                                        <p className="text-xs font-mono" style={{ color: "var(--text-secondary)" }}>{f.phone}</p>
                                      ) : (
                                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>—</p>
                                      )}
                                    </div>
                                    <div className="shrink-0 w-20 text-center">
                                      {f.gpo && f.gpo !== "None" ? (
                                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{
                                          background: f.gpo.includes("Premier") && f.gpo.includes("Vizient") ? "rgba(139,92,246,0.15)" : f.gpo.includes("Premier") ? "rgba(59,130,246,0.15)" : "rgba(139,92,246,0.15)",
                                          color: f.gpo.includes("Premier") && f.gpo.includes("Vizient") ? "#a78bfa" : f.gpo.includes("Premier") ? "#60a5fa" : "#a78bfa",
                                        }}>
                                          {f.gpo}
                                        </span>
                                      ) : (
                                        <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>—</span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
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

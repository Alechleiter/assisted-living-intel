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
    const rows: Record<string, string | number>[] = [];
    filtered.forEach((d) => {
      d.facilities
        .sort((a, b) => b.capacity - a.capacity)
        .forEach((f) => {
          rows.push({
            "Zip Code": f.zip,
            "County": f.county,
            "City": f.city,
            "Facility Name": f.name,
            "Address": f.address,
            "Phone": f.phone || "",
            "Administrator": f.administrator || "",
            "Licensee": f.licensee || "",
            "Beds": f.capacity,
            "Type": f.type.includes("CONTINUING CARE") ? "CCRC" : "RCFE",
            "Status": f.status,
            "License Date": f.licenseDate || "",
            "GPO": f.gpo === "None" ? "" : f.gpo,
            "Facility #": f.number,
          });
        });
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [
      { wch: 10 }, { wch: 18 }, { wch: 20 }, { wch: 40 },
      { wch: 35 }, { wch: 15 }, { wch: 25 }, { wch: 35 },
      { wch: 8 }, { wch: 6 }, { wch: 12 }, { wch: 12 },
      { wch: 18 }, { wch: 12 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Facilities by Zip");
    const totalFacilities = rows.length;
    XLSX.writeFile(wb, `CA_Assisted_Living_${filtered.length}Zips_${totalFacilities}Facilities.xlsx`);
  }, [filtered]);

  return (
    <div>
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6">
        <div className="card p-3 sm:p-5">
          <p className="text-[10px] sm:text-xs uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>Zip Codes</p>
          <p className="text-xl sm:text-2xl font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--accent)" }}>
            {totals.zips.toLocaleString()}
          </p>
        </div>
        <div className="card p-3 sm:p-5">
          <p className="text-[10px] sm:text-xs uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>Facilities</p>
          <p className="text-xl sm:text-2xl font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--accent)" }}>
            {totals.facilities.toLocaleString()}
          </p>
        </div>
        <div className="card p-3 sm:p-5">
          <p className="text-[10px] sm:text-xs uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>Total Beds</p>
          <p className="text-xl sm:text-2xl font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--accent)" }}>
            {totals.capacity.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="filter-bar flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
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
        <div className="filter-controls flex items-center gap-2 w-full sm:w-auto">
          <select
            value={countyFilter}
            onChange={(e) => setCountyFilter(e.target.value)}
            className="text-sm flex-1 sm:flex-none"
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
      </div>

      {/* Mobile card layout */}
      <div className="sm:hidden space-y-2">
        {filtered.slice(0, 100).map((d) => {
          const isExpanded = expandedZip === d.zip;
          return (
            <div
              key={d.zip}
              className="rounded-lg cursor-pointer"
              style={{
                background: "var(--bg-secondary)",
                border: isExpanded ? "1px solid var(--accent-dim)" : "1px solid var(--border)",
              }}
              onClick={() => setExpandedZip(isExpanded ? null : d.zip)}
            >
              <div className="flex items-center gap-3 p-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="var(--text-muted)"
                      className="shrink-0 transition-transform"
                      style={{ transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)" }}
                    >
                      <path d="M8 5l8 7-8 7z" />
                    </svg>
                    <span className="text-sm font-mono font-semibold" style={{ color: "var(--accent)" }}>
                      {d.zip}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 ml-[18px]">
                    <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{d.county}</span>
                    <span style={{ color: "var(--text-muted)" }}>&middot;</span>
                    <span className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>{d.citiesList}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-base font-bold font-mono" style={{ color: "var(--accent)" }}>
                    {d.capacity.toLocaleString()}
                  </p>
                  <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{d.count} {d.count === 1 ? "site" : "sites"}</p>
                </div>
              </div>
              {isExpanded && (
                <div className="px-3 pb-3" style={{ borderTop: "1px solid var(--border)" }}>
                  <p className="text-xs font-semibold uppercase tracking-wider my-2" style={{ color: "var(--text-muted)" }}>
                    {d.count} {d.count === 1 ? "Facility" : "Facilities"} in {d.zip}
                  </p>
                  <div className="space-y-2">
                    {d.facilities
                      .sort((a, b) => b.capacity - a.capacity)
                      .map((f) => (
                        <div
                          key={f.number}
                          className="rounded-lg px-3 py-3"
                          style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}
                        >
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                                {f.name}
                              </p>
                              <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                                {f.address}, {f.city}, {f.state} {f.zip}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-base font-bold font-mono" style={{ color: "var(--accent)" }}>
                                {f.capacity.toLocaleString()}
                              </p>
                              <p className="text-[10px] uppercase" style={{ color: "var(--text-muted)" }}>beds</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <p className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Phone</p>
                              <p className="text-xs font-medium mt-0.5" style={{ color: "var(--text-primary)" }}>
                                {f.phone ? (
                                  <a href={`tel:${f.phone}`} className="detail-link" onClick={(e) => e.stopPropagation()}>
                                    {f.phone}
                                  </a>
                                ) : "—"}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Administrator</p>
                              <p className="text-xs font-medium mt-0.5" style={{ color: "var(--text-primary)" }}>
                                {f.administrator || "—"}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Licensee</p>
                              <p className="text-xs font-medium mt-0.5" style={{ color: "var(--text-primary)" }}>
                                {f.licensee || "—"}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>GPO</p>
                              <p className="text-xs font-medium mt-0.5">
                                {f.gpo && f.gpo !== "None" ? (
                                  <span style={{
                                    color: f.gpo.includes("Premier") && f.gpo.includes("Vizient") ? "#a78bfa" : f.gpo.includes("Premier") ? "#60a5fa" : "#a78bfa",
                                  }}>
                                    {f.gpo}
                                  </span>
                                ) : (
                                  <span style={{ color: "var(--text-muted)" }}>—</span>
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 mt-2 pt-2" style={{ borderTop: "1px solid var(--border)" }}>
                            <div className="flex items-center gap-1">
                              <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>Facility #:</span>
                              <span className="text-[10px] font-mono font-medium" style={{ color: "var(--text-secondary)" }}>{f.number}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>Type:</span>
                              <span className="text-[10px] font-medium" style={{ color: "var(--text-secondary)" }}>
                                {f.type.includes("CONTINUING CARE") ? "CCRC" : "RCFE"}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>Status:</span>
                              <span className="text-[10px] font-medium" style={{ color: "var(--text-secondary)" }}>{f.status}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>Licensed:</span>
                              <span className="text-[10px] font-medium" style={{ color: "var(--text-secondary)" }}>{f.licenseDate || "—"}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {filtered.length > 100 && (
          <div className="px-4 py-3 text-xs text-center rounded-lg" style={{ color: "var(--text-muted)", background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
            Showing 100 of {filtered.length} zip codes. Use search or filters to narrow results.
          </div>
        )}
        {filtered.length === 0 && (
          <div className="px-4 py-12 text-sm text-center rounded-lg" style={{ color: "var(--text-muted)", background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
            No zip codes match your search.
          </div>
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block">
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
                    { key: "capacity" as SortKey, label: "Total Beds", align: "right" },
                    { key: "avg" as SortKey, label: "Avg Beds", align: "right" },
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
                              <div className="grid gap-3">
                                {d.facilities
                                  .sort((a, b) => b.capacity - a.capacity)
                                  .map((f) => (
                                    <div
                                      key={f.number}
                                      className="rounded-lg px-5 py-4"
                                      style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}
                                    >
                                      <div className="flex items-start justify-between gap-4 mb-3">
                                        <div className="min-w-0">
                                          <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                                            {f.name}
                                          </p>
                                          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                                            {f.address}, {f.city}, {f.state} {f.zip}
                                          </p>
                                        </div>
                                        <div className="text-right shrink-0">
                                          <p className="text-lg font-bold font-mono" style={{ color: "var(--accent)" }}>
                                            {f.capacity.toLocaleString()}
                                          </p>
                                          <p className="text-[10px] uppercase" style={{ color: "var(--text-muted)" }}>beds</p>
                                        </div>
                                      </div>
                                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                        <div>
                                          <p className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Phone</p>
                                          <p className="text-xs font-medium mt-0.5" style={{ color: "var(--text-primary)" }}>
                                            {f.phone ? (
                                              <a href={`tel:${f.phone}`} className="detail-link" onClick={(e) => e.stopPropagation()}>
                                                {f.phone}
                                              </a>
                                            ) : "—"}
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Administrator</p>
                                          <p className="text-xs font-medium mt-0.5" style={{ color: "var(--text-primary)" }}>
                                            {f.administrator || "—"}
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Licensee</p>
                                          <p className="text-xs font-medium mt-0.5" style={{ color: "var(--text-primary)" }}>
                                            {f.licensee || "—"}
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>GPO</p>
                                          <p className="text-xs font-medium mt-0.5">
                                            {f.gpo && f.gpo !== "None" ? (
                                              <span style={{
                                                color: f.gpo.includes("Premier") && f.gpo.includes("Vizient") ? "#a78bfa" : f.gpo.includes("Premier") ? "#60a5fa" : "#a78bfa",
                                              }}>
                                                {f.gpo}
                                              </span>
                                            ) : (
                                              <span style={{ color: "var(--text-muted)" }}>—</span>
                                            )}
                                          </p>
                                        </div>
                                      </div>
                                      <div className="flex flex-wrap items-center gap-4 mt-3 pt-2" style={{ borderTop: "1px solid var(--border)" }}>
                                        <div className="flex items-center gap-1">
                                          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>Facility #:</span>
                                          <span className="text-[10px] font-mono font-medium" style={{ color: "var(--text-secondary)" }}>{f.number}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>Type:</span>
                                          <span className="text-[10px] font-medium" style={{ color: "var(--text-secondary)" }}>
                                            {f.type.includes("CONTINUING CARE") ? "CCRC" : "RCFE"}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>Status:</span>
                                          <span className="text-[10px] font-medium" style={{ color: "var(--text-secondary)" }}>{f.status}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>Licensed:</span>
                                          <span className="text-[10px] font-medium" style={{ color: "var(--text-secondary)" }}>{f.licenseDate || "—"}</span>
                                        </div>
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
    </div>
  );
}

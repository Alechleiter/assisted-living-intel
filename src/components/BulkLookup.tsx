"use client";

import { useState, useMemo, useCallback } from "react";
import * as XLSX from "xlsx";
import type { Facility } from "../app/page";

type Props = {
  facilities: Facility[];
};

type SortKey = "name" | "city" | "zip" | "capacity";
type SortDir = "asc" | "desc";

export default function BulkLookup({ facilities }: Props) {
  const [input, setInput] = useState("");
  const [activeZips, setActiveZips] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("zip");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const parseZips = (text: string): string[] => {
    return text
      .replace(/[,;\n\r\t]+/g, " ")
      .split(/\s+/)
      .map((s) => s.trim().replace(/\D/g, ""))
      .filter((s) => s.length === 5);
  };

  const handleLookup = () => {
    const zips = [...new Set(parseZips(input))];
    setActiveZips(zips);
  };

  const handleClear = () => {
    setInput("");
    setActiveZips([]);
  };

  const matched = useMemo(() => {
    if (activeZips.length === 0) return [];
    const zipSet = new Set(activeZips);
    let data = facilities.filter((f) => zipSet.has(f.zip));
    data = [...data].sort((a, b) => {
      const mul = sortDir === "asc" ? 1 : -1;
      if (sortKey === "capacity") return mul * (a.capacity - b.capacity);
      const av = a[sortKey] || "";
      const bv = b[sortKey] || "";
      return mul * av.localeCompare(bv);
    });
    return data;
  }, [facilities, activeZips, sortKey, sortDir]);

  const matchedZips = useMemo(() => new Set(matched.map((f) => f.zip)), [matched]);
  const unmatchedZips = useMemo(() => activeZips.filter((z) => !matchedZips.has(z)), [activeZips, matchedZips]);

  const totals = useMemo(
    () => ({
      zipsSearched: activeZips.length,
      zipsFound: matchedZips.size,
      facilities: matched.length,
      capacity: matched.reduce((s, f) => s + f.capacity, 0),
    }),
    [activeZips, matchedZips, matched]
  );

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortKey(key);
      setSortDir(key === "capacity" ? "desc" : "asc");
    }
  };

  const SortIcon = ({ col }: { col: SortKey }) => (
    <span className="ml-1 inline-block" style={{ color: sortKey === col ? "var(--accent)" : "var(--text-muted)", fontSize: 10 }}>
      {sortKey === col ? (sortDir === "asc" ? "\u25B2" : "\u25BC") : "\u25BC"}
    </span>
  );

  const exportToExcel = useCallback(() => {
    const rows = matched.map((f) => ({
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
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [
      { wch: 10 }, { wch: 18 }, { wch: 20 }, { wch: 40 },
      { wch: 35 }, { wch: 15 }, { wch: 25 }, { wch: 35 },
      { wch: 8 }, { wch: 6 }, { wch: 12 }, { wch: 12 },
      { wch: 18 }, { wch: 12 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Territory Facilities");
    XLSX.writeFile(wb, `CA_Territory_${matchedZips.size}Zips_${matched.length}Facilities.xlsx`);
  }, [matched, matchedZips]);

  return (
    <div>
      {/* Input area */}
      <div className="card p-4 sm:p-5 mb-4 sm:mb-6">
        <p className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
          Territory Zip Code Lookup
        </p>
        <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
          Paste or type multiple zip codes separated by commas, spaces, or new lines to see all facilities in those areas.
        </p>
        <textarea
          className="w-full rounded-lg px-4 py-3 text-sm font-mono mb-3 resize-y"
          style={{
            background: "var(--bg-primary)",
            border: "1px solid var(--border)",
            color: "var(--text-primary)",
            minHeight: 80,
            outline: "none",
          }}
          placeholder="92501, 92009, 94109, 91360..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
          onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
        />
        <div className="flex items-center gap-3">
          <button
            onClick={handleLookup}
            className="export-btn"
            style={{ background: "var(--accent)", color: "#000", borderColor: "var(--accent)" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            Search Territory
          </button>
          {activeZips.length > 0 && (
            <button onClick={handleClear} className="export-btn">
              Clear
            </button>
          )}
          {input && !activeZips.length && (
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              {parseZips(input).length} zip codes detected
            </span>
          )}
        </div>
      </div>

      {/* Results */}
      {activeZips.length > 0 && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
            <div className="card p-3 sm:p-5">
              <p className="text-[10px] sm:text-xs uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>Zips Searched</p>
              <p className="text-xl sm:text-2xl font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--accent)" }}>
                {totals.zipsSearched.toLocaleString()}
              </p>
            </div>
            <div className="card p-3 sm:p-5">
              <p className="text-[10px] sm:text-xs uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>Zips with Sites</p>
              <p className="text-xl sm:text-2xl font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--accent)" }}>
                {totals.zipsFound.toLocaleString()}
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

          {/* Unmatched zips warning */}
          {unmatchedZips.length > 0 && (
            <div className="card p-4 mb-6" style={{ borderColor: "rgba(234,179,8,0.3)" }}>
              <p className="text-xs font-semibold mb-1" style={{ color: "#eab308" }}>
                {unmatchedZips.length} zip code{unmatchedZips.length > 1 ? "s" : ""} had no facilities (25+ beds)
              </p>
              <p className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
                {unmatchedZips.join(", ")}
              </p>
            </div>
          )}

          {/* Export button */}
          {matched.length > 0 && (
            <div className="flex justify-end mb-4">
              <button onClick={exportToExcel} className="export-btn" title="Export all facility details to Excel">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Export Excel
              </button>
            </div>
          )}

          {/* Mobile card list */}
          {matched.length > 0 && (
            <div className="sm:hidden space-y-2">
              {matched.map((f) => {
                const isExpanded = expandedId === f.number;
                return (
                  <div key={f.number} className="rounded-lg cursor-pointer"
                    style={{ background: "var(--bg-secondary)", border: isExpanded ? "1px solid var(--accent-dim)" : "1px solid var(--border)" }}
                    onClick={() => setExpandedId(isExpanded ? null : f.number)}>
                    <div className="flex items-center gap-3 p-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                            style={{ transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s", flexShrink: 0 }}>
                            <polyline points="9 18 15 12 9 6" />
                          </svg>
                          <span className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{f.name}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 ml-[18px]">
                          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                            {f.city} · {f.county} · {f.zip}
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-sm font-bold font-mono" style={{ color: "var(--accent)" }}>
                          {f.capacity.toLocaleString()}
                        </span>
                        <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>beds</div>
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="px-3 pb-3" style={{ borderTop: "1px solid var(--border)" }}>
                        <div className="grid grid-cols-2 gap-3 pt-3">
                          <div>
                            <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: "var(--text-muted)" }}>Phone</p>
                            {f.phone ? (
                              <a href={`tel:${f.phone}`} className="detail-link text-xs font-mono" onClick={(e) => e.stopPropagation()}>{f.phone}</a>
                            ) : (
                              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>—</p>
                            )}
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: "var(--text-muted)" }}>Administrator</p>
                            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{f.administrator || "—"}</p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: "var(--text-muted)" }}>Licensee</p>
                            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{f.licensee || "—"}</p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: "var(--text-muted)" }}>GPO</p>
                            {f.gpo !== "None" ? (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{
                                background: f.gpo.includes("Premier") && f.gpo.includes("Vizient") ? "rgba(6,182,212,0.12)" : f.gpo.includes("Premier") ? "rgba(59,130,246,0.12)" : "rgba(139,92,246,0.12)",
                                color: f.gpo.includes("Premier") && f.gpo.includes("Vizient") ? "#06b6d4" : f.gpo.includes("Premier") ? "#3b82f6" : "#8b5cf6",
                              }}>
                                {f.gpo}
                              </span>
                            ) : (
                              <p className="text-xs" style={{ color: "var(--text-muted)" }}>—</p>
                            )}
                          </div>
                          <div className="col-span-2">
                            <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: "var(--text-muted)" }}>Address</p>
                            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{f.address}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-3 pt-2" style={{ borderTop: "1px solid var(--border)" }}>
                          <span className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>#{f.number}</span>
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                              f.status === "LICENSED" ? "badge-licensed" : f.status === "PENDING" ? "badge-pending" : "badge-probation"
                            }`}>
                              {f.status}
                            </span>
                            <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                              {f.type.includes("CONTINUING CARE") ? "CCRC" : "RCFE"}
                            </span>
                            {f.licenseDate && (
                              <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{f.licenseDate}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Table */}
          {matched.length > 0 && (
            <div className="card overflow-hidden hidden sm:block">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr style={{ background: "var(--bg-secondary)", borderBottom: "1px solid var(--border)" }}>
                      {[
                        { key: "name" as SortKey, label: "Facility" },
                        { key: "city" as SortKey, label: "City" },
                        { key: "zip" as SortKey, label: "Zip" },
                        { key: "name" as SortKey, label: "County", noSort: true },
                        { key: "name" as SortKey, label: "Phone", noSort: true },
                        { key: "name" as SortKey, label: "Administrator", noSort: true },
                        { key: "name" as SortKey, label: "Licensee", noSort: true },
                        { key: "name" as SortKey, label: "GPO", noSort: true },
                        { key: "name" as SortKey, label: "Status", noSort: true },
                        { key: "capacity" as SortKey, label: "Beds" },
                      ].map((col, i) => (
                        <th
                          key={i}
                          className={`text-xs font-medium uppercase tracking-wider px-4 py-3 select-none ${!col.noSort ? "cursor-pointer" : ""} ${col.key === "capacity" ? "text-right" : ""}`}
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
                    {matched.map((f) => (
                      <tr key={f.number} className="table-row">
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{f.name}</p>
                          <p className="text-xs" style={{ color: "var(--text-muted)" }}>{f.address}</p>
                        </td>
                        <td className="px-4 py-3 text-xs" style={{ color: "var(--text-secondary)" }}>{f.city}</td>
                        <td className="px-4 py-3 text-xs font-mono font-semibold" style={{ color: "var(--accent)" }}>{f.zip}</td>
                        <td className="px-4 py-3 text-xs" style={{ color: "var(--text-secondary)" }}>{f.county}</td>
                        <td className="px-4 py-3 text-xs font-mono" style={{ color: "var(--text-secondary)" }}>
                          {f.phone ? (
                            <a href={`tel:${f.phone}`} className="detail-link" onClick={(e) => e.stopPropagation()}>
                              {f.phone}
                            </a>
                          ) : "—"}
                        </td>
                        <td className="px-4 py-3 text-xs" style={{ color: "var(--text-secondary)" }}>{f.administrator || "—"}</td>
                        <td className="px-4 py-3 text-xs max-w-40 truncate" style={{ color: "var(--text-secondary)" }}>{f.licensee || "—"}</td>
                        <td className="px-4 py-3">
                          {f.gpo !== "None" ? (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{
                              background: f.gpo.includes("Premier") && f.gpo.includes("Vizient") ? "rgba(6,182,212,0.12)" : f.gpo.includes("Premier") ? "rgba(59,130,246,0.12)" : "rgba(139,92,246,0.12)",
                              color: f.gpo.includes("Premier") && f.gpo.includes("Vizient") ? "#06b6d4" : f.gpo.includes("Premier") ? "#3b82f6" : "#8b5cf6",
                            }}>
                              {f.gpo}
                            </span>
                          ) : (
                            <span className="text-xs" style={{ color: "var(--text-muted)" }}>—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            f.status === "LICENSED" ? "badge-licensed" : f.status === "PENDING" ? "badge-pending" : "badge-probation"
                          }`}>
                            {f.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm font-bold font-mono" style={{ color: "var(--accent)" }}>
                            {f.capacity.toLocaleString()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {matched.length === 0 && (
                <div className="px-4 py-12 text-sm text-center" style={{ color: "var(--text-muted)" }}>
                  No facilities found in the provided zip codes.
                </div>
              )}
            </div>
          )}

          {matched.length === 0 && (
            <div className="card p-8 text-center">
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                No facilities with 25+ beds found in the provided zip codes.
              </p>
            </div>
          )}
        </>
      )}

      {/* Empty state */}
      {activeZips.length === 0 && (
        <div className="card p-12 text-center">
          <svg className="mx-auto mb-4" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4 }}>
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <p className="text-sm mb-1" style={{ color: "var(--text-secondary)" }}>
            Enter zip codes above to search your territory
          </p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Paste from a spreadsheet, CRM, or type them manually
          </p>
        </div>
      )}
    </div>
  );
}

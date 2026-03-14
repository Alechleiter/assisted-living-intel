"use client";

import { Fragment, useState, useMemo, useCallback } from "react";
import * as XLSX from "xlsx";
import type { Facility } from "../app/page";

type Props = {
  facilities: Facility[];
};

type SortKey = "name" | "city" | "county" | "capacity" | "zip" | "status" | "gpo";
type SortDir = "asc" | "desc";

export default function Facilities({ facilities }: Props) {
  const [search, setSearch] = useState("");
  const [countyFilter, setCountyFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [gpoFilter, setGpoFilter] = useState("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("capacity");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const perPage = 50;

  const counties = useMemo(
    () => ["ALL", ...Array.from(new Set(facilities.map((f) => f.county))).sort()],
    [facilities]
  );

  const filtered = useMemo(() => {
    let data = facilities;
    if (countyFilter !== "ALL") data = data.filter((f) => f.county === countyFilter);
    if (statusFilter !== "ALL") data = data.filter((f) => f.status === statusFilter);
    if (typeFilter !== "ALL") {
      if (typeFilter === "CCRC") data = data.filter((f) => f.type.includes("CONTINUING CARE"));
      else data = data.filter((f) => !f.type.includes("CONTINUING CARE"));
    }
    if (gpoFilter !== "ALL") {
      if (gpoFilter === "PREMIER") data = data.filter((f) => f.gpo.includes("Premier"));
      else if (gpoFilter === "VIZIENT") data = data.filter((f) => f.gpo.includes("Vizient"));
      else if (gpoFilter === "BOTH") data = data.filter((f) => f.gpo === "Premier, Vizient");
      else if (gpoFilter === "NONE") data = data.filter((f) => f.gpo === "None");
    }
    if (search) {
      const q = search.toLowerCase();
      data = data.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          f.city.toLowerCase().includes(q) ||
          f.county.toLowerCase().includes(q) ||
          f.zip.includes(q) ||
          f.address.toLowerCase().includes(q) ||
          f.licensee.toLowerCase().includes(q) ||
          f.administrator.toLowerCase().includes(q)
      );
    }
    data = [...data].sort((a, b) => {
      const mul = sortDir === "asc" ? 1 : -1;
      if (sortKey === "capacity") return mul * (a.capacity - b.capacity);
      const av = a[sortKey] || "";
      const bv = b[sortKey] || "";
      return mul * av.localeCompare(bv);
    });
    return data;
  }, [facilities, search, countyFilter, statusFilter, typeFilter, gpoFilter, sortKey, sortDir]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paged = filtered.slice(page * perPage, (page + 1) * perPage);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortKey(key);
      setSortDir(key === "capacity" ? "desc" : "asc");
    }
    setPage(0);
  };

  const SortIcon = ({ col }: { col: SortKey }) => (
    <span className="ml-1 inline-block" style={{ color: sortKey === col ? "var(--accent)" : "var(--text-muted)", fontSize: 10 }}>
      {sortKey === col ? (sortDir === "asc" ? "\u25B2" : "\u25BC") : "\u25BC"}
    </span>
  );

  const totalCap = filtered.reduce((s, f) => s + f.capacity, 0);
  const maxCap = Math.max(...facilities.map((f) => f.capacity));

  const exportToExcel = useCallback(() => {
    const rows = filtered.map((f) => ({
      "Facility Name": f.name,
      "Address": f.address,
      "City": f.city,
      "State": f.state,
      "Zip Code": f.zip,
      "County": f.county,
      "Phone": f.phone,
      "Administrator": f.administrator,
      "Licensee": f.licensee,
      "Facility #": f.number,
      "Type": f.type.includes("CONTINUING CARE") ? "CCRC" : "RCFE",
      "Status": f.status,
      "GPO": f.gpo,
      "Rooms": f.capacity,
      "License Date": f.licenseDate,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    // Auto-size columns
    const colWidths = Object.keys(rows[0] || {}).map((key) => ({
      wch: Math.max(key.length, ...rows.map((r) => String((r as Record<string, unknown>)[key] || "").length)).toString().length > 40 ? 40 : Math.max(key.length + 2, 12),
    }));
    ws["!cols"] = colWidths;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Facilities");
    XLSX.writeFile(wb, `CA_Assisted_Living_Facilities_${filtered.length}.xlsx`);
  }, [filtered]);

  return (
    <div>
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 mb-6">
        <div className="card p-3 sm:p-5">
          <p className="text-[10px] sm:text-xs uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>Matched</p>
          <p className="text-xl sm:text-2xl font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--accent)" }}>
            {filtered.length.toLocaleString()}
          </p>
          <p className="text-[10px] sm:text-xs" style={{ color: "var(--text-secondary)" }}>facilities</p>
        </div>
        <div className="card p-3 sm:p-5">
          <p className="text-[10px] sm:text-xs uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>Total Rooms</p>
          <p className="text-xl sm:text-2xl font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--accent)" }}>
            {totalCap.toLocaleString()}
          </p>
          <p className="text-[10px] sm:text-xs" style={{ color: "var(--text-secondary)" }}>bed capacity</p>
        </div>
        <div className="card p-3 sm:p-5">
          <p className="text-[10px] sm:text-xs uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>Average</p>
          <p className="text-xl sm:text-2xl font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--accent)" }}>
            {filtered.length ? Math.round(totalCap / filtered.length).toLocaleString() : 0}
          </p>
          <p className="text-[10px] sm:text-xs" style={{ color: "var(--text-secondary)" }}>rooms/facility</p>
        </div>
        <div className="card p-3 sm:p-5">
          <p className="text-[10px] sm:text-xs uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>Largest</p>
          <p className="text-xl sm:text-2xl font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--accent)" }}>
            {filtered.length ? Math.max(...filtered.map((f) => f.capacity)).toLocaleString() : 0}
          </p>
          <p className="text-[10px] sm:text-xs" style={{ color: "var(--text-secondary)" }}>max rooms</p>
        </div>
      </div>

      {/* Filters */}
      <div className="filter-bar flex flex-col md:flex-row items-start md:items-center gap-3 mb-6">
        <div className="relative flex-1 w-full">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="search-input"
            placeholder="Search name, city, zip, address, licensee..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          />
        </div>
        <div className="filter-controls grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
          <select value={countyFilter} onChange={(e) => { setCountyFilter(e.target.value); setPage(0); }} className="text-sm">
            {counties.map((c) => (
              <option key={c} value={c}>{c === "ALL" ? "All Counties" : c}</option>
            ))}
          </select>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }} className="text-sm">
            <option value="ALL">All Statuses</option>
            <option value="LICENSED">Licensed</option>
            <option value="PENDING">Pending</option>
            <option value="ON PROBATION">On Probation</option>
          </select>
          <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(0); }} className="text-sm">
            <option value="ALL">All Types</option>
            <option value="RCFE">RCFE</option>
            <option value="CCRC">CCRC</option>
          </select>
          <select value={gpoFilter} onChange={(e) => { setGpoFilter(e.target.value); setPage(0); }} className="text-sm">
            <option value="ALL">All GPOs</option>
            <option value="PREMIER">Premier</option>
            <option value="VIZIENT">Vizient</option>
            <option value="BOTH">Both GPOs</option>
            <option value="NONE">No GPO</option>
          </select>
          <button onClick={exportToExcel} className="export-btn col-span-2 sm:col-span-1 justify-center sm:justify-start" title="Export current filtered results to Excel">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export Excel
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {/* Mobile card list */}
        <div className="sm:hidden divide-y" style={{ borderColor: "var(--border)" }}>
          {paged.map((f) => {
            const isExpanded = expandedId === f.number;
            const badgeClass =
              f.status === "LICENSED"
                ? "badge-licensed"
                : f.status === "PENDING"
                ? "badge-pending"
                : "badge-probation";
            const gpoColor = f.gpo.includes("Premier") && f.gpo.includes("Vizient")
              ? "#06b6d4"
              : f.gpo.includes("Premier")
              ? "#3b82f6"
              : f.gpo.includes("Vizient")
              ? "#8b5cf6"
              : undefined;
            const gpoBg = f.gpo.includes("Premier") && f.gpo.includes("Vizient")
              ? "rgba(6,182,212,0.12)"
              : f.gpo.includes("Premier")
              ? "rgba(59,130,246,0.12)"
              : f.gpo.includes("Vizient")
              ? "rgba(139,92,246,0.12)"
              : undefined;
            const gpoBorder = f.gpo.includes("Premier") && f.gpo.includes("Vizient")
              ? "rgba(6,182,212,0.25)"
              : f.gpo.includes("Premier")
              ? "rgba(59,130,246,0.25)"
              : f.gpo.includes("Vizient")
              ? "rgba(139,92,246,0.25)"
              : undefined;
            return (
              <div
                key={f.number}
                className="cursor-pointer"
                style={{ background: isExpanded ? "var(--bg-secondary)" : "transparent", borderBottom: "1px solid var(--border)" }}
                onClick={() => setExpandedId(isExpanded ? null : f.number)}
              >
                <div className="flex items-center gap-3 p-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 transition-transform" style={{ transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)" }}>
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                      <span className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{f.name}</span>
                    </div>
                    <div className="text-[11px] mt-0.5 ml-[18px] truncate" style={{ color: "var(--text-muted)" }}>{f.address}</div>
                    <div className="flex items-center gap-1 mt-1 ml-[18px] text-[11px]" style={{ color: "var(--text-secondary)" }}>
                      <span>{f.city}</span>
                      <span style={{ color: "var(--text-muted)" }}>&middot;</span>
                      <span>{f.county}</span>
                      <span style={{ color: "var(--text-muted)" }}>&middot;</span>
                      <span className="font-mono">{f.zip}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-sm font-bold font-mono" style={{ color: "var(--accent)" }}>{f.capacity.toLocaleString()}</span>
                    <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>rooms</p>
                  </div>
                </div>
                {isExpanded && (
                  <div className="px-3 pb-3" style={{ borderTop: "1px solid var(--border)" }} onClick={(e) => e.stopPropagation()}>
                    <div className="grid grid-cols-2 gap-3 pt-3">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Phone</p>
                        <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                          {f.phone ? (
                            <a href={`tel:${f.phone}`} className="detail-link" onClick={(e) => e.stopPropagation()}>{f.phone}</a>
                          ) : "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Administrator</p>
                        <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{f.administrator || "—"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Licensee</p>
                        <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{f.licensee || "—"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>GPO</p>
                        {f.gpo !== "None" && gpoColor ? (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full inline-block mt-0.5" style={{
                            background: gpoBg,
                            color: gpoColor,
                            border: `1px solid ${gpoBorder}`,
                          }}>
                            {f.gpo}
                          </span>
                        ) : (
                          <p className="text-sm" style={{ color: "var(--text-muted)" }}>—</p>
                        )}
                      </div>
                      <div className="col-span-2">
                        <p className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Address</p>
                        <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{f.address}, {f.city}, {f.state} {f.zip}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 mt-2 pt-2" style={{ borderTop: "1px solid var(--border)" }}>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>Facility #:</span>
                        <span className="text-[11px] font-mono font-medium" style={{ color: "var(--text-secondary)" }}>{f.number}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>Type:</span>
                        <span className="text-[11px] font-medium" style={{ color: "var(--text-secondary)" }}>{f.type.includes("CONTINUING CARE") ? "CCRC" : "RCFE"}</span>
                      </div>
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${badgeClass}`}>{f.status}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>Licensed:</span>
                        <span className="text-[11px] font-medium" style={{ color: "var(--text-secondary)" }}>{f.licenseDate || "—"}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Desktop table */}
        <div className="overflow-x-auto hidden sm:block">
          <table className="w-full text-left">
            <thead>
              <tr style={{ background: "var(--bg-secondary)", borderBottom: "1px solid var(--border)" }}>
                {[
                  { key: "name" as SortKey, label: "Facility Name" },
                  { key: "city" as SortKey, label: "City" },
                  { key: "county" as SortKey, label: "County" },
                  { key: "zip" as SortKey, label: "Zip" },
                  { key: "status" as SortKey, label: "Status" },
                  { key: "gpo" as SortKey, label: "GPO" },
                  { key: "capacity" as SortKey, label: "Rooms", align: "right" },
                ].map((col) => (
                  <th
                    key={col.key + col.label}
                    className={`text-xs font-medium uppercase tracking-wider px-4 py-3 cursor-pointer select-none ${col.align === "right" ? "text-right" : ""}`}
                    style={{ color: "var(--text-muted)" }}
                    onClick={() => toggleSort(col.key)}
                  >
                    {col.label}
                    <SortIcon col={col.key} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.map((f) => {
                const badgeClass =
                  f.status === "LICENSED"
                    ? "badge-licensed"
                    : f.status === "PENDING"
                    ? "badge-pending"
                    : "badge-probation";
                const isExpanded = expandedId === f.number;
                return (
                  <Fragment key={f.number}>
                    <tr
                      className={`table-row cursor-pointer ${isExpanded ? "expanded-row" : ""}`}
                      onClick={() => setExpandedId(isExpanded ? null : f.number)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <svg
                            width="12" height="12" viewBox="0 0 24 24" fill="none"
                            stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                            className="flex-shrink-0 transition-transform"
                            style={{ transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)" }}
                          >
                            <polyline points="9 18 15 12 9 6" />
                          </svg>
                          <div>
                            <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                              {f.name}
                            </div>
                            <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                              {f.address}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: "var(--text-secondary)" }}>
                        {f.city}
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: "var(--text-secondary)" }}>
                        {f.county}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono" style={{ color: "var(--text-secondary)" }}>
                        {f.zip}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badgeClass}`}>
                          {f.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {f.gpo !== "None" ? (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{
                            background: f.gpo.includes("Premier") && f.gpo.includes("Vizient") ? "rgba(6,182,212,0.12)" : f.gpo.includes("Premier") ? "rgba(59,130,246,0.12)" : "rgba(139,92,246,0.12)",
                            color: f.gpo.includes("Premier") && f.gpo.includes("Vizient") ? "#06b6d4" : f.gpo.includes("Premier") ? "#3b82f6" : "#8b5cf6",
                            border: `1px solid ${f.gpo.includes("Premier") && f.gpo.includes("Vizient") ? "rgba(6,182,212,0.25)" : f.gpo.includes("Premier") ? "rgba(59,130,246,0.25)" : "rgba(139,92,246,0.25)"}`,
                          }}>
                            {f.gpo}
                          </span>
                        ) : (
                          <span className="text-xs" style={{ color: "var(--text-muted)" }}>—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 capacity-bar-bg">
                            <div className="capacity-bar-fill" style={{ width: `${(f.capacity / maxCap) * 100}%` }} />
                          </div>
                          <span className="text-sm font-bold font-mono w-10 text-right" style={{ color: "var(--accent)" }}>
                            {f.capacity.toLocaleString()}
                          </span>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${f.number}-detail`} className="detail-row">
                        <td colSpan={7} className="px-4 py-0">
                          <div className="detail-panel">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                              {/* Phone */}
                              <div className="detail-item">
                                <div className="detail-icon">
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
                                  </svg>
                                </div>
                                <div>
                                  <p className="text-xs uppercase tracking-wider mb-0.5" style={{ color: "var(--text-muted)" }}>Phone</p>
                                  <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                                    {f.phone ? (
                                      <a href={`tel:${f.phone}`} className="detail-link" onClick={(e) => e.stopPropagation()}>
                                        {f.phone}
                                      </a>
                                    ) : "—"}
                                  </p>
                                </div>
                              </div>
                              {/* Administrator */}
                              <div className="detail-item">
                                <div className="detail-icon">
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                                    <circle cx="12" cy="7" r="4" />
                                  </svg>
                                </div>
                                <div>
                                  <p className="text-xs uppercase tracking-wider mb-0.5" style={{ color: "var(--text-muted)" }}>Administrator</p>
                                  <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                                    {f.administrator || "—"}
                                  </p>
                                </div>
                              </div>
                              {/* Licensee */}
                              <div className="detail-item">
                                <div className="detail-icon">
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16" />
                                    <path d="M1 21h22" />
                                    <path d="M9 7h1m-1 4h1m4-4h1m-1 4h1" />
                                  </svg>
                                </div>
                                <div>
                                  <p className="text-xs uppercase tracking-wider mb-0.5" style={{ color: "var(--text-muted)" }}>Licensee</p>
                                  <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                                    {f.licensee || "—"}
                                  </p>
                                </div>
                              </div>
                              {/* Full Address */}
                              <div className="detail-item">
                                <div className="detail-icon">
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                                    <circle cx="12" cy="10" r="3" />
                                  </svg>
                                </div>
                                <div>
                                  <p className="text-xs uppercase tracking-wider mb-0.5" style={{ color: "var(--text-muted)" }}>Address</p>
                                  <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                                    {f.address}, {f.city}, {f.state} {f.zip}
                                  </p>
                                </div>
                              </div>
                            </div>
                            {/* Bottom row - license info */}
                            <div className="flex flex-wrap items-center gap-4 mt-3 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
                              <div className="flex items-center gap-2">
                                <span className="text-xs" style={{ color: "var(--text-muted)" }}>Facility #:</span>
                                <span className="text-xs font-mono font-medium" style={{ color: "var(--text-secondary)" }}>{f.number}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs" style={{ color: "var(--text-muted)" }}>Type:</span>
                                <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                                  {f.type.includes("CONTINUING CARE") ? "CCRC" : "RCFE"}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs" style={{ color: "var(--text-muted)" }}>Licensed:</span>
                                <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>{f.licenseDate || "—"}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs" style={{ color: "var(--text-muted)" }}>Capacity:</span>
                                <span className="text-xs font-bold" style={{ color: "var(--accent)" }}>{f.capacity} rooms</span>
                              </div>
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderTop: "1px solid var(--border)" }}
          >
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Showing {page * perPage + 1}&ndash;{Math.min((page + 1) * perPage, filtered.length)} of{" "}
              {filtered.length.toLocaleString()} facilities
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="text-xs px-3 py-1.5 rounded-md transition-colors"
                style={{
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border)",
                  color: page === 0 ? "var(--text-muted)" : "var(--text-primary)",
                  cursor: page === 0 ? "not-allowed" : "pointer",
                }}
              >
                Prev
              </button>
              <span className="text-xs font-mono" style={{ color: "var(--text-secondary)" }}>
                {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page >= totalPages - 1}
                className="text-xs px-3 py-1.5 rounded-md transition-colors"
                style={{
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border)",
                  color: page >= totalPages - 1 ? "var(--text-muted)" : "var(--text-primary)",
                  cursor: page >= totalPages - 1 ? "not-allowed" : "pointer",
                }}
              >
                Next
              </button>
            </div>
          </div>
        )}

        {filtered.length === 0 && (
          <div className="px-4 py-12 text-sm text-center" style={{ color: "var(--text-muted)" }}>
            No facilities match your search and filters.
          </div>
        )}
      </div>
    </div>
  );
}

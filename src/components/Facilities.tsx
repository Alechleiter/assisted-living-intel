"use client";

import { useState, useMemo } from "react";
import type { Facility } from "../app/page";

type Props = {
  facilities: Facility[];
};

type SortKey = "name" | "city" | "county" | "capacity" | "zip" | "status";
type SortDir = "asc" | "desc";

export default function Facilities({ facilities }: Props) {
  const [search, setSearch] = useState("");
  const [countyFilter, setCountyFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("capacity");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(0);
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
  }, [facilities, search, countyFilter, statusFilter, typeFilter, sortKey, sortDir]);

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

  return (
    <div>
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card p-5">
          <p className="text-xs uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>Matched</p>
          <p className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--accent)" }}>
            {filtered.length.toLocaleString()}
          </p>
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>facilities</p>
        </div>
        <div className="card p-5">
          <p className="text-xs uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>Total Rooms</p>
          <p className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--accent)" }}>
            {totalCap.toLocaleString()}
          </p>
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>bed capacity</p>
        </div>
        <div className="card p-5">
          <p className="text-xs uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>Average</p>
          <p className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--accent)" }}>
            {filtered.length ? Math.round(totalCap / filtered.length).toLocaleString() : 0}
          </p>
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>rooms/facility</p>
        </div>
        <div className="card p-5">
          <p className="text-xs uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>Largest</p>
          <p className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--accent)" }}>
            {filtered.length ? Math.max(...filtered.map((f) => f.capacity)).toLocaleString() : 0}
          </p>
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>max rooms</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row items-start md:items-center gap-3 mb-6">
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
        <div className="flex items-center gap-2 flex-wrap">
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
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr style={{ background: "var(--bg-secondary)", borderBottom: "1px solid var(--border)" }}>
                {[
                  { key: "name" as SortKey, label: "Facility Name" },
                  { key: "city" as SortKey, label: "City" },
                  { key: "county" as SortKey, label: "County" },
                  { key: "zip" as SortKey, label: "Zip" },
                  { key: "status" as SortKey, label: "Status" },
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
                return (
                  <tr key={f.number} className="table-row">
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                        {f.name}
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                        {f.address}
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

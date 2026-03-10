"use client";

import { useState, useMemo } from "react";
import type { Facility } from "../app/page";

function Tip({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <span className="tooltip-wrap">
      {children}
      <span className="tooltip-icon">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4" />
          <path d="M12 8h.01" />
        </svg>
      </span>
      <span className="tooltip-bubble">{text}</span>
    </span>
  );
}

type Props = {
  facilities: Facility[];
  stats: {
    total: number;
    totalCapacity: number;
    licensed: number;
    uniqueZips: number;
    uniqueCounties: number;
    avgCapacity: number;
  };
};

export default function Dashboard({ facilities, stats }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // Top counties by capacity
  const countyData = useMemo(() => {
    const map: Record<string, { count: number; capacity: number }> = {};
    facilities.forEach((f) => {
      if (!map[f.county]) map[f.county] = { count: 0, capacity: 0 };
      map[f.county].count++;
      map[f.county].capacity += f.capacity;
    });
    return Object.entries(map)
      .map(([name, d]) => ({ name, ...d }))
      .sort((a, b) => b.capacity - a.capacity)
      .slice(0, 12);
  }, [facilities]);

  const maxCountyCap = countyData[0]?.capacity || 1;

  // Top cities by capacity
  const cityData = useMemo(() => {
    const map: Record<string, { count: number; capacity: number }> = {};
    facilities.forEach((f) => {
      if (!map[f.city]) map[f.city] = { count: 0, capacity: 0 };
      map[f.city].count++;
      map[f.city].capacity += f.capacity;
    });
    return Object.entries(map)
      .map(([name, d]) => ({ name, ...d }))
      .sort((a, b) => b.capacity - a.capacity)
      .slice(0, 10);
  }, [facilities]);

  const maxCityCap = cityData[0]?.capacity || 1;

  // Facility types breakdown
  const typeData = useMemo(() => {
    const map: Record<string, { count: number; capacity: number }> = {};
    facilities.forEach((f) => {
      const label = f.type === "RCFE-CONTINUING CARE RETIREMENT COMMUNITY" ? "CCRC" : "RCFE";
      if (!map[label]) map[label] = { count: 0, capacity: 0 };
      map[label].count++;
      map[label].capacity += f.capacity;
    });
    return Object.entries(map).map(([name, d]) => ({ name, ...d }));
  }, [facilities]);

  // Status breakdown
  const statusData = useMemo(() => {
    const map: Record<string, number> = {};
    facilities.forEach((f) => {
      map[f.status] = (map[f.status] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [facilities]);

  // GPO breakdown
  const gpoData = useMemo(() => {
    let premier = 0, vizient = 0, both = 0, none = 0;
    let premierCap = 0, vizientCap = 0, bothCap = 0, noneCap = 0;
    facilities.forEach((f) => {
      const g = f.gpo || "None";
      if (g === "Premier, Vizient") { both++; bothCap += f.capacity; }
      else if (g === "Premier") { premier++; premierCap += f.capacity; }
      else if (g === "Vizient") { vizient++; vizientCap += f.capacity; }
      else { none++; noneCap += f.capacity; }
    });
    return [
      { name: "Premier", count: premier + both, capacity: premierCap + bothCap, color: "#3b82f6" },
      { name: "Vizient", count: vizient + both, capacity: vizientCap + bothCap, color: "#8b5cf6" },
      { name: "Both GPOs", count: both, capacity: bothCap, color: "#06b6d4" },
      { name: "No GPO", count: none, capacity: noneCap, color: "var(--text-muted)" },
    ];
  }, [facilities]);

  // Capacity distribution buckets
  const capacityBuckets = useMemo(() => {
    const buckets = [
      { label: "1-6", min: 1, max: 6, count: 0 },
      { label: "7-15", min: 7, max: 15, count: 0 },
      { label: "16-49", min: 16, max: 49, count: 0 },
      { label: "50-99", min: 50, max: 99, count: 0 },
      { label: "100-199", min: 100, max: 199, count: 0 },
      { label: "200-499", min: 200, max: 499, count: 0 },
      { label: "500+", min: 500, max: 99999, count: 0 },
    ];
    facilities.forEach((f) => {
      const b = buckets.find((b) => f.capacity >= b.min && f.capacity <= b.max);
      if (b) b.count++;
    });
    return buckets;
  }, [facilities]);

  const maxBucket = Math.max(...capacityBuckets.map((b) => b.count));

  // Top 10 largest facilities
  const topFacilities = useMemo(
    () => [...facilities].sort((a, b) => b.capacity - a.capacity).slice(0, 10),
    [facilities]
  );

  return (
    <div>
      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {[
          { label: "Total Facilities", value: stats.total.toLocaleString(), sub: "statewide", delay: 1, tip: "Total assisted living sites (RCFEs) in California with 25 or more guest rooms. Includes both standard RCFE and CCRC facilities." },
          { label: "Total Rooms", value: stats.totalCapacity.toLocaleString(), sub: "bed capacity", delay: 2, tip: "Combined room/bed capacity across all facilities with 25+ rooms. Each room represents one licensed resident bed." },
          { label: "Avg Capacity", value: stats.avgCapacity.toLocaleString(), sub: "rooms/facility", delay: 3, tip: "Average number of rooms per facility. Only sites with 25 or more guest rooms are included in this app." },
          { label: "Licensed", value: stats.licensed.toLocaleString(), sub: `${((stats.licensed / stats.total) * 100).toFixed(1)}% of total`, delay: 4, tip: "Facilities with an active license from CA Community Care Licensing. Others may be Pending or On Probation." },
          { label: "Zip Codes", value: stats.uniqueZips.toLocaleString(), sub: "coverage areas", delay: 5, tip: "Unique zip codes with at least one assisted living facility of 25+ rooms." },
          { label: "Counties", value: stats.uniqueCounties.toLocaleString(), sub: "CA counties", delay: 6, tip: "California counties represented. CA has 58 total counties." },
        ].map((s) => (
          <div key={s.label} className={`card stat-glow p-5 fade-up fade-up-${s.delay}`}>
            <p className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
              <Tip text={s.tip}>{s.label}</Tip>
            </p>
            <p className="text-2xl font-bold tracking-tight" style={{ fontFamily: "var(--font-display)", color: "var(--accent)" }}>
              {s.value}
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
              {s.sub}
            </p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* County Chart */}
        <div className="card p-6 fade-up fade-up-7">
          <h3 className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
            <Tip text="Rooms = licensed bed capacity at each site. Sites = individual assisted living locations (25+ rooms only). Each bar shows the total rooms in that county.">Rooms by County</Tip>
          </h3>
          <p className="text-xs mb-5" style={{ color: "var(--text-muted)" }}>
            Top 12 counties by total facility capacity
          </p>
          <div className="space-y-3">
            {countyData.map((c) => (
              <div key={c.name} className="flex items-center gap-3">
                <span className="text-xs w-28 truncate text-right" style={{ color: "var(--text-secondary)" }}>
                  {c.name}
                </span>
                <div className="flex-1 capacity-bar-bg">
                  <div
                    className="capacity-bar-fill"
                    style={{ width: `${(c.capacity / maxCountyCap) * 100}%` }}
                  />
                </div>
                <span className="text-xs font-mono w-14 text-right" style={{ color: "var(--text-primary)" }}>
                  {c.capacity.toLocaleString()}
                </span>
                <span className="text-xs w-10 text-right" style={{ color: "var(--text-muted)" }}>
                  {c.count}
                </span>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-6 mt-3 text-xs" style={{ color: "var(--text-muted)" }}>
            <span>Rooms</span>
            <span>Sites</span>
          </div>
        </div>

        {/* Capacity Distribution */}
        <div className="card p-6 fade-up fade-up-8">
          <h3 className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
            <Tip text="Shows how many facilities fall into each size range. This app only includes sites with 25 or more guest rooms.">Capacity Distribution</Tip>
          </h3>
          <p className="text-xs mb-5" style={{ color: "var(--text-muted)" }}>
            Number of facilities by room count range
          </p>
          <div className="flex items-end gap-3 h-48">
            {capacityBuckets.map((b) => (
              <div key={b.label} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                <span className="text-xs font-mono" style={{ color: "var(--accent)" }}>
                  {b.count}
                </span>
                <div className="w-full relative" style={{ height: `${Math.max((b.count / maxBucket) * 100, 3)}%` }}>
                  <div className="bar w-full h-full" />
                </div>
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {b.label}
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs text-center mt-3" style={{ color: "var(--text-muted)" }}>
            Rooms per facility
          </p>
        </div>
      </div>

      {/* GPO Affiliation Row */}
      <div className="card p-6 mb-6">
        <h3 className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
          <Tip text="GPO = Group Purchasing Organization. GPOs negotiate bulk purchasing contracts for healthcare facilities. Premier and Vizient are the two largest GPOs in the US.">GPO Affiliation</Tip>
        </h3>
        <p className="text-xs mb-5" style={{ color: "var(--text-muted)" }}>
          Group Purchasing Organization membership across facilities
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {gpoData.map((g) => (
            <div key={g.name} className="p-4 rounded-lg" style={{ background: "var(--bg-secondary)" }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: g.color }} />
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                  {g.name}
                </span>
              </div>
              <p className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
                {g.count.toLocaleString()}
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                {g.capacity.toLocaleString()} rooms &middot; {((g.count / stats.total) * 100).toFixed(1)}%
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Facility Type Breakdown */}
        <div className="card p-6">
          <h3 className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
            <Tip text="RCFE = Residential Care Facility for the Elderly. The standard assisted living license in California. CCRC = Continuing Care Retirement Community. A campus-style community offering multiple levels of care (independent living, assisted living, skilled nursing) under one license.">Facility Types</Tip>
          </h3>
          <p className="text-xs mb-5" style={{ color: "var(--text-muted)" }}>
            RCFE vs CCRC classification
          </p>
          <div className="space-y-4">
            {typeData.map((t) => {
              const pct = ((t.count / stats.total) * 100).toFixed(1);
              return (
                <div key={t.name}>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                      {t.name}
                    </span>
                    <span className="text-sm" style={{ color: "var(--accent)" }}>
                      {pct}%
                    </span>
                  </div>
                  <div className="capacity-bar-bg" style={{ height: 10 }}>
                    <div className="capacity-bar-fill" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {t.count.toLocaleString()} facilities
                    </span>
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {t.capacity.toLocaleString()} rooms
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Status Breakdown */}
        <div className="card p-6">
          <h3 className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
            <Tip text="Licensed = active, approved to operate. Pending = application submitted, awaiting approval. On Probation = licensed but under corrective action due to violations.">License Status</Tip>
          </h3>
          <p className="text-xs mb-5" style={{ color: "var(--text-muted)" }}>
            Active license status distribution
          </p>
          <div className="space-y-3">
            {statusData.map((s) => {
              const pct = ((s.count / stats.total) * 100).toFixed(1);
              const badgeClass =
                s.name === "LICENSED"
                  ? "badge-licensed"
                  : s.name === "PENDING"
                  ? "badge-pending"
                  : "badge-probation";
              return (
                <div key={s.name} className="flex items-center justify-between p-3 rounded-lg" style={{ background: "var(--bg-secondary)" }}>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${badgeClass}`}>
                      {s.name}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                      {s.count.toLocaleString()}
                    </span>
                    <span className="text-xs ml-2" style={{ color: "var(--text-muted)" }}>
                      ({pct}%)
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Cities */}
        <div className="card p-6">
          <h3 className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
            <Tip text="Ranked by total room capacity across all assisted living sites in each city. Higher capacity cities represent larger markets for supplies and services.">Top Cities by Capacity</Tip>
          </h3>
          <p className="text-xs mb-5" style={{ color: "var(--text-muted)" }}>
            Cities with the most assisted living rooms
          </p>
          <div className="space-y-3">
            {cityData.map((c, i) => (
              <div key={c.name} className="flex items-center gap-3">
                <span
                  className="text-xs font-mono w-5 text-center"
                  style={{ color: i < 3 ? "var(--accent)" : "var(--text-muted)" }}
                >
                  {i + 1}
                </span>
                <span className="text-xs flex-1 truncate" style={{ color: "var(--text-secondary)" }}>
                  {c.name}
                </span>
                <div className="w-24 capacity-bar-bg">
                  <div className="capacity-bar-fill" style={{ width: `${(c.capacity / maxCityCap) * 100}%` }} />
                </div>
                <span className="text-xs font-mono w-12 text-right" style={{ color: "var(--text-primary)" }}>
                  {c.capacity.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top 10 Largest Facilities */}
      <div className="card p-6">
        <h3 className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
          <Tip text="The 10 largest assisted living communities by licensed room count. Click any row to see contact details including phone, administrator, and licensee.">Largest Facilities</Tip>
        </h3>
        <p className="text-xs mb-5" style={{ color: "var(--text-muted)" }}>
          Top 10 facilities by room capacity
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                <th className="text-xs font-medium uppercase tracking-wider pb-3 pr-4" style={{ color: "var(--text-muted)" }}>
                  #
                </th>
                <th className="text-xs font-medium uppercase tracking-wider pb-3 pr-4" style={{ color: "var(--text-muted)" }}>
                  Facility Name
                </th>
                <th className="text-xs font-medium uppercase tracking-wider pb-3 pr-4" style={{ color: "var(--text-muted)" }}>
                  City
                </th>
                <th className="text-xs font-medium uppercase tracking-wider pb-3 pr-4" style={{ color: "var(--text-muted)" }}>
                  County
                </th>
                <th className="text-xs font-medium uppercase tracking-wider pb-3 pr-4" style={{ color: "var(--text-muted)" }}>
                  Zip
                </th>
                <th className="text-xs font-medium uppercase tracking-wider pb-3 pr-4" style={{ color: "var(--text-muted)" }}>
                  GPO
                </th>
                <th className="text-xs font-medium uppercase tracking-wider pb-3 text-right" style={{ color: "var(--text-muted)" }}>
                  Rooms
                </th>
              </tr>
            </thead>
            <tbody>
              {topFacilities.map((f, i) => {
                const isExpanded = expandedId === f.number;
                return (
                  <>
                    <tr
                      key={f.number}
                      className={`table-row cursor-pointer ${isExpanded ? "expanded-row" : ""}`}
                      onClick={() => setExpandedId(isExpanded ? null : f.number)}
                    >
                      <td className="py-3 pr-4 text-xs font-mono" style={{ color: i < 3 ? "var(--accent)" : "var(--text-muted)" }}>
                        {i + 1}
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <svg
                            width="10" height="10" viewBox="0 0 24 24" fill="none"
                            stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                            className="flex-shrink-0 transition-transform"
                            style={{ transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)" }}
                          >
                            <polyline points="9 18 15 12 9 6" />
                          </svg>
                          <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{f.name}</span>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-xs" style={{ color: "var(--text-secondary)" }}>
                        {f.city}
                      </td>
                      <td className="py-3 pr-4 text-xs" style={{ color: "var(--text-secondary)" }}>
                        {f.county}
                      </td>
                      <td className="py-3 pr-4 text-xs font-mono" style={{ color: "var(--text-secondary)" }}>
                        {f.zip}
                      </td>
                      <td className="py-3 pr-4">
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
                      <td className="py-3 text-right">
                        <span className="text-sm font-bold font-mono" style={{ color: "var(--accent)" }}>
                          {f.capacity.toLocaleString()}
                        </span>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${f.number}-detail`} className="detail-row">
                        <td colSpan={7} className="px-2 py-0">
                          <div className="detail-panel">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                              <div className="detail-item">
                                <div className="detail-icon">
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                                    <circle cx="12" cy="7" r="4" />
                                  </svg>
                                </div>
                                <div>
                                  <p className="text-xs uppercase tracking-wider mb-0.5" style={{ color: "var(--text-muted)" }}>Administrator</p>
                                  <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{f.administrator || "—"}</p>
                                </div>
                              </div>
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
                                  <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{f.licensee || "—"}</p>
                                </div>
                              </div>
                              <div className="detail-item">
                                <div className="detail-icon">
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                                    <circle cx="12" cy="10" r="3" />
                                  </svg>
                                </div>
                                <div>
                                  <p className="text-xs uppercase tracking-wider mb-0.5" style={{ color: "var(--text-muted)" }}>Address</p>
                                  <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{f.address}, {f.city}, {f.state} {f.zip}</p>
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-4 mt-3 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
                              <div className="flex items-center gap-2">
                                <span className="text-xs" style={{ color: "var(--text-muted)" }}>Facility #:</span>
                                <span className="text-xs font-mono font-medium" style={{ color: "var(--text-secondary)" }}>{f.number}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs" style={{ color: "var(--text-muted)" }}>Licensed:</span>
                                <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>{f.licenseDate || "—"}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

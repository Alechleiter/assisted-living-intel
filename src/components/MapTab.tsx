"use client";

import { useState, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import type { MapMarker } from "./MapView";
import type { Facility } from "../app/page";

const MapView = dynamic(() => import("./MapView"), { ssr: false });

const selectStyle: React.CSSProperties = {
  background: "var(--bg-secondary)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  padding: "10px 14px",
  color: "var(--text-primary)",
  fontFamily: "var(--font-body)",
  fontSize: 14,
};

const toggleStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "6px 12px",
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 500,
  fontFamily: "var(--font-body)",
  cursor: "pointer",
  border: "1px solid var(--border)",
  transition: "all 0.15s",
};

export default function MapTab({ facilities }: { facilities: Facility[] }) {
  const [selected, setSelected] = useState<MapMarker | null>(null);
  const [county, setCounty] = useState("");
  const [status, setStatus] = useState("");
  const [gpo, setGpo] = useState("");
  const [facilityType, setFacilityType] = useState("");
  const [operator, setOperator] = useState("");
  const [zipInput, setZipInput] = useState("");
  const [zipChips, setZipChips] = useState<string[]>([]);
  const [showZipInput, setShowZipInput] = useState(false);

  const counties = useMemo(
    () => [...new Set(facilities.map((f) => f.county))].sort(),
    [facilities]
  );

  const gpoOptions = useMemo(
    () => [...new Set(facilities.map((f) => f.gpo))].sort(),
    [facilities]
  );

  const typeOptions = useMemo(
    () => [...new Set(facilities.map((f) => f.type))].sort(),
    [facilities]
  );

  const operatorOptions = useMemo(
    () => [...new Set(facilities.map((f) => f.parentCompany).filter((p) => p !== "Independent"))].sort(),
    [facilities]
  );

  const parseAndAddZips = () => {
    const newZips = zipInput
      .split(/[\n,;\s]+/)
      .map((z) => z.trim().replace(/[^0-9]/g, ""))
      .filter((z) => z.length === 5);
    if (newZips.length > 0) {
      setZipChips((prev) => [...new Set([...prev, ...newZips])]);
      setZipInput("");
    }
  };

  const markers: MapMarker[] = useMemo(() => {
    return facilities
      .filter((f) => {
        const fAny = f as Facility & { lat?: number; lng?: number };
        if (!fAny.lat || !fAny.lng) return false;
        if (county && f.county !== county) return false;
        if (status && f.status !== status) return false;
        if (gpo && f.gpo !== gpo) return false;
        if (facilityType && f.type !== facilityType) return false;
        if (operator) {
          if (operator === "INDEPENDENT" && f.parentCompany !== "Independent") return false;
          if (operator !== "INDEPENDENT" && f.parentCompany !== operator) return false;
        }
        if (zipChips.length > 0 && !zipChips.includes(f.zip)) return false;
        return true;
      })
      .map((f) => {
        const fAny = f as Facility & { lat: number; lng: number };
        return { ...f, lat: fAny.lat, lng: fAny.lng };
      });
  }, [facilities, county, status, gpo, facilityType, operator, zipChips]);

  const handleMarkerClick = useCallback((m: MapMarker) => setSelected(m), []);

  return (
    <div>
      {/* Legend */}
      <div
        className="card"
        style={{ padding: "12px 16px", marginBottom: 12, display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap", fontSize: 12 }}
      >
        <span style={{ color: "var(--text-muted)", fontWeight: 600 }}>Legend:</span>
        {[
          { label: "Premier", color: "#60a5fa" },
          { label: "Vizient", color: "#a78bfa" },
          { label: "Both", color: "#4ade80" },
          { label: "Licensed", color: "#c8956c" },
          { label: "Pending", color: "#fbbf24" },
          { label: "Probation", color: "#f87171" },
        ].map((item) => (
          <span key={item.label} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: item.color,
                border: "2px solid #fff",
                boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                flexShrink: 0,
              }}
            />
            <span style={{ color: "var(--text-secondary)" }}>{item.label}</span>
          </span>
        ))}
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <select value={county} onChange={(e) => setCounty(e.target.value)} style={selectStyle}>
            <option value="">All Counties</option>
            {counties.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} style={selectStyle}>
            <option value="">All Statuses</option>
            <option value="LICENSED">Licensed</option>
            <option value="PENDING">Pending</option>
            <option value="ON PROBATION">On Probation</option>
          </select>
          <select value={gpo} onChange={(e) => setGpo(e.target.value)} style={selectStyle}>
            <option value="">All GPOs</option>
            {gpoOptions.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
          <select value={facilityType} onChange={(e) => setFacilityType(e.target.value)} style={selectStyle}>
            <option value="">All Types</option>
            {typeOptions.map((t) => (
              <option key={t} value={t}>{t === "RCFE-CONTINUING CARE RETIREMENT COMMUNITY" ? "CCRC" : "RCFE"}</option>
            ))}
          </select>
          <select value={operator} onChange={(e) => setOperator(e.target.value)} style={selectStyle}>
            <option value="">All Operators</option>
            <option value="INDEPENDENT">Independent</option>
            {operatorOptions.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
          <button
            onClick={() => setShowZipInput(!showZipInput)}
            style={{
              ...toggleStyle,
              background: zipChips.length > 0 ? "var(--accent-dim)" : "var(--bg-secondary)",
              color: zipChips.length > 0 ? "var(--accent)" : "var(--text-secondary)",
              borderColor: zipChips.length > 0 ? "var(--accent)" : "var(--border)",
            }}
          >
            {zipChips.length > 0 ? `${zipChips.length} zip${zipChips.length > 1 ? "s" : ""} filtered` : "Filter by zip codes"}
          </button>
          <span style={{ fontSize: 13, color: "var(--text-muted)", marginLeft: "auto" }}>
            {markers.length.toLocaleString()} facilities mapped
          </span>
        </div>

        {showZipInput && (
          <div style={{ marginTop: 12, borderTop: "1px solid var(--border)", paddingTop: 12 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
              <textarea
                value={zipInput}
                onChange={(e) => setZipInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); parseAndAddZips(); }
                }}
                placeholder="Paste or type zip codes (comma, space, or newline separated)..."
                style={{ ...selectStyle, flex: 1, minHeight: 40, maxHeight: 80, resize: "vertical" }}
              />
              <button onClick={parseAndAddZips} style={{ ...toggleStyle, background: "var(--accent-dim)", color: "var(--accent)", borderColor: "var(--accent)" }}>
                Add
              </button>
              {zipChips.length > 0 && (
                <button onClick={() => setZipChips([])} style={{ ...toggleStyle, background: "var(--bg-secondary)", color: "var(--danger, #f87171)", borderColor: "var(--danger, #f87171)" }}>
                  Clear all
                </button>
              )}
            </div>
            {zipChips.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                {zipChips.map((zip) => (
                  <span
                    key={zip}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "3px 10px",
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 500,
                      background: "var(--accent-dim)",
                      color: "var(--accent)",
                      fontFamily: "var(--font-body)",
                    }}
                  >
                    {zip}
                    <span
                      onClick={() => setZipChips((prev) => prev.filter((z) => z !== zip))}
                      style={{ cursor: "pointer", opacity: 0.7, marginLeft: 2 }}
                    >
                      x
                    </span>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Map */}
      <div className="card" style={{ padding: 0, overflow: "hidden", height: 600 }}>
        <MapView markers={markers} onMarkerClick={handleMarkerClick} />
      </div>

      {/* Selected facility detail */}
      {selected && (
        <div className="card" style={{ padding: 20, marginTop: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <h3 style={{ margin: "0 0 4px", fontSize: "1.125rem", color: "var(--text-primary)" }}>{selected.name}</h3>
              <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--text-secondary)" }}>
                {selected.type === "RCFE-CONTINUING CARE RETIREMENT COMMUNITY" ? "Continuing Care Retirement Community" : "Residential Care Facility for the Elderly"}
              </p>
            </div>
            <button
              onClick={() => setSelected(null)}
              style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 18, padding: "4px 8px" }}
            >
              x
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, fontSize: 13, color: "var(--text-primary)" }}>
            <div>
              <span style={{ color: "var(--text-muted)", display: "block", marginBottom: 2 }}>Address</span>
              {selected.address}, {selected.city}, CA {selected.zip}
            </div>
            <div>
              <span style={{ color: "var(--text-muted)", display: "block", marginBottom: 2 }}>County</span>
              {selected.county}
            </div>
            <div>
              <span style={{ color: "var(--text-muted)", display: "block", marginBottom: 2 }}>Capacity</span>
              <span style={{ color: "var(--accent)", fontWeight: 600 }}>{selected.capacity.toLocaleString()} beds</span>
            </div>
            <div>
              <span style={{ color: "var(--text-muted)", display: "block", marginBottom: 2 }}>Status</span>
              {selected.status}
            </div>
            <div>
              <span style={{ color: "var(--text-muted)", display: "block", marginBottom: 2 }}>GPO</span>
              <span style={{ color: selected.gpo !== "None" ? "var(--accent)" : "var(--text-secondary)", fontWeight: selected.gpo !== "None" ? 600 : 400 }}>
                {selected.gpo}
              </span>
            </div>
            <div>
              <span style={{ color: "var(--text-muted)", display: "block", marginBottom: 2 }}>Phone</span>
              {selected.phone || "N/A"}
            </div>
            <div>
              <span style={{ color: "var(--text-muted)", display: "block", marginBottom: 2 }}>Administrator</span>
              {selected.administrator || "N/A"}
            </div>
            <div>
              <span style={{ color: "var(--text-muted)", display: "block", marginBottom: 2 }}>Coordinates</span>
              {selected.lat.toFixed(4)}, {selected.lng.toFixed(4)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

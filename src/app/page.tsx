"use client";

import { useState, useMemo, useEffect } from "react";
import facilitiesData from "../data/facilities.json";
import Dashboard from "../components/Dashboard";
import ZipCodes from "../components/ZipCodes";
import BulkLookup from "../components/BulkLookup";
import Facilities from "../components/Facilities";
import MapTab from "../components/MapTab";

export type Facility = {
  type: string;
  number: string;
  name: string;
  licensee: string;
  administrator: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  county: string;
  capacity: number;
  status: string;
  licenseDate: string;
  gpo: string;
};

const tabs = [
  { id: "dashboard" as const, label: "Dashboard", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1" },
  { id: "map" as const, label: "Map", icon: "M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" },
  { id: "zipcodes" as const, label: "Zip Codes", icon: "M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z" },
  { id: "bulk" as const, label: "Territory", icon: "M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" },
  { id: "facilities" as const, label: "Facilities", icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" },
];

type TabId = "dashboard" | "map" | "zipcodes" | "bulk" | "facilities";

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const facilities = facilitiesData as Facility[];

  // Load saved theme on mount
  useEffect(() => {
    const saved = localStorage.getItem("theme") as "dark" | "light" | null;
    if (saved) {
      setTheme(saved);
      document.documentElement.classList.toggle("light", saved === "light");
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("theme", next);
    document.documentElement.classList.toggle("light", next === "light");
  };

  const stats = useMemo(() => {
    const total = facilities.length;
    const totalCapacity = facilities.reduce((s, f) => s + f.capacity, 0);
    const licensed = facilities.filter((f) => f.status === "LICENSED").length;
    const uniqueZips = new Set(facilities.map((f) => f.zip)).size;
    const uniqueCounties = new Set(facilities.map((f) => f.county)).size;
    const avgCapacity = Math.round(totalCapacity / total);
    return { total, totalCapacity, licensed, uniqueZips, uniqueCounties, avgCapacity };
  }, [facilities]);

  return (
    <div className="relative min-h-screen" style={{ background: "var(--bg-primary)" }}>
      <div
        className="fixed inset-0 pointer-events-none"
        style={{ background: "var(--glow-bg)" }}
      />

      <header
        className="sticky top-0 z-40"
        style={{
          background: "var(--header-bg)",
          backdropFilter: "blur(16px)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div className="header-inner max-w-[1440px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="header-top flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: "var(--accent-dim)", border: "1px solid var(--accent)" }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-semibold tracking-tight" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
                  CA Assisted Living Intel
                </h1>
                <p className="text-[10px] sm:text-xs" style={{ color: "var(--text-muted)" }}>
                  {stats.total.toLocaleString()} facilities &middot; {stats.totalCapacity.toLocaleString()} beds &middot; 25+ beds only
                </p>
              </div>
            </div>

          </div>

          <div className="flex items-center gap-3">
            <nav className="nav-tabs flex items-center gap-1" style={{ background: "var(--bg-secondary)", borderRadius: 10, padding: 3 }}>
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`tab flex items-center gap-2 ${activeTab === tab.id ? "active" : ""}`}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d={tab.icon} />
                  </svg>
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </nav>

            <button
              onClick={toggleTheme}
              className="theme-toggle"
              style={{ display: "flex" }}
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="main-content relative z-10 max-w-[1440px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {activeTab === "dashboard" && <Dashboard facilities={facilities} stats={stats} />}
        {activeTab === "map" && <MapTab facilities={facilities} />}
        {activeTab === "zipcodes" && <ZipCodes facilities={facilities} />}
        {activeTab === "bulk" && <BulkLookup facilities={facilities} />}
        {activeTab === "facilities" && <Facilities facilities={facilities} />}
      </main>

      <footer className="footer-content relative z-10 text-center py-6 sm:py-8 px-4" style={{ borderTop: "1px solid var(--border)" }}>
        <p className="text-[10px] sm:text-xs" style={{ color: "var(--text-muted)" }}>
          California RCFE Facility Data &middot; Sites with 25+ beds only &middot; Source: CA Community Care Licensing &middot; 2025
        </p>
      </footer>
    </div>
  );
}

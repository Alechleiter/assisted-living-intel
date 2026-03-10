"use client";

import { useState, useMemo } from "react";
import facilitiesData from "../data/facilities.json";
import Dashboard from "../components/Dashboard";
import ZipCodes from "../components/ZipCodes";
import Facilities from "../components/Facilities";

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
};

const tabs = [
  { id: "dashboard" as const, label: "Dashboard", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1" },
  { id: "zipcodes" as const, label: "Zip Codes", icon: "M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z" },
  { id: "facilities" as const, label: "Facilities", icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" },
];

type TabId = "dashboard" | "zipcodes" | "facilities";

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const facilities = facilitiesData as Facility[];

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
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(200,149,108,0.06), transparent 70%)",
        }}
      />

      <header
        className="sticky top-0 z-40"
        style={{
          background: "rgba(12, 15, 20, 0.85)",
          backdropFilter: "blur(16px)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div className="max-w-[1440px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ background: "var(--accent-dim)", border: "1px solid var(--accent)" }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
                CA Assisted Living Intel
              </h1>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                {stats.total.toLocaleString()} facilities &middot; {stats.totalCapacity.toLocaleString()} rooms
              </p>
            </div>
          </div>

          <nav className="flex items-center gap-1" style={{ background: "var(--bg-secondary)", borderRadius: 10, padding: 3 }}>
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
        </div>
      </header>

      <main className="relative z-10 max-w-[1440px] mx-auto px-6 py-8">
        {activeTab === "dashboard" && <Dashboard facilities={facilities} stats={stats} />}
        {activeTab === "zipcodes" && <ZipCodes facilities={facilities} />}
        {activeTab === "facilities" && <Facilities facilities={facilities} />}
      </main>

      <footer className="relative z-10 text-center py-8" style={{ borderTop: "1px solid var(--border)" }}>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          California RCFE Facility Data &middot; Source: CA Community Care Licensing &middot; 2025
        </p>
      </footer>
    </div>
  );
}

"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export interface MapMarker {
  name: string;
  type: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  county: string;
  capacity: number;
  status: string;
  phone: string;
  administrator: string;
  licensee: string;
  licenseDate: string;
  gpo: string;
  number: string;
  lat: number;
  lng: number;
}

const DARK_TILES = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const LIGHT_TILES = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>';

function getMarkerColor(status: string, gpo: string): string {
  if (gpo === "Premier") return "#60a5fa";
  if (gpo === "Vizient") return "#a78bfa";
  if (gpo === "Premier, Vizient") return "#4ade80";
  if (status === "LICENSED") return "#c8956c";
  if (status === "PENDING") return "#fbbf24";
  return "#f87171";
}

function createIcon(status: string, gpo: string) {
  const color = getMarkerColor(status, gpo);
  return L.divIcon({
    className: "",
    html: `<div style="
      width: 10px;
      height: 10px;
      background: ${color};
      border: 2px solid #fff;
      border-radius: 50%;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [10, 10],
    iconAnchor: [5, 5],
  });
}

function getStatusColor(status: string): string {
  if (status === "LICENSED") return "#4ade80";
  if (status === "PENDING") return "#fbbf24";
  return "#f87171";
}

function getGPOBadge(gpo: string): string {
  if (gpo === "None") return "";
  const colors: Record<string, string> = {
    Premier: "#60a5fa",
    Vizient: "#a78bfa",
    "Premier, Vizient": "#4ade80",
  };
  const color = colors[gpo] || "#8b95a8";
  return `<span style="font-size: 11px; color: ${color}; background: ${color}22; padding: 2px 8px; border-radius: 4px; font-weight: 600;">${gpo}</span>`;
}

function buildPopupHTML(m: MapMarker): string {
  const statusColor = getStatusColor(m.status);
  const addr = `${m.address}, ${m.city}, CA ${m.zip}`;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`;
  const gpoBadge = getGPOBadge(m.gpo);

  return `<div class="facility-popup-content" style="font-family: 'DM Sans', sans-serif; min-width: 260px; max-width: 320px; line-height: 1.5;">
    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
      <strong style="font-size: 14px;">${m.name}</strong>
    </div>
    <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 8px; flex-wrap: wrap;">
      <span style="font-size: 11px; color: #888; background: #f0f0f080; padding: 2px 8px; border-radius: 4px;">${m.type === "RCFE-CONTINUING CARE RETIREMENT COMMUNITY" ? "CCRC" : "RCFE"}</span>
      <span style="font-size: 11px; color: ${statusColor}; font-weight: 600;">${m.status}</span>
      ${gpoBadge}
    </div>
    <div style="font-size: 12px; border-top: 1px solid #e5e5e540; padding-top: 8px;">
      <div style="margin-bottom: 6px;">
        <span style="color: #888;">Address:</span><br/>
        <a href="${mapsUrl}" target="_blank" rel="noopener" style="color: #c8956c; text-decoration: none;">${addr}</a>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px 12px;">
        <div><span style="color: #888;">County:</span> ${m.county}</div>
        <div><span style="color: #888;">Capacity:</span> <strong>${m.capacity.toLocaleString()} beds</strong></div>
        <div><span style="color: #888;">License:</span> #${m.number}</div>
        <div><span style="color: #888;">Since:</span> ${m.licenseDate}</div>
      </div>
      ${m.administrator ? `<div style="margin-top: 6px;"><span style="color: #888;">Administrator:</span> ${m.administrator}</div>` : ""}
      <div style="margin-top: 8px; border-top: 1px solid #e5e5e540; padding-top: 8px; display: flex; gap: 12px; flex-wrap: wrap;">
        ${m.phone ? `<a href="tel:${m.phone.replace(/[^0-9+]/g, "")}" style="color: #c8956c; text-decoration: none; font-weight: 500;">&#9742; ${m.phone}</a>` : ""}
        <a href="${mapsUrl}" target="_blank" rel="noopener" style="color: #c8956c; text-decoration: none; font-weight: 500;">&#9873; Directions</a>
      </div>
    </div>
  </div>`;
}

export default function MapView({
  markers,
  onMarkerClick,
}: {
  markers: MapMarker[];
  onMarkerClick: (marker: MapMarker) => void;
}) {
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const tileRef = useRef<L.TileLayer | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const isDark = !document.documentElement.classList.contains("light");

    const map = L.map(containerRef.current, {
      center: [37.0, -119.5],
      zoom: 6,
      zoomControl: true,
    });

    const tile = L.tileLayer(isDark ? DARK_TILES : LIGHT_TILES, {
      attribution: TILE_ATTRIBUTION,
      maxZoom: 19,
    }).addTo(map);

    tileRef.current = tile;
    mapRef.current = map;

    // Watch for theme changes
    const observer = new MutationObserver(() => {
      const nowDark = !document.documentElement.classList.contains("light");
      if (tileRef.current) {
        tileRef.current.setUrl(nowDark ? DARK_TILES : LIGHT_TILES);
      }
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    return () => {
      observer.disconnect();
      map.remove();
      mapRef.current = null;
      tileRef.current = null;
    };
  }, []);

  // Update markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (layerRef.current) {
      map.removeLayer(layerRef.current);
    }

    const layer = L.layerGroup();

    markers.forEach((m) => {
      if (!m.lat || !m.lng || isNaN(m.lat) || isNaN(m.lng)) return;

      const marker = L.marker([m.lat, m.lng], {
        icon: createIcon(m.status, m.gpo),
      });

      marker.bindTooltip(
        `<div style="font-family: 'DM Sans', sans-serif; font-size: 12px;">
          <strong>${m.name}</strong><br/>
          ${m.city} &bull; ${m.capacity} beds<br/>
          ${m.gpo !== "None" ? m.gpo : m.status}
        </div>`,
        { direction: "top", offset: [0, -8] }
      );

      marker.bindPopup(buildPopupHTML(m), {
        maxWidth: 340,
        className: "facility-popup",
      });

      marker.on("click", () => onMarkerClick(m));
      layer.addLayer(marker);
    });

    layer.addTo(map);
    layerRef.current = layer;

    // Fit bounds
    const valid = markers.filter((m) => m.lat && m.lng && !isNaN(m.lat) && !isNaN(m.lng));
    if (valid.length > 0) {
      const bounds = L.latLngBounds(valid.map((m) => [m.lat, m.lng] as [number, number]));
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [markers, onMarkerClick]);

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
}

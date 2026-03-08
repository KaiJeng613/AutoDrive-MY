"use client";

import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix Leaflet default icon issue in Next.js
if (typeof window !== "undefined") {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
    iconUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
    shadowUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  });
}

// Custom EV Charger Icon
const evChargerIcon = typeof window !== "undefined" ? L.divIcon({
  className: "bg-transparent",
  html: `<div class="w-8 h-8 bg-blue-600 rounded-full border-2 border-white flex items-center justify-center shadow-lg shadow-blue-500/50">
           <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/></svg>
         </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
}) : undefined;

interface MapViewProps {
  origin: string;
  destination: string;
  isNavigating: boolean;
  activeEvent?: string;
}

// Coordinates for KL and Genting
const KL_COORDS: [number, number] = [3.139, 101.6869];
const GENTING_COORDS: [number, number] = [3.4226, 101.7946];

// Simulated route points (KL to Genting)
const ROUTE_POINTS: [number, number][] = [
  [3.139, 101.6869], // KL
  [3.175, 101.705], // Setapak
  [3.235, 101.725], // Gombak
  [3.315, 101.765], // Karak Highway start
  [3.385, 101.785], // Gohtong Jaya
  [3.4226, 101.7946], // Genting
];

// EV Charging Stations along the route
const EV_CHARGERS = [
  { id: 1, name: "Genting Sempah R&R DC Charger", coords: [3.35, 101.78] as [number, number], type: "120kW DCFC", available: 2 },
  { id: 2, name: "Batu Caves Supercharger", coords: [3.24, 101.68] as [number, number], type: "250kW Supercharger", available: 4 },
  { id: 3, name: "Setapak AC Charger", coords: [3.19, 101.71] as [number, number], type: "11kW AC", available: 1 },
];

function MapController({ isNavigating }: { isNavigating: boolean }) {
  const map = useMap();

  useEffect(() => {
    if (isNavigating) {
      // Fit bounds to the route
      const bounds = L.latLngBounds(ROUTE_POINTS);
      map.fitBounds(bounds, { padding: [50, 50] });
    } else {
      map.setView(KL_COORDS, 11);
    }
  }, [isNavigating, map]);

  return null;
}

export default function MapView({
  origin,
  destination,
  isNavigating,
  activeEvent,
}: MapViewProps) {
  const [mounted, setMounted] = useState(false);

  // Custom icon for accidents
  const accidentIcon = typeof window !== "undefined" ? L.divIcon({
    className: 'bg-transparent',
    html: `<div class="w-8 h-8 bg-red-500/20 border-2 border-red-500 rounded-full flex items-center justify-center animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.6)]">
             <div class="w-3 h-3 bg-red-500 rounded-full"></div>
           </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  }) : undefined;

  // Custom icon for traffic jams
  const trafficIcon = typeof window !== "undefined" ? L.divIcon({
    className: 'bg-transparent',
    html: `<div class="w-8 h-8 bg-amber-500/20 border-2 border-amber-500 rounded-full flex items-center justify-center animate-pulse shadow-[0_0_15px_rgba(245,158,11,0.6)]">
             <div class="w-3 h-3 bg-amber-500 rounded-full"></div>
           </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  }) : undefined;

  useEffect(() => {
    setTimeout(() => setMounted(true), 0);
  }, []);

  if (!mounted) {
    return (
      <div className="w-full h-full bg-neutral-900 flex items-center justify-center text-neutral-500">
        Loading Map...
      </div>
    );
  }

  return (
    <MapContainer
      center={KL_COORDS}
      zoom={11}
      style={{ width: "100%", height: "100%", background: "#242f3e" }}
      zoomControl={false}
    >
      {/* Dark theme tiles (CartoDB Dark Matter) */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />

      <MapController isNavigating={isNavigating} />

      {/* Always show EV Chargers */}
      {evChargerIcon && EV_CHARGERS.map(charger => (
        <Marker key={charger.id} position={charger.coords} icon={evChargerIcon}>
          <Popup className="bg-neutral-900 text-white border-neutral-800">
            <div className="text-sm font-bold text-blue-400 flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/></svg>
              {charger.name}
            </div>
            <div className="text-xs text-neutral-300 mt-1">{charger.type}</div>
            <div className="text-xs text-emerald-400 mt-1">{charger.available} ports available</div>
          </Popup>
        </Marker>
      ))}

      {isNavigating && (
        <>
          <Polyline
            positions={ROUTE_POINTS}
            color={activeEvent === 'TRAFFIC_JAM' ? '#f59e0b' : activeEvent === 'ACCIDENT' ? '#ef4444' : '#3b82f6'}
            weight={6}
            opacity={0.8}
            className="animate-pulse"
          />
          {activeEvent === 'ACCIDENT' && (
            <Polyline 
              positions={[ROUTE_POINTS[0], [3.25, 101.7], ROUTE_POINTS[ROUTE_POINTS.length - 1]]} // Fake detour
              color="#a855f7" // Purple detour
              weight={4} 
              opacity={0.8}
              dashArray="10, 10"
            />
          )}

          {/* Event Markers */}
          {activeEvent === 'ACCIDENT' && accidentIcon && (
            <Marker position={ROUTE_POINTS[3]} icon={accidentIcon}>
              <Popup className="bg-neutral-900 text-white border-neutral-800">
                <div className="font-bold text-red-500">Major Accident</div>
                <div className="text-xs text-neutral-400 mt-1">Multi-vehicle collision. +1h 20m delay.</div>
              </Popup>
            </Marker>
          )}

          {activeEvent === 'TRAFFIC_JAM' && trafficIcon && (
            <Marker position={ROUTE_POINTS[2]} icon={trafficIcon}>
              <Popup className="bg-neutral-900 text-white border-neutral-800">
                <div className="font-bold text-amber-500">Severe Congestion</div>
                <div className="text-xs text-neutral-400 mt-1">Heavy traffic ahead. +45m delay.</div>
              </Popup>
            </Marker>
          )}

          <Marker position={KL_COORDS}>
            <Popup className="bg-neutral-900 text-white border-neutral-800">
              <div className="text-sm font-semibold">Origin</div>
              <div className="text-xs text-neutral-400">{origin}</div>
            </Popup>
          </Marker>
          <Marker position={GENTING_COORDS}>
            <Popup className="bg-neutral-900 text-white border-neutral-800">
              <div className="text-sm font-semibold">Destination</div>
              <div className="text-xs text-neutral-400">{destination}</div>
            </Popup>
          </Marker>
        </>
      )}
    </MapContainer>
  );
}

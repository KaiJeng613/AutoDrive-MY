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

interface MapViewProps {
  origin: string;
  destination: string;
  isNavigating: boolean;
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
}: MapViewProps) {
  const [mounted, setMounted] = useState(false);

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

      {isNavigating && (
        <>
          <Polyline
            positions={ROUTE_POINTS}
            color="#10b981"
            weight={5}
            opacity={0.8}
            dashArray="10, 10"
            className="animate-pulse"
          />
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

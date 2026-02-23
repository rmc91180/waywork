"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import Link from "next/link";
import "leaflet/dist/leaflet.css";
import { getWorkScoreColor } from "@/lib/work-score";
import { cn } from "@/lib/utils";

export interface MapListing {
  id: string;
  title: string;
  lat: number;
  lng: number;
  pricePerDay: number;
  workScore: number;
  slug: string;
  city: string;
  workspaceType: string;
  images: { url: string; alt: string | null }[];
}

interface SearchMapProps {
  listings: MapListing[];
}

function createPriceIcon(pricePerDay: number): L.DivIcon {
  const priceLabel = `$${Math.round(pricePerDay / 100)}`;
  return L.divIcon({
    className: "custom-price-marker",
    html: `<div style="
      background: white;
      border: 2px solid #2563eb;
      border-radius: 8px;
      padding: 2px 6px;
      font-size: 12px;
      font-weight: 700;
      color: #1e40af;
      white-space: nowrap;
      box-shadow: 0 2px 6px rgba(0,0,0,0.15);
      text-align: center;
      line-height: 1.4;
    ">${priceLabel}/day</div>`,
    iconSize: [70, 28],
    iconAnchor: [35, 28],
    popupAnchor: [0, -30],
  });
}

function FitBounds({ listings }: { listings: MapListing[] }) {
  const map = useMap();

  useEffect(() => {
    if (listings.length === 0) return;

    const validListings = listings.filter(
      (l) => l.lat !== 0 && l.lng !== 0 && isFinite(l.lat) && isFinite(l.lng)
    );

    if (validListings.length === 0) return;

    if (validListings.length === 1) {
      map.setView([validListings[0].lat, validListings[0].lng], 13);
      return;
    }

    const bounds = L.latLngBounds(
      validListings.map((l) => [l.lat, l.lng] as [number, number])
    );
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
  }, [listings, map]);

  return null;
}

function SearchMapInner({ listings }: SearchMapProps) {
  const validListings = useMemo(
    () =>
      listings.filter(
        (l) =>
          l.lat !== 0 && l.lng !== 0 && isFinite(l.lat) && isFinite(l.lng)
      ),
    [listings]
  );

  const defaultCenter: [number, number] = useMemo(() => {
    if (validListings.length > 0) {
      return [validListings[0].lat, validListings[0].lng];
    }
    return [37.7749, -122.4194]; // San Francisco fallback
  }, [validListings]);

  if (validListings.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50 rounded-lg border">
        <div className="text-center">
          <p className="text-gray-500 text-sm">
            No listings with location data to display on the map.
          </p>
        </div>
      </div>
    );
  }

  return (
    <MapContainer
      center={defaultCenter}
      zoom={12}
      className="h-full w-full rounded-lg"
      style={{ minHeight: "400px" }}
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds listings={validListings} />
      {validListings.map((listing) => (
        <Marker
          key={listing.id}
          position={[listing.lat, listing.lng]}
          icon={createPriceIcon(listing.pricePerDay)}
        >
          <Popup>
            <div className="min-w-[200px]">
              {listing.images[0]?.url?.startsWith("http") && (
                <img
                  src={listing.images[0].url}
                  alt={listing.images[0].alt || listing.title}
                  className="w-full h-24 object-cover rounded mb-2"
                />
              )}
              <h3 className="font-semibold text-sm leading-tight mb-1">
                {listing.title}
              </h3>
              <p className="text-xs text-gray-500 mb-1">
                {listing.city} &middot; {listing.workspaceType}
              </p>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-sm">
                  ${Math.round(listing.pricePerDay / 100)}/day
                </span>
                <span
                  className={cn(
                    "text-xs font-bold",
                    getWorkScoreColor(listing.workScore)
                  )}
                >
                  Score: {listing.workScore}
                </span>
              </div>
              <Link
                href={`/spaces/${listing.id}`}
                className="block text-center bg-blue-600 text-white text-xs font-medium py-1.5 px-3 rounded hover:bg-blue-700 transition-colors"
              >
                View Space
              </Link>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

export default SearchMapInner;

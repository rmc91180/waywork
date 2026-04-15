"use client";

import { useEffect, useMemo } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
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
  const label = `$${Math.round(pricePerDay / 100)}`;
  return L.divIcon({
    className: "waywork-map-marker",
    html: `<div style="
      background: rgba(255,255,255,0.96);
      border: 1px solid rgba(15,23,42,0.18);
      border-radius: 999px;
      padding: 3px 9px;
      font-size: 12px;
      font-weight: 700;
      color: #0f172a;
      white-space: nowrap;
      box-shadow: 0 10px 16px -12px rgba(15,23,42,0.55);
      line-height: 1.2;
    ">${label}</div>`,
    iconSize: [56, 24],
    iconAnchor: [28, 24],
    popupAnchor: [0, -22],
  });
}

function FitBounds({ listings }: { listings: MapListing[] }) {
  const map = useMap();

  useEffect(() => {
    if (listings.length === 0) return;
    if (listings.length === 1) {
      map.setView([listings[0].lat, listings[0].lng], 13);
      return;
    }
    const bounds = L.latLngBounds(listings.map((listing) => [listing.lat, listing.lng] as [number, number]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
  }, [listings, map]);

  return null;
}

function SearchMapInner({ listings }: SearchMapProps) {
  const validListings = useMemo(
    () =>
      listings.filter(
        (listing) =>
          listing.lat !== 0 &&
          listing.lng !== 0 &&
          Number.isFinite(listing.lat) &&
          Number.isFinite(listing.lng)
      ),
    [listings]
  );

  const defaultCenter: [number, number] = useMemo(() => {
    if (validListings.length > 0) {
      return [validListings[0].lat, validListings[0].lng];
    }
    return [37.7749, -122.4194];
  }, [validListings]);

  if (validListings.length === 0) {
    return (
      <div className="flex h-full min-h-[420px] items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">No listings to display on the map.</p>
      </div>
    );
  }

  return (
    <MapContainer center={defaultCenter} zoom={12} className="h-full w-full" scrollWheelZoom>
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
            <div className="min-w-[220px] space-y-2">
              {listing.images[0]?.url?.startsWith("http") && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={listing.images[0].url}
                  alt={listing.images[0].alt || listing.title}
                  className="h-24 w-full rounded-md object-cover"
                />
              )}
              <h3 className="line-clamp-2 text-sm font-semibold">{listing.title}</h3>
              <p className="text-xs text-slate-500">
                {listing.city} · {listing.workspaceType}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">
                  ${Math.round(listing.pricePerDay / 100)}/day
                </span>
                <span className={cn("text-xs font-bold", getWorkScoreColor(listing.workScore))}>
                  Score {listing.workScore}
                </span>
              </div>
              <Link
                href={`/spaces/${listing.slug}`}
                className="block rounded-md bg-slate-900 px-3 py-2 text-center text-xs font-medium text-white hover:bg-slate-800"
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

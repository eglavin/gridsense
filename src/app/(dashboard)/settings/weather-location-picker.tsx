"use client";

import type { Map as LeafletMap, Marker as LeafletMarker } from "leaflet";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import "leaflet/dist/leaflet.css";

import { Button } from "@/components/ui/button";

import { updateAppSettings } from "./actions";

const MARKER_ICON_HTML =
	'<div style="width:16px;height:16px;border-radius:50%;background:#3b82f6;border:2px solid white;box-shadow:0 0 0 1px rgba(0,0,0,0.35);"></div>';

export function WeatherLocationPicker({
	latitude,
	longitude,
}: {
	latitude: number;
	longitude: number;
}) {
	const containerRef = useRef<HTMLDivElement>(null);
	const mapRef = useRef<LeafletMap | null>(null);
	const markerRef = useRef<LeafletMarker | null>(null);
	const [position, setPosition] = useState({ lat: latitude, lng: longitude });
	const [dirty, setDirty] = useState(false);
	const [isPending, startTransition] = useTransition();

	// Leaflet touches `window` on import, so it's loaded dynamically inside
	// an effect (browser-only) rather than at module scope, avoiding an SSR
	// crash. Runs once — after that, the marker's own position (tracked in
	// state) is the source of truth, not these initial props.
	useEffect(() => {
		let cancelled = false;

		import("leaflet").then((L) => {
			if (cancelled || !containerRef.current || mapRef.current) return;

			const map = L.map(containerRef.current).setView([latitude, longitude], 9);
			L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
				attribution:
					'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
				maxZoom: 18,
			}).addTo(map);

			const icon = L.divIcon({
				className: "",
				html: MARKER_ICON_HTML,
				iconSize: [16, 16],
				iconAnchor: [8, 8],
			});

			const marker = L.marker([latitude, longitude], {
				icon,
				draggable: true,
			}).addTo(map);

			marker.on("dragend", () => {
				const { lat, lng } = marker.getLatLng();
				setPosition({ lat, lng });
				setDirty(true);
			});

			map.on("click", (e) => {
				marker.setLatLng(e.latlng);
				setPosition({ lat: e.latlng.lat, lng: e.latlng.lng });
				setDirty(true);
			});

			mapRef.current = map;
			markerRef.current = marker;
		});

		return () => {
			cancelled = true;
			mapRef.current?.remove();
			mapRef.current = null;
			markerRef.current = null;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	function handleSave() {
		const lat = Number(position.lat.toFixed(4));
		const lng = Number(position.lng.toFixed(4));

		startTransition(async () => {
			await updateAppSettings({ weatherLatitude: lat, weatherLongitude: lng });
			setDirty(false);
			toast.success(
				`Weather location set to ${lat}, ${lng} — re-run the backfill below to fetch weather for it`,
			);
		});
	}

	return (
		<div className="flex flex-col gap-2">
			<p className="text-muted-foreground text-sm">
				Click the map or drag the marker to set the coordinates Open-Meteo is queried for. Currently{" "}
				<span className="font-mono tabular-nums">
					{position.lat.toFixed(4)}, {position.lng.toFixed(4)}
				</span>
				.
			</p>
			<div ref={containerRef} className="h-120 w-full overflow-hidden rounded-lg border" />
			{dirty && (
				<div className="flex items-center justify-between gap-2">
					<p className="text-muted-foreground text-xs">
						Existing synced weather stays at the old location until you backfill again.
					</p>
					<Button size="sm" onClick={handleSave} disabled={isPending}>
						{isPending ? "Saving…" : "Save location"}
					</Button>
				</div>
			)}
		</div>
	);
}

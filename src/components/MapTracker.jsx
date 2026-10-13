import React, { useEffect, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Polyline,
  CircleMarker,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

// Helper to auto-fit map bounds after data loads
function MapBoundsHelper({ positions }) {
  const map = useMap();
  useEffect(() => {
    if (positions && positions.length > 0) {
      map.fitBounds(positions, { padding: [50, 50] });
    }
  }, [positions, map]);
  return null;
}

const getSpeedColor = (speed) => {
  if (!speed || speed < 5) return "#00E5FF";
  if (speed < 12) return "#00E676";
  if (speed < 18) return "#FFEA00";
  if (speed < 24) return "#FF9100";
  return "#FF1744";
};

export default function MapTracker({ gpsData, activeDataPoint }) {
  const displayData = useMemo(() => {
    const step = Math.max(1, Math.ceil(gpsData.length / 1800));
    return gpsData.filter((_, i) => i % step === 0 || i === gpsData.length - 1);
  }, [gpsData]);
  const bounds = useMemo(
    () =>
      displayData
        .filter(
          (p) =>
            Number.isFinite(p.lat) &&
            Number.isFinite(p.lon) &&
            Math.abs(p.lat) <= 90 &&
            Math.abs(p.lon) <= 180 &&
            !(p.lat === 0 && p.lon === 0),
        )
        .map((p) => [p.lat, p.lon]),
    [displayData],
  );

  // Build color-coded polyline segments from GPS data (low-freq, unique lat/lon)
  const pathSegments = useMemo(() => {
    if (!displayData.length) return [];

    const segments = [];

    for (let i = 0; i < displayData.length - 1; i++) {
      const p1 = displayData[i];
      const p2 = displayData[i + 1];

      if (
        p1.lat != null &&
        !isNaN(p1.lat) &&
        p1.lon != null &&
        !isNaN(p1.lon) &&
        p2.lat != null &&
        !isNaN(p2.lat) &&
        p2.lon != null &&
        !isNaN(p2.lon) &&
        !(p1.lat === 0 && p1.lon === 0) &&
        !(p2.lat === 0 && p2.lon === 0)
      ) {
        const avgSpeed = ((p1.speed_knots || 0) + (p2.speed_knots || 0)) / 2;
        segments.push(
          <Polyline
            key={i}
            positions={[
              [p1.lat, p1.lon],
              [p2.lat, p2.lon],
            ]}
            pathOptions={{
              color: getSpeedColor(avgSpeed),
              weight: 4,
              opacity: 0.9,
            }}
          />,
        );
      }
    }

    return segments;
  }, [displayData]);

  if (!bounds.length) {
    return (
      <div
        className="bg-gray-50 rounded-3xl flex items-center justify-center p-12 border border-gray-100"
        style={{ height: "400px" }}
      >
        <p className="text-gray-400 font-medium">
          Nessuna posizione GPS valida.
        </p>
      </div>
    );
  }

  return (
    <div className="relative rounded-3xl overflow-hidden border border-gray-100 shadow-sm">
      {/* Speed Legend */}
      <div className="absolute top-4 right-4 z-[1000] bg-white/90 backdrop-blur-md p-4 rounded-2xl border border-gray-100 shadow-xl space-y-3 min-w-[120px]">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-bottom border-gray-100 pb-1">
          Velocità (kn)
        </p>
        <div className="space-y-2">
          {[
            ["#00E5FF", "< 5"],
            ["#00E676", "5-12"],
            ["#FFEA00", "12-18"],
            ["#FF9100", "18-24"],
            ["#FF1744", "> 24"],
          ].map(([color, label]) => (
            <div key={label} className="flex items-center gap-3">
              <span
                className="w-2.5 h-2.5 rounded-full shadow-sm"
                style={{ background: color }}
              />
              <span className="text-[11px] font-bold text-gray-600">
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <MapContainer
        center={bounds[0]}
        zoom={13}
        maxZoom={19}
        scrollWheelZoom={true}
        className="w-full h-[500px] z-[1]"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        {pathSegments}

        {activeDataPoint && activeDataPoint.lat && activeDataPoint.lon && (
          <CircleMarker
            center={[activeDataPoint.lat, activeDataPoint.lon]}
            radius={8}
            pathOptions={{
              color: "#fff",
              fillColor: "#822433",
              fillOpacity: 1,
              weight: 3,
              className: "shadow-lg",
            }}
          />
        )}

        <MapBoundsHelper positions={bounds} />
      </MapContainer>
    </div>
  );
}

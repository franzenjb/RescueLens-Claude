import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { DamageReport, DamageSeverity } from '../types';

interface MapViewProps {
  reports: DamageReport[];
}

const SEVERITY_COLORS: Record<DamageSeverity, string> = {
  [DamageSeverity.NO_VISIBLE_DAMAGE]: '#64748b',
  [DamageSeverity.AFFECTED]: '#3b82f6',
  [DamageSeverity.MINOR]: '#eab308',
  [DamageSeverity.MAJOR]: '#f97316',
  [DamageSeverity.DESTROYED]: '#dc2626',
};

export const MapView: React.FC<MapViewProps> = ({ reports }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Initialize map centered on Tampa Bay area
    const map = L.map(mapRef.current).setView([27.85, -82.75], 10);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 19,
    }).addTo(map);

    mapInstanceRef.current = map;
    markersRef.current = L.layerGroup().addTo(map);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current || !markersRef.current) return;

    // Clear existing markers
    markersRef.current.clearLayers();

    // Add markers for each report
    reports.forEach(report => {
      if (!report.location.lat || !report.location.lng) return;

      const severity = report.analysis?.overallSeverity || DamageSeverity.NO_VISIBLE_DAMAGE;
      const color = SEVERITY_COLORS[severity];

      // Create custom icon
      const icon = L.divIcon({
        className: 'custom-marker',
        html: `
          <div style="
            width: 24px;
            height: 24px;
            background: ${color};
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 8px rgba(0,0,0,0.4);
          "></div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const marker = L.marker([report.location.lat, report.location.lng], { icon });

      // Create popup content
      const popupContent = `
        <div style="
          background: #0f172a;
          color: white;
          padding: 16px;
          border-radius: 12px;
          min-width: 280px;
          font-family: system-ui, -apple-system, sans-serif;
        ">
          <div style="margin-bottom: 12px;">
            <img src="${report.imageData}" style="
              width: 100%;
              height: 120px;
              object-fit: cover;
              border-radius: 8px;
              border: 1px solid #334155;
            " />
          </div>
          <div style="
            display: inline-block;
            padding: 4px 12px;
            background: ${color}30;
            color: ${color};
            border: 1px solid ${color}50;
            border-radius: 20px;
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
          ">
            ${severity.replace(/_/g, ' ')}
          </div>
          <h3 style="
            margin: 0 0 8px 0;
            font-size: 14px;
            font-weight: 700;
            color: #f1f5f9;
          ">
            ${report.location.address}
          </h3>
          <p style="
            margin: 0 0 12px 0;
            font-size: 12px;
            color: #94a3b8;
            line-height: 1.5;
          ">
            ${report.analysis?.summary || 'Analysis pending...'}
          </p>
          <div style="
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding-top: 12px;
            border-top: 1px solid #334155;
          ">
            <span style="font-size: 10px; color: #64748b; font-family: monospace;">
              ${report.id.slice(0, 15)}...
            </span>
            <span style="font-size: 10px; color: #64748b;">
              ${new Date(report.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent, {
        maxWidth: 320,
        className: 'custom-popup',
      });

      markersRef.current?.addLayer(marker);
    });

    // Fit bounds if there are reports
    if (reports.length > 0) {
      const validReports = reports.filter(r => r.location.lat && r.location.lng);
      if (validReports.length > 0) {
        const bounds = L.latLngBounds(
          validReports.map(r => [r.location.lat, r.location.lng])
        );
        mapInstanceRef.current?.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [reports]);

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
      {/* Map Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <h2 className="text-sm font-black text-white uppercase tracking-widest">
          Assessment Map
        </h2>
        <div className="flex items-center gap-4">
          {Object.entries(SEVERITY_COLORS).map(([severity, color]) => (
            <div key={severity} className="flex items-center gap-1.5">
              <div
                className="w-3 h-3 rounded-full border-2 border-white"
                style={{ backgroundColor: color }}
              />
              <span className="text-[10px] text-slate-400 uppercase hidden lg:inline">
                {severity.replace(/_/g, ' ').split(' ')[0]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Map Container */}
      <div
        ref={mapRef}
        className="h-[600px] w-full"
        style={{ background: '#0f172a' }}
      />

      {/* Custom Styles */}
      <style>{`
        .custom-popup .leaflet-popup-content-wrapper {
          background: transparent;
          padding: 0;
          box-shadow: none;
        }
        .custom-popup .leaflet-popup-content {
          margin: 0;
        }
        .custom-popup .leaflet-popup-tip {
          background: #0f172a;
        }
        .leaflet-container {
          font-family: system-ui, -apple-system, sans-serif;
        }
      `}</style>
    </div>
  );
};

export default MapView;

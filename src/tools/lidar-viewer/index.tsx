import React, { useState, useRef, useEffect } from 'react';
import { Viewer, Entity, CameraFlyTo, Cesium3DTileset } from 'resium';
import {
  Cartesian3,
  Color,
  Math as CesiumMath,
  VerticalOrigin,
  HorizontalOrigin,
  NearFarScalar,
  Cesium3DTileset as Cesium3DTilesetClass,
  RequestScheduler,
} from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import {
  Maximize2, Minimize2, MapPin, AlertTriangle, Info,
  Building2, Navigation, Layers, ChevronDown, Globe2
} from 'lucide-react';

// Google Maps API Key for Photorealistic 3D Tiles
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyD0BIxrrRzbIrfXkoHjId_EDpelwE4yuco';

// Increase concurrent tile requests for faster loading
if (typeof RequestScheduler !== 'undefined') {
  (RequestScheduler as any).requestsByServer = {
    ...((RequestScheduler as any).requestsByServer || {}),
    'tile.googleapis.com:443': 18,
  };
}

// Pre-configured disaster locations
const DISASTER_LOCATIONS = [
  {
    id: 'fort-myers',
    name: 'Fort Myers Beach, FL',
    event: 'Hurricane Ian (2022)',
    lat: 26.4549,
    lng: -81.9495,
    height: 800,
    heading: 45,
    pitch: -30,
  },
  {
    id: 'mayfield',
    name: 'Mayfield, KY',
    event: 'December 2021 Tornado',
    lat: 36.7417,
    lng: -88.6367,
    height: 600,
    heading: 0,
    pitch: -35,
  },
  {
    id: 'paradise',
    name: 'Paradise, CA',
    event: 'Camp Fire (2018)',
    lat: 39.7596,
    lng: -121.6219,
    height: 1200,
    heading: 90,
    pitch: -25,
  },
  {
    id: 'new-york',
    name: 'New York City, NY',
    event: 'Demo Location',
    lat: 40.7128,
    lng: -74.0060,
    height: 1500,
    heading: -20,
    pitch: -30,
  },
  {
    id: 'san-francisco',
    name: 'San Francisco, CA',
    event: 'Demo Location',
    lat: 37.7749,
    lng: -122.4194,
    height: 1200,
    heading: 45,
    pitch: -30,
  },
];

// Simulated damage markers for demo
const DAMAGE_MARKERS = [
  { lat: 26.4560, lng: -81.9510, severity: 'destroyed', address: '123 Estero Blvd' },
  { lat: 26.4540, lng: -81.9480, severity: 'major', address: '456 Bay St' },
  { lat: 26.4555, lng: -81.9505, severity: 'major', address: '789 Beach Rd' },
  { lat: 26.4545, lng: -81.9490, severity: 'minor', address: '321 Gulf Dr' },
  { lat: 26.4565, lng: -81.9515, severity: 'destroyed', address: '654 Shore Ln' },
  { lat: 26.4535, lng: -81.9500, severity: 'minor', address: '987 Palm Ave' },
  { lat: 26.4570, lng: -81.9485, severity: 'intact', address: '246 Ocean View' },
];

const SEVERITY_COLORS: Record<string, Color> = {
  destroyed: Color.RED,
  major: Color.ORANGE,
  minor: Color.YELLOW,
  intact: Color.GREEN,
};

export function LidarViewerTool() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showInfo, setShowInfo] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState(DISASTER_LOCATIONS[0]);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [showMarkers, setShowMarkers] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);

  // Configure viewer after mount
  useEffect(() => {
    const timer = setTimeout(() => {
      if (viewerRef.current?.cesiumElement) {
        const viewer = viewerRef.current.cesiumElement;
        // Hide the globe since we're using 3D tiles
        viewer.scene.globe.show = false;
        // Show credits on screen (required by Google)
        viewer.scene.globe.enableLighting = false;
      }
      setIsLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleLocationChange = (location: typeof DISASTER_LOCATIONS[0]) => {
    setSelectedLocation(location);
    setShowLocationDropdown(false);

    if (viewerRef.current?.cesiumElement) {
      const viewer = viewerRef.current.cesiumElement;
      viewer.camera.flyTo({
        destination: Cartesian3.fromDegrees(
          location.lng,
          location.lat,
          location.height
        ),
        orientation: {
          heading: CesiumMath.toRadians(location.heading),
          pitch: CesiumMath.toRadians(location.pitch),
          roll: 0,
        },
        duration: 2,
      });
    }
  };

  const stats = {
    totalStructures: 156,
    destroyed: 23,
    majorDamage: 45,
    minorDamage: 38,
    intact: 50,
  };

  const cameraDestination = Cartesian3.fromDegrees(
    selectedLocation.lng,
    selectedLocation.lat,
    selectedLocation.height
  );

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[calc(100vh-180px)] min-h-[600px] bg-slate-900 rounded-xl overflow-hidden"
    >
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4 bg-gradient-to-b from-black/70 to-transparent">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-red-700 rounded-lg flex items-center justify-center shadow-lg">
            <Globe2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="text-white font-semibold text-lg drop-shadow">3D Globe View</span>
            <div className="text-white/70 text-sm drop-shadow flex items-center gap-2">
              <span className="bg-emerald-500/80 text-white text-xs px-2 py-0.5 rounded font-medium">3D</span>
              Google Photorealistic 3D Tiles
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Location Selector */}
          <div className="relative">
            <button
              onClick={() => setShowLocationDropdown(!showLocationDropdown)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors backdrop-blur"
            >
              <MapPin className="w-4 h-4" />
              <span className="text-sm font-medium">{selectedLocation.name}</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showLocationDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showLocationDropdown && (
              <div className="absolute right-0 mt-2 w-72 bg-slate-800/95 backdrop-blur-lg rounded-xl shadow-xl border border-white/10 overflow-hidden z-50">
                {DISASTER_LOCATIONS.map((loc) => (
                  <button
                    key={loc.id}
                    onClick={() => handleLocationChange(loc)}
                    className={`w-full px-4 py-3 text-left hover:bg-white/10 transition-colors ${
                      selectedLocation.id === loc.id ? 'bg-red-600/30' : ''
                    }`}
                  >
                    <div className="text-white font-medium">{loc.name}</div>
                    <div className="text-white/60 text-sm">{loc.event}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => setShowMarkers(!showMarkers)}
            className={`p-2 rounded-lg transition-colors backdrop-blur ${
              showMarkers ? 'bg-red-600/50 text-white' : 'bg-white/20 text-white hover:bg-white/30'
            }`}
            title="Toggle damage markers"
          >
            <AlertTriangle className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowInfo(!showInfo)}
            className="p-2 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors backdrop-blur"
          >
            <Info className="w-5 h-5" />
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors backdrop-blur"
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-900">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <div className="text-white text-lg font-medium">Loading 3D Globe...</div>
            <div className="text-white/60 text-sm mt-1">Streaming Google 3D Tiles</div>
          </div>
        </div>
      )}

      {/* Cesium Viewer */}
      <Viewer
        ref={viewerRef}
        full
        timeline={false}
        animation={false}
        homeButton={false}
        baseLayerPicker={false}
        navigationHelpButton={false}
        sceneModePicker={false}
        geocoder={false}
        fullscreenButton={false}
        vrButton={false}
        infoBox={false}
        selectionIndicator={false}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      >
        {/* Google Photorealistic 3D Tiles */}
        <Cesium3DTileset
          url={`https://tile.googleapis.com/v1/3dtiles/root.json?key=${GOOGLE_MAPS_API_KEY}`}
          showCreditsOnScreen={true}
          onReady={(tileset: Cesium3DTilesetClass) => {
            console.log('Google 3D Tiles loaded');
          }}
        />

        {/* Initial camera position */}
        <CameraFlyTo
          destination={cameraDestination}
          orientation={{
            heading: CesiumMath.toRadians(selectedLocation.heading),
            pitch: CesiumMath.toRadians(selectedLocation.pitch),
            roll: 0,
          }}
          duration={0}
        />

        {/* Damage markers */}
        {showMarkers && selectedLocation.id === 'fort-myers' && DAMAGE_MARKERS.map((marker, i) => (
          <Entity
            key={i}
            position={Cartesian3.fromDegrees(marker.lng, marker.lat, 20)}
            point={{
              pixelSize: 14,
              color: SEVERITY_COLORS[marker.severity],
              outlineColor: Color.WHITE,
              outlineWidth: 2,
              scaleByDistance: new NearFarScalar(100, 2.5, 5000, 0.8),
            }}
            label={{
              text: marker.address,
              font: 'bold 14px sans-serif',
              fillColor: Color.WHITE,
              outlineColor: Color.BLACK,
              outlineWidth: 2,
              style: 2,
              verticalOrigin: VerticalOrigin.BOTTOM,
              horizontalOrigin: HorizontalOrigin.CENTER,
              pixelOffset: { x: 0, y: -20 } as any,
              scaleByDistance: new NearFarScalar(100, 1.2, 3000, 0.4),
              showBackground: true,
              backgroundColor: Color.BLACK.withAlpha(0.6),
            }}
            description={`<div style="padding:12px;font-family:system-ui"><strong style="font-size:16px">${marker.address}</strong><br/><span style="color:${marker.severity === 'destroyed' ? '#ef4444' : marker.severity === 'major' ? '#f97316' : marker.severity === 'minor' ? '#eab308' : '#22c55e'};font-weight:bold;text-transform:uppercase">${marker.severity}</span> damage</div>`}
          />
        ))}
      </Viewer>

      {/* Info Panel */}
      {showInfo && (
        <div className="absolute left-4 top-24 bg-black/70 backdrop-blur-md rounded-xl p-4 text-white max-w-xs shadow-xl border border-white/10 z-10">
          <h3 className="flex items-center gap-2 text-lg font-semibold mb-3">
            <Building2 className="w-5 h-5 text-cyan-400" />
            {selectedLocation.name}
          </h3>
          <div className="text-sm text-white/70 mb-3">{selectedLocation.event}</div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-300">Total Structures:</span>
              <span className="font-bold">{stats.totalStructures}</span>
            </div>
            <div className="h-px bg-white/20" />
            <div className="flex justify-between">
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500" />
                Destroyed:
              </span>
              <span className="font-bold text-red-400">{stats.destroyed}</span>
            </div>
            <div className="flex justify-between">
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-orange-500" />
                Major Damage:
              </span>
              <span className="font-bold text-orange-400">{stats.majorDamage}</span>
            </div>
            <div className="flex justify-between">
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-yellow-500" />
                Minor Damage:
              </span>
              <span className="font-bold text-yellow-400">{stats.minorDamage}</span>
            </div>
            <div className="flex justify-between">
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-green-500" />
                Intact:
              </span>
              <span className="font-bold text-green-400">{stats.intact}</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/20">
            <div className="text-xs text-amber-400/80 font-medium mb-1">
              Simulated damage data for demo
            </div>
            <div className="text-xs text-white/50">
              Imagery: Google Photorealistic 3D Tiles
            </div>
          </div>
        </div>
      )}

      {/* Controls Help */}
      <div className="absolute bottom-4 left-4 flex gap-4 text-white/70 text-sm drop-shadow z-10">
        <div className="flex items-center gap-2">
          <Navigation className="w-4 h-4" />
          <span>Drag to pan/rotate</span>
        </div>
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4" />
          <span>Scroll to zoom</span>
        </div>
      </div>

      {/* Attribution */}
      <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur rounded-lg px-3 py-2 shadow-lg z-10">
        <div className="text-xs text-emerald-400 font-medium">PHOTOREALISTIC 3D</div>
        <div className="text-white font-medium">Google Maps Platform</div>
        <div className="text-xs text-gray-400">Real 3D buildings and terrain</div>
      </div>
    </div>
  );
}

export default LidarViewerTool;

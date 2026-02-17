"use client";
import { useEffect, useId } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in Leaflet with Next.js/Webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom Icons
const busIcon = new L.Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/3448/3448339.png', // Bus Emoji or similar
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15],
    className: 'bus-marker-icon' // We can style this for the pulse effect
});

const stopIcon = new L.Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png', // Pin
    iconSize: [25, 25],
    iconAnchor: [12, 25],
    popupAnchor: [0, -25]
});

// Component to handle map view updates
function MapUpdater({ center }) {
    const map = useMap();
    useEffect(() => {
        if (center) {
            map.setView(center, map.getZoom());
        }
    }, [center, map]);
    return null;
}

export default function LeafletMap({ stops, buses, selectedStop, routePath }) {
    const mapId = useId();
    // Center map on selected stop or default
    const center = selectedStop ? [selectedStop.lat, selectedStop.lon] : [17.3850, 78.4867];

    return (
        <MapContainer
            id={mapId}
            center={center}
            zoom={13}
            style={{ height: '100%', width: '100%', background: 'transparent' }}
            zoomControl={false} // We can add custom or just use scroll
        >
            {/* Dark Mode CartoDB tiles for Sci-Fi look */}
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            />

            {/* Route Line */}
            {routePath && <Polyline positions={routePath} color="#ff6b35" weight={5} opacity={0.8} dashArray="10, 10" />}

            {/* Bus Stops */}
            {stops.map(stop => (
                <Marker
                    key={stop.name}
                    position={[stop.lat, stop.lon]}
                    icon={stopIcon}
                    opacity={selectedStop?.name === stop.name ? 1 : 0.6}
                >
                    <Popup>{stop.name}</Popup>
                </Marker>
            ))}

            {/* Live Buses */}
            {buses.map(bus => (
                <Marker
                    key={bus.busId}
                    position={[bus.lat, bus.lon]}
                    icon={busIcon}
                >
                    <Popup>
                        <strong>{bus.busId}</strong><br />
                        Speed: {Math.round(bus.speed)} km/h
                    </Popup>
                </Marker>
            ))}

            <MapUpdater center={center} />
        </MapContainer>
    );
}

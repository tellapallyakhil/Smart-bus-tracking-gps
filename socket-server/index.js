const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all origins for simplicity
        methods: ["GET", "POST"]
    }
});

// In-memory state
let activeBuses = {}; // { socketId: { busId, lat, lon, speed, routeId, type: 'DRIVER' } }
let activeUsers = {};

const ROUTES = {
    "ROUTE_101": {
        name: "Secunderabad to Charminar",
        path: [
            [17.4399, 78.4983], // Start
            [17.3616, 78.4747]  // End
        ]
    }
};

const GEOFENCES = require('./geofences');

// Helper: Haversine
function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // km
}

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // --- Driver Events ---
    socket.on('driver_login', ({ busId, routeId }) => {
        console.log(`Driver logged in: ${busId} on ${routeId}`);
        activeBuses[socket.id] = {
            id: socket.id,
            busId,
            routeId,
            lat: 0,
            lon: 0,
            speed: 0,
            type: 'DRIVER',
            lastUpdate: Date.now(),
            lastGeofence: null
        };
        // Broadcast new bus to all users
        io.emit('bus_update', Object.values(activeBuses));
    });

    socket.on('driver_location', (data) => {
        if (activeBuses[socket.id]) {
            const bus = activeBuses[socket.id];

            // 1. Update State
            activeBuses[socket.id] = {
                ...bus,
                lat: data.lat,
                lon: data.lon,
                speed: data.speed,
                occupancy: data.occupancy || 'Low',
                lastUpdate: Date.now()
            };

            // 2. Geofencing Check
            GEOFENCES.forEach(zone => {
                const dist = getDistance(data.lat, data.lon, zone.lat, zone.lon);
                if (dist <= zone.radius) {
                    // Inside Zone
                    if (bus.lastGeofence !== zone.name) {
                        // Trigger Enter Event
                        console.log(`${bus.busId} entered ${zone.name}`);
                        io.emit('geofence_alert', {
                            busId: bus.busId,
                            message: `Bus ${bus.busId} has arrived at ${zone.name}`,
                            type: 'arrival',
                            timestamp: Date.now()
                        });
                        activeBuses[socket.id].lastGeofence = zone.name;
                    }
                } else {
                    // Verify if we just left the zone
                    if (bus.lastGeofence === zone.name) {
                        // Reset if far enough away (prevent jitter) so we can trigger "Arrived" again next time
                        if (dist > zone.radius + 0.2) {
                            activeBuses[socket.id].lastGeofence = null;
                        }
                    }
                }
            });

            // Broadcast live update
            io.emit('bus_update', Object.values(activeBuses));
        }
    });

    // --- User Events ---
    socket.on('request_buses', () => {
        socket.emit('bus_update', Object.values(activeBuses));
    });

    socket.on('panic_signal', (data) => {
        console.log(`PANIC SIGNAL from ${data.userId} at ${data.location}`);
        io.emit('emergency_alert', data);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        if (activeBuses[socket.id]) {
            delete activeBuses[socket.id];
            // Notify users a bus went offline
            io.emit('bus_update', Object.values(activeBuses));
        }
    });
});

const PORT = 4000;
server.listen(PORT, () => {
    console.log(`Socket Server running on port ${PORT}`);
});

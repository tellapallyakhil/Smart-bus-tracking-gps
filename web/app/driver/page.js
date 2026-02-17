"use client";
import { useState, useEffect } from 'react';
import io from 'socket.io-client';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useRef } from 'react';

let socket;

// --- Hyderabad Bus Stops Data ---
const HYD_STOPS = [
    { name: "Secunderabad Station", lat: 17.4399, lon: 78.4983 },
    { name: "Paradise Circle", lat: 17.4411, lon: 78.4876 },
    { name: "Tank Bund", lat: 17.4239, lon: 78.4738 },
    { name: "Secretariat", lat: 17.4062, lon: 78.4690 },
    { name: "Afzal Gunj", lat: 17.3753, lon: 78.4795 },
    { name: "Charminar", lat: 17.3616, lon: 78.4747 },
    { name: "Mehdipatnam", lat: 17.3950, lon: 78.4400 },
    { name: "Gachibowli", lat: 17.4401, lon: 78.3489 },
    { name: "Hitech City", lat: 17.4435, lon: 78.3772 },
    { name: "Kukatpally", lat: 17.4933, lon: 78.3914 },
    { name: "Uppal X Roads", lat: 17.4019, lon: 78.5603 },
    { name: "LB Nagar", lat: 17.3524, lon: 78.5492 }
];

export default function DriverApp() {
    const [loggedIn, setLoggedIn] = useState(false);
    const [busId, setBusId] = useState('BUS_01');
    const [route, setRoute] = useState('ROUTE_101');
    const [status, setStatus] = useState('Offline');
    const [isTracking, setIsTracking] = useState(false);
    const watchId = useRef(null);

    // Manual overrides
    const [manualMode, setManualMode] = useState(false);
    const [manualLat, setManualLat] = useState(17.3850);
    const [manualLon, setManualLon] = useState(78.4867);
    const [selectedStopName, setSelectedStopName] = useState("");
    const [occupancy, setOccupancy] = useState('Low'); // Low, Medium, High

    // Auth Check
    const [authLoading, setAuthLoading] = useState(true);
    const [user, setUser] = useState(null);
    const router = useRouter();

    useEffect(() => {
        socket = io('http://localhost:4000');

        // Check Auth
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push('/login');
            } else {
                setUser(user);
                setAuthLoading(false);
            }
        };
        checkUser();

        return () => {
            socket.disconnect();
            if (watchId.current !== null) {
                navigator.geolocation.clearWatch(watchId.current);
            }
        };
    }, []);

    // Reactive update for manual mode
    useEffect(() => {
        if (isTracking && manualMode) {
            updateLocation(manualLat, manualLon, 16.67);
        }
    }, [manualLat, manualLon, occupancy, isTracking, manualMode]);

    // Handle switching modes while tracking is active
    useEffect(() => {
        if (!isTracking) return;

        if (manualMode) {
            // Stopped GPS, switched to Manual
            if (watchId.current !== null) {
                navigator.geolocation.clearWatch(watchId.current);
                watchId.current = null;
            }
            setStatus('Tracking (Manual)...');
        } else {
            // Switched to GPS
            setStatus('Tracking (GPS)...');
            if (watchId.current === null) {
                if (!navigator.geolocation) {
                    alert("GPS not supported");
                    return;
                }
                watchId.current = navigator.geolocation.watchPosition((pos) => {
                    const { latitude, longitude, speed } = pos.coords;
                    updateLocation(latitude, longitude, speed);
                }, (err) => {
                    console.error(err);
                    setStatus("GPS Error");
                }, { enableHighAccuracy: true });
            }
        }
    }, [manualMode]);

    const handleLogin = () => {
        if (!busId) return;
        socket.emit('driver_login', { busId, routeId: route });
        setLoggedIn(true);
        setStatus('Ready to Track');
    };

    const toggleTracking = () => {
        if (isTracking) {
            setIsTracking(false);
            setStatus('Paused');
            if (watchId.current !== null) {
                navigator.geolocation.clearWatch(watchId.current);
                watchId.current = null;
            }
        } else {
            setIsTracking(true);
            setStatus(manualMode ? 'Tracking (Manual)...' : 'Tracking (GPS)...');

            if (!manualMode) {
                if (!navigator.geolocation) {
                    alert("GPS not supported");
                    return;
                }
                watchId.current = navigator.geolocation.watchPosition((pos) => {
                    const { latitude, longitude, speed } = pos.coords;
                    updateLocation(latitude, longitude, speed);
                }, (err) => {
                    console.error(err);
                    setStatus("GPS Error");
                }, { enableHighAccuracy: true });
            } else {
                updateLocation(manualLat, manualLon, 16.67);
            }
        }
    };

    const updateLocation = (lat, lon, speed) => {
        socket.emit('driver_location', {
            lat: parseFloat(lat),
            lon: parseFloat(lon),
            speed: speed ? (parseFloat(speed) * 3.6) : 0,
            occupancy: occupancy
        });
    };

    const handleManualUpdate = () => {
        if (isTracking && manualMode) {
            updateLocation(parseFloat(manualLat), parseFloat(manualLon), 16.67);
            alert("Location Update Sent!");
        }
    };

    const handleStopSelect = (e) => {
        const stopName = e.target.value;
        setSelectedStopName(stopName);
        const stop = HYD_STOPS.find(s => s.name === stopName);
        if (stop) {
            setManualLat(stop.lat);
            setManualLon(stop.lon);
        }
    };

    if (authLoading) return <div style={{ textAlign: 'center', marginTop: 50 }}>Loading Driver Profile...</div>;

    if (!loggedIn) {
        return (
            <main style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
                <div className="glass-panel" style={{ width: 350, textAlign: 'center' }}>
                    <h1>👨‍✈️ Driver Setup</h1>
                    <p style={{ marginBottom: 20, fontSize: 12, color: '#aaa' }}>Logged in as: {user?.email}</p>

                    <div style={{ marginTop: 20 }}>
                        <label style={{ display: 'block', textAlign: 'left', marginBottom: 5 }}>Bus ID</label>
                        <input value={busId} onChange={e => setBusId(e.target.value)} />

                        <label style={{ display: 'block', textAlign: 'left', marginBottom: 5 }}>Route</label>
                        <select value={route} onChange={e => setRoute(e.target.value)}>
                            <option value="ROUTE_101">Secunderabad - Charminar</option>
                            <option value="ROUTE_202">Hitech City - Gachibowli</option>
                        </select>

                        <button className="primary-btn" style={{ width: '100%', marginTop: 20 }} onClick={handleLogin}>
                            Start Session
                        </button>

                        <button onClick={async () => {
                            await supabase.auth.signOut();
                            router.push('/login');
                        }} style={{ marginTop: 10, background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: 12 }}>
                            Sign Out
                        </button>
                    </div>
                </div>
            </main>
        )
    }

    return (
        <main style={{ padding: 20 }}>
            <div className="glass-panel" style={{ textAlign: 'center', marginTop: 30, maxWidth: 500, margin: '30px auto' }}>
                <h2>📍 Driver Dashboard</h2>
                <div style={{ fontSize: 40, margin: '20px 0' }}>{isTracking ? '🟢' : '🔴'}</div>
                <h3 style={{ color: isTracking ? '#00ff88' : '#aaa' }}>{status}</h3>
                <p>Bus: {busId} | Route: {route}</p>

                <div style={{ margin: '20px 0', textAlign: 'left', background: 'rgba(0,0,0,0.3)', padding: 15, borderRadius: 8 }}>
                    <label style={{ fontSize: 12, color: '#aaa', marginBottom: 10, display: 'block' }}>Bus Occupancy</label>
                    <div style={{ display: 'flex', gap: 10 }}>
                        {['Low', 'Medium', 'High'].map(level => (
                            <button
                                key={level}
                                onClick={() => setOccupancy(level)}
                                style={{
                                    flex: 1,
                                    padding: '10px',
                                    border: `2px solid ${occupancy === level ? 'var(--accent-primary)' : 'transparent'}`,
                                    background: occupancy === level ? 'rgba(255, 107, 53, 0.2)' : 'rgba(0,0,0,0.4)',
                                    color: occupancy === level ? 'white' : '#aaa',
                                    borderRadius: 8,
                                    cursor: 'pointer'
                                }}
                            >
                                {level === 'Low' ? '🟢' : level === 'Medium' ? '🟡' : '🔴'} {level}
                            </button>
                        ))}
                    </div>
                </div>

                <div style={{ margin: '20px 0', textAlign: 'left', background: 'rgba(0,0,0,0.3)', padding: 15, borderRadius: 8 }}>
                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', marginBottom: 10 }}>
                        <input type="checkbox" checked={manualMode} onChange={e => setManualMode(e.target.checked)} style={{ width: 'auto', marginRight: 10 }} />
                        Enable Manual Location Override
                    </label>

                    {manualMode && (
                        <div>
                            <label style={{ fontSize: 12, color: '#aaa', marginTop: 10, display: 'block' }}>Jump to Known Stop:</label>
                            <select value={selectedStopName} onChange={handleStopSelect}>
                                <option value="">-- Select a Stop --</option>
                                {HYD_STOPS.map(s => (
                                    <option key={s.name} value={s.name}>{s.name}</option>
                                ))}
                            </select>

                            <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: 12 }}>Latitude</label>
                                    <input type="number" value={manualLat} onChange={e => setManualLat(e.target.value)} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: 12 }}>Longitude</label>
                                    <input type="number" value={manualLon} onChange={e => setManualLon(e.target.value)} />
                                </div>
                            </div>

                            <button className="primary-btn" onClick={handleManualUpdate} style={{ marginTop: 10, background: '#ff0055' }}>
                                Force Update Location
                            </button>
                        </div>
                    )}
                </div>

                <button className="primary-btn" style={{ background: isTracking ? '#e00' : '#0070f3', width: '100%' }} onClick={toggleTracking}>
                    {isTracking ? 'Stop Tracking' : 'Start Tracking'}
                </button>
            </div>
        </main>
    );
}

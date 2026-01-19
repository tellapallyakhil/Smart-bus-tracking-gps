"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import io from 'socket.io-client';
import { supabase } from '@/lib/supabase';
import dynamic from 'next/dynamic';

// Dynamic Import for Map (Client Side Only)
const LeafletMap = dynamic(() => import('../../components/LeafletMap'), {
    ssr: false,
    loading: () => <div style={{ height: '100%', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888' }}>Loading Map...</div>
});

let socket;

// Route Configuration
const ROUTES = [
    { id: 'ROUTE_101', name: 'Secunderabad - Charminar', color: '#ff6b35' },
    { id: 'ROUTE_202', name: 'Hitech City - Gachibowli', color: '#4cc9f0' },
];

const HYD_STOPS = [
    { name: "Secunderabad Station", lat: 17.4399, lon: 78.4983 },
    { name: "Paradise Circle", lat: 17.4411, lon: 78.4877 },
    { name: "Tank Bund", lat: 17.4239, lon: 78.4738 },
    { name: "Secretariat", lat: 17.4062, lon: 78.4690 },
    { name: "Charminar", lat: 17.3616, lon: 78.4747 },
    { name: "Hitech City", lat: 17.4435, lon: 78.3772 },
    { name: "Gachibowli", lat: 17.4401, lon: 78.3489 },
];

export default function AdminDashboard() {
    const [buses, setBuses] = useState([]);
    const [alerts, setAlerts] = useState([]);
    const [activeTab, setActiveTab] = useState('overview');
    const [user, setUser] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [systemStatus, setSystemStatus] = useState({ socket: false, ml: false });
    const router = useRouter();

    // Auth Protection
    useEffect(() => {
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
    }, [router]);

    // Socket Connection
    useEffect(() => {
        if (authLoading) return;

        socket = io('http://localhost:4000');

        socket.on('connect', () => {
            setSystemStatus(prev => ({ ...prev, socket: true }));
        });

        socket.on('disconnect', () => {
            setSystemStatus(prev => ({ ...prev, socket: false }));
        });

        socket.emit('request_buses');

        socket.on('bus_update', (data) => {
            setBuses(data);
        });

        socket.on('geofence_alert', (alert) => {
            setAlerts(prev => [alert, ...prev].slice(0, 20));
        });

        // Check ML API
        fetch('http://localhost:8000/')
            .then(res => res.json())
            .then(() => setSystemStatus(prev => ({ ...prev, ml: true })))
            .catch(() => setSystemStatus(prev => ({ ...prev, ml: false })));

        return () => {
            socket.disconnect();
        };
    }, [authLoading]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/login');
    };

    if (authLoading) {
        return (
            <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <h2>Loading Admin Panel...</h2>
            </div>
        );
    }

    // Stats Calculation
    const activeBuses = buses.filter(b => b.speed > 0).length;
    const idleBuses = buses.filter(b => b.speed === 0).length;
    const avgSpeed = buses.length > 0 ? (buses.reduce((sum, b) => sum + b.speed, 0) / buses.length).toFixed(1) : 0;
    const routePath = HYD_STOPS.map(s => [s.lat, s.lon]);

    return (
        <main style={{ padding: '30px 40px', maxWidth: 1600, margin: '0 auto' }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
                <div>
                    <h1 style={{ marginBottom: 5 }}>🛠️ Admin Control Center</h1>
                    <p style={{ color: '#888', fontSize: 14 }}>
                        Logged in as: <span style={{ color: 'var(--accent-primary)' }}>{user?.email}</span>
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 15, alignItems: 'center' }}>
                    {/* System Status Indicators */}
                    <div style={{ display: 'flex', gap: 10 }}>
                        <span style={{
                            padding: '6px 12px',
                            borderRadius: 20,
                            background: systemStatus.socket ? 'rgba(0,255,136,0.1)' : 'rgba(255,0,0,0.1)',
                            border: `1px solid ${systemStatus.socket ? '#00ff88' : '#ff4444'}`,
                            color: systemStatus.socket ? '#00ff88' : '#ff4444',
                            fontSize: 12
                        }}>
                            {systemStatus.socket ? '🟢' : '🔴'} Socket
                        </span>
                        <span style={{
                            padding: '6px 12px',
                            borderRadius: 20,
                            background: systemStatus.ml ? 'rgba(0,255,136,0.1)' : 'rgba(255,0,0,0.1)',
                            border: `1px solid ${systemStatus.ml ? '#00ff88' : '#ff4444'}`,
                            color: systemStatus.ml ? '#00ff88' : '#ff4444',
                            fontSize: 12
                        }}>
                            {systemStatus.ml ? '🟢' : '🔴'} ML API
                        </span>
                    </div>
                    <button className="primary-btn" style={{ background: '#333', padding: '8px 16px' }} onClick={handleLogout}>
                        Sign Out
                    </button>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 25 }}>
                {['overview', 'fleet', 'alerts', 'routes'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        style={{
                            padding: '10px 20px',
                            background: activeTab === tab ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)',
                            border: activeTab === tab ? 'none' : '1px solid rgba(255,255,255,0.1)',
                            color: activeTab === tab ? 'white' : '#aaa',
                            borderRadius: 8,
                            cursor: 'pointer',
                            textTransform: 'capitalize',
                            fontWeight: activeTab === tab ? 'bold' : 'normal',
                            transition: 'all 0.3s ease'
                        }}
                    >
                        {tab === 'overview' && '📊 '}
                        {tab === 'fleet' && '🚌 '}
                        {tab === 'alerts' && '🔔 '}
                        {tab === 'routes' && '🗺️ '}
                        {tab}
                    </button>
                ))}
            </div>

            {/* Overview Tab */}
            {activeTab === 'overview' && (
                <>
                    {/* Stats Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 30 }}>
                        <div className="stat-card" style={{ borderLeftColor: 'var(--accent-primary)' }}>
                            <div style={{ fontSize: 12, color: '#888', marginBottom: 5 }}>TOTAL FLEET</div>
                            <div style={{ fontSize: 32, fontWeight: 'bold', color: 'var(--accent-primary)' }}>{buses.length}</div>
                            <div style={{ fontSize: 11, color: '#666' }}>Buses Online</div>
                        </div>
                        <div className="stat-card" style={{ borderLeftColor: 'var(--accent-success)' }}>
                            <div style={{ fontSize: 12, color: '#888', marginBottom: 5 }}>ACTIVE</div>
                            <div style={{ fontSize: 32, fontWeight: 'bold', color: 'var(--accent-success)' }}>{activeBuses}</div>
                            <div style={{ fontSize: 11, color: '#666' }}>Currently Moving</div>
                        </div>
                        <div className="stat-card" style={{ borderLeftColor: 'var(--accent-warning)' }}>
                            <div style={{ fontSize: 12, color: '#888', marginBottom: 5 }}>IDLE</div>
                            <div style={{ fontSize: 32, fontWeight: 'bold', color: 'var(--accent-warning)' }}>{idleBuses}</div>
                            <div style={{ fontSize: 11, color: '#666' }}>Stationary</div>
                        </div>
                        <div className="stat-card" style={{ borderLeftColor: 'var(--accent-tertiary)' }}>
                            <div style={{ fontSize: 12, color: '#888', marginBottom: 5 }}>AVG SPEED</div>
                            <div style={{ fontSize: 32, fontWeight: 'bold', color: 'var(--accent-tertiary)' }}>{avgSpeed}</div>
                            <div style={{ fontSize: 11, color: '#666' }}>km/h Fleet Average</div>
                        </div>
                    </div>

                    {/* Map + Recent Activity */}
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
                        <div className="glass-panel" style={{ height: 450, padding: 0, overflow: 'hidden' }}>
                            <LeafletMap
                                stops={HYD_STOPS}
                                buses={buses}
                                selectedStop={null}
                                routePath={routePath}
                            />
                        </div>
                        <div className="glass-panel" style={{ maxHeight: 450, overflowY: 'auto' }}>
                            <h3 style={{ marginBottom: 15 }}>📢 Recent Activity</h3>
                            {alerts.length === 0 && <p style={{ color: '#666' }}>No recent alerts</p>}
                            {alerts.slice(0, 8).map((alert, i) => (
                                <div key={i} style={{
                                    padding: 12,
                                    marginBottom: 10,
                                    borderRadius: 8,
                                    background: 'rgba(255,165,0,0.08)',
                                    borderLeft: '3px solid orange'
                                }}>
                                    <div style={{ fontWeight: 'bold', color: 'orange', fontSize: 13 }}>🚌 {alert.busId}</div>
                                    <div style={{ fontSize: 12, color: '#ccc' }}>{alert.message}</div>
                                    <div style={{ fontSize: 10, color: '#666', marginTop: 4 }}>
                                        {new Date(alert.timestamp).toLocaleTimeString()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}

            {/* Fleet Tab */}
            {activeTab === 'fleet' && (
                <div className="glass-panel">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <h2>🚌 Fleet Management</h2>
                        <span style={{ color: '#888', fontSize: 14 }}>{buses.length} buses registered</span>
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ textAlign: 'left', color: '#888', fontSize: 13, borderBottom: '1px solid #333' }}>
                                <th style={{ padding: '12px 0' }}>Bus ID</th>
                                <th>Route</th>
                                <th>Status</th>
                                <th>Speed</th>
                                <th>Occupancy</th>
                                <th>Last Update</th>
                                <th>Location</th>
                            </tr>
                        </thead>
                        <tbody>
                            {buses.map(bus => (
                                <tr key={bus.id} style={{ borderBottom: '1px solid #222' }}>
                                    <td style={{ padding: '15px 0' }}>
                                        <span style={{ fontWeight: 'bold', color: 'white' }}>{bus.busId}</span>
                                    </td>
                                    <td>
                                        <span style={{
                                            padding: '4px 10px',
                                            background: 'rgba(255,107,53,0.1)',
                                            borderRadius: 4,
                                            fontSize: 12,
                                            color: 'var(--accent-primary)'
                                        }}>
                                            {bus.routeId}
                                        </span>
                                    </td>
                                    <td>
                                        <span style={{
                                            padding: '4px 10px',
                                            borderRadius: 20,
                                            fontSize: 11,
                                            background: bus.speed > 0 ? 'rgba(0,255,136,0.1)' : 'rgba(255,200,0,0.1)',
                                            color: bus.speed > 0 ? '#00ff88' : '#ffc800'
                                        }}>
                                            {bus.speed > 0 ? '● Moving' : '○ Idle'}
                                        </span>
                                    </td>
                                    <td style={{ color: bus.speed > 0 ? '#00ff88' : '#666', fontWeight: 'bold' }}>
                                        {bus.speed.toFixed(1)} km/h
                                    </td>
                                    <td>
                                        <span style={{
                                            color: bus.occupancy === 'High' ? '#ff4444' : bus.occupancy === 'Medium' ? '#ffc800' : '#00ff88'
                                        }}>
                                            {bus.occupancy === 'High' ? '🔴' : bus.occupancy === 'Medium' ? '🟡' : '🟢'} {bus.occupancy || 'Low'}
                                        </span>
                                    </td>
                                    <td style={{ fontSize: 12, color: '#888' }}>
                                        {bus.lastUpdate ? new Date(bus.lastUpdate).toLocaleTimeString() : 'N/A'}
                                    </td>
                                    <td style={{ fontSize: 11, fontFamily: 'monospace', color: '#666' }}>
                                        {bus.lat.toFixed(4)}, {bus.lon.toFixed(4)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {buses.length === 0 && (
                        <div style={{ textAlign: 'center', padding: 40, color: '#666' }}>
                            <div style={{ fontSize: 48, marginBottom: 10 }}>🚌</div>
                            <p>No buses are currently online.</p>
                            <p style={{ fontSize: 12 }}>Start the Driver App to see buses here.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Alerts Tab */}
            {activeTab === 'alerts' && (
                <div className="glass-panel">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <h2>🔔 Alert History</h2>
                        <button
                            onClick={() => setAlerts([])}
                            style={{
                                padding: '8px 16px',
                                background: 'rgba(255,0,0,0.1)',
                                border: '1px solid #ff4444',
                                color: '#ff4444',
                                borderRadius: 6,
                                cursor: 'pointer'
                            }}
                        >
                            Clear All
                        </button>
                    </div>
                    {alerts.length === 0 && (
                        <div style={{ textAlign: 'center', padding: 40, color: '#666' }}>
                            <div style={{ fontSize: 48, marginBottom: 10 }}>🔔</div>
                            <p>No alerts recorded yet.</p>
                            <p style={{ fontSize: 12 }}>Alerts appear when buses enter geofenced areas.</p>
                        </div>
                    )}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 15 }}>
                        {alerts.map((alert, i) => (
                            <div key={i} style={{
                                padding: 15,
                                borderRadius: 10,
                                background: 'rgba(255,165,0,0.08)',
                                borderLeft: '4px solid orange'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontWeight: 'bold', color: 'orange' }}>🚌 {alert.busId}</span>
                                    <span style={{ fontSize: 11, color: '#666' }}>
                                        {new Date(alert.timestamp).toLocaleString()}
                                    </span>
                                </div>
                                <div style={{ marginTop: 8, color: '#ddd' }}>{alert.message}</div>
                                <div style={{ marginTop: 8 }}>
                                    <span style={{
                                        fontSize: 11,
                                        padding: '3px 8px',
                                        background: 'rgba(0,255,136,0.1)',
                                        color: '#00ff88',
                                        borderRadius: 4
                                    }}>
                                        {alert.type || 'arrival'}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Routes Tab */}
            {activeTab === 'routes' && (
                <div className="glass-panel">
                    <h2 style={{ marginBottom: 20 }}>🗺️ Route Configuration</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
                        {ROUTES.map(route => (
                            <div key={route.id} style={{
                                padding: 20,
                                borderRadius: 12,
                                background: 'rgba(0,0,0,0.3)',
                                border: `2px solid ${route.color}40`,
                                borderLeft: `4px solid ${route.color}`
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <h3 style={{ color: route.color, marginBottom: 5 }}>{route.name}</h3>
                                        <span style={{ fontSize: 12, color: '#888' }}>{route.id}</span>
                                    </div>
                                    <div style={{
                                        width: 12,
                                        height: 12,
                                        borderRadius: '50%',
                                        background: route.color,
                                        boxShadow: `0 0 10px ${route.color}`
                                    }} />
                                </div>
                                <div style={{ marginTop: 15, display: 'flex', gap: 10 }}>
                                    <span style={{
                                        fontSize: 11,
                                        padding: '4px 10px',
                                        background: 'rgba(255,255,255,0.05)',
                                        borderRadius: 4,
                                        color: '#aaa'
                                    }}>
                                        {buses.filter(b => b.routeId === route.id).length} Active Buses
                                    </span>
                                    <span style={{
                                        fontSize: 11,
                                        padding: '4px 10px',
                                        background: 'rgba(0,255,136,0.1)',
                                        borderRadius: 4,
                                        color: '#00ff88'
                                    }}>
                                        ● Operational
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <h3 style={{ marginTop: 30, marginBottom: 15 }}>📍 Registered Stops</h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                        {HYD_STOPS.map(stop => (
                            <span key={stop.name} style={{
                                padding: '8px 15px',
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: 20,
                                fontSize: 13,
                                color: '#ccc'
                            }}>
                                📍 {stop.name}
                            </span>
                        ))}
                    </div>
                </div>
            )}

        </main>
    );
}

"use client";
import { useState, useEffect } from 'react';
import io from 'socket.io-client';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

// Dynamic Import for Map (Client Side Only)
const LeafletMap = dynamic(() => import('../components/LeafletMap'), {
  ssr: false,
  loading: () => <div style={{ height: '100%', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888' }}>Loading Map...</div>
});

// --- Configuration ---
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

const TRANSLATIONS = {
  en: {
    title: "Hyderabad Metro Bus",
    selectStop: "Select Bus Stop",
    subtitle: "Choose your waiting point to see live ETAs.",
    liveArrivals: "Live Arrivals",
    to: "To",
    kmAway: "km away",
    min: "min",
    noBuses: "No active buses found."
  },
  te: {
    title: "హైదరాబాద్ మెట్రో బస్సు",
    selectStop: "బస్సు స్టాప్‌ను ఎంచుకోండి",
    subtitle: "లైవ్ రాక సమయాలను చూడటానికి మీ స్టాప్‌ను ఎంచుకోండి.",
    liveArrivals: "లైవ్ రాకలు",
    to: "కి",
    kmAway: "కి.మీ దూరంలో",
    min: "నిమిషాలు",
    noBuses: "యాక్టివ్ బస్సులు ఏవీ కనిపించలేదు."
  }
};

let socket;

export default function PassengerDashboard() {
  const [buses, setBuses] = useState([]);
  const [selectedStop, setSelectedStop] = useState(HYD_STOPS[0]);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [announcedBuses, setAnnouncedBuses] = useState(new Set());
  const [lang, setLang] = useState('en');
  const t = TRANSLATIONS[lang];
  const router = useRouter();

  // Notification Permission
  useEffect(() => {
    if ("Notification" in window) {
      Notification.requestPermission();
    }
  }, []);

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
    if (!authLoading) {
      socket = io('http://localhost:4000');
      socket.on('connect', () => console.log('Connected to Tracking Server'));

      socket.on('bus_update', (data) => {
        setBuses(data);
        handleAlerts(data);
      });

      return () => socket.disconnect();
    }
  }, [authLoading, selectedStop]);

  // Voice & Notification Logic
  const handleAlerts = (activeBuses) => {
    activeBuses.forEach(bus => {
      const dist = getDistance(selectedStop.lat, selectedStop.lon, bus.lat, bus.lon);
      if (dist <= 0.5 && !announcedBuses.has(`${bus.busId}-${selectedStop.name}`)) {
        const msg = `Bus ${bus.busId} is arriving at ${selectedStop.name} now.`;
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(msg);
          utterance.rate = 0.9;
          window.speechSynthesis.speak(utterance);
        }
        if (Notification.permission === "granted") {
          new Notification("Bus Arriving!", { body: msg });
        }
        setAnnouncedBuses(prev => new Set(prev).add(`${bus.busId}-${selectedStop.name}`));
      }
    });
  };

  const triggerSOS = () => {
    if (confirm("🚨 EMERGENCY: Send SOS signal?")) {
      socket.emit('panic_signal', {
        userId: user?.email,
        location: selectedStop.name,
        timestamp: Date.now()
      });
      alert("SOS Sent!");
    }
  };

  // ML Prediction Hook
  const [smartDelays, setSmartDelays] = useState({});

  useEffect(() => {
    if (buses.length > 0 && selectedStop) {
      buses.forEach(async (bus) => {
        try {
          const now = new Date();
          const timeStr = `${now.getHours()}:${now.getMinutes()}`;
          const mlBusId = "BUS_01";

          const res = await fetch('http://localhost:8000/predict', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              bus_id: mlBusId,
              stop_name: selectedStop.name,
              scheduled_time: timeStr
            })
          });
          const data = await res.json();
          setSmartDelays(prev => ({
            ...prev,
            [bus.busId]: {
              delay: data.predicted_delay_min,
              rating: data.rating
            }
          }));
        } catch (err) {
          // console.error("ML API Error:", err);
        }
      });
    }
  }, [buses, selectedStop]);


  const handleStopChange = (e) => {
    const stopName = e.target.value;
    const stop = HYD_STOPS.find(s => s.name === stopName);
    if (stop) setSelectedStop(stop);
  };

  // Helper: Haversine Distance (km)
  const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(2);
  };

  if (authLoading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <h2>Authenticating...</h2>
    </div>
  );

  // Prepare Route Path for Map
  const routePath = HYD_STOPS.map(s => [s.lat, s.lon]);

  return (
    <main style={{ padding: '40px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
        <h1>🚌 {t.title}</h1>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className="primary-btn"
            style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid #444' }}
            onClick={() => setLang(lang === 'en' ? 'te' : 'en')}
          >
            {lang === 'en' ? 'తెలుగు' : 'English'}
          </button>
          <button
            className="primary-btn"
            style={{ background: '#ff1155', border: '1px solid #ff1155', color: 'white' }}
            onClick={triggerSOS}
          >
            🚨 SOS
          </button>
          <button className="primary-btn" style={{ background: '#333', padding: '8px 16px', fontSize: 14 }} onClick={async () => {
            await supabase.auth.signOut();
            router.push('/login');
          }}>Sign Out</button>
        </div>
      </div>

      <div className="grid-layout">

        {/* Map Section (Leaflet) */}
        <div className="glass-panel map-container" style={{ height: 500, overflow: 'hidden', padding: 0 }}>
          <LeafletMap
            key="passenger-map"
            stops={HYD_STOPS}
            buses={buses}
            selectedStop={selectedStop}
            routePath={routePath}
          />
        </div>

        {/* Info Panel */}
        <div className="glass-panel">

          <h3>📍 {t.selectStop}</h3>
          <p style={{ fontSize: 14, color: '#aaa', marginBottom: 15 }}>
            {t.subtitle}
          </p>

          <select value={selectedStop.name} onChange={handleStopChange} style={{ fontSize: 16 }}>
            {HYD_STOPS.map(s => (
              <option key={s.name} value={s.name}>{s.name}</option>
            ))}
          </select>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.05)', padding: 15, borderRadius: 12, marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 24 }}>🌤️</span>
              <div>
                <div style={{ fontWeight: 'bold', color: 'white' }}>Hyderabad</div>
                <div style={{ fontSize: 12, color: '#aaa' }}>Partly Cloudy</div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 20, color: 'var(--accent-secondary)', fontWeight: 'bold' }}>28°C</div>
              <div style={{ fontSize: 10, color: '#888' }}>H: 32° L: 24°</div>
            </div>
          </div>

          <hr style={{ borderColor: 'var(--border-color)', margin: '25px 0' }} />

          <h2>{t.liveArrivals}</h2>
          <div style={{ color: '#888', marginBottom: 15 }}>
            {t.to}: <span style={{ color: 'var(--neon-red)', fontWeight: 'bold' }}>{selectedStop.name}</span>
          </div>

          {buses.length === 0 && <p style={{ color: '#666', fontStyle: 'italic' }}>{t.noBuses}</p>}

          {buses.map(bus => {
            const dist = getDistance(selectedStop.lat, selectedStop.lon, bus.lat, bus.lon);
            const speed = Math.max(bus.speed, 25);
            const mlInfo = smartDelays[bus.busId] || { delay: 0, rating: 5 };
            const mlDelay = typeof mlInfo === 'object' ? mlInfo.delay : mlInfo;
            const rating = mlInfo.rating || 5;

            const baseEta = (dist / speed) * 60;
            const finalEta = Math.max(0, baseEta + mlDelay || 0);

            return (
              <div key={bus.busId} className="stat-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <strong style={{ fontSize: 18, color: 'white' }}>{bus.busId}</strong>
                    <span style={{ fontSize: 12, color: '#fbbf24', marginTop: 2 }}>
                      {'★'.repeat(Math.round(rating))}
                      {'☆'.repeat(5 - Math.round(rating))}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span className="badge" style={{
                      borderColor: bus.occupancy === 'High' ? 'var(--accent-danger)' : bus.occupancy === 'Medium' ? 'var(--accent-warning)' : 'var(--accent-success)',
                      color: bus.occupancy === 'High' ? 'var(--accent-danger)' : bus.occupancy === 'Medium' ? 'var(--accent-warning)' : 'var(--accent-success)',
                      background: 'transparent'
                    }}>
                      {bus.occupancy === 'Low' ? '🟢' : bus.occupancy === 'Medium' ? '🟡' : '🔴'} {bus.occupancy || 'Low'}
                    </span>

                    <div style={{ textAlign: 'right' }}>
                      <span style={{ color: 'var(--neon-green)', fontWeight: 'bold', fontSize: 20, display: 'block' }}>
                        {Math.round(finalEta)} <span style={{ fontSize: 12 }}>{t.min}</span>
                      </span>
                      {mlDelay !== 0 && (
                        <span style={{ fontSize: 10, color: mlDelay > 0 ? '#ff4444' : '#00ff88' }}>
                          {mlDelay > 0 ? `+${Math.round(mlDelay)}m Traffic` : `${Math.round(mlDelay)}m Early`} (AI)
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ height: 6, background: '#333', borderRadius: 3, marginTop: 10, overflow: 'hidden' }}>
                  <div style={{ width: `${Math.max(0, 100 - (dist * 5))}%`, background: 'var(--neon-green)', height: '100%', transition: 'width 1s' }}></div>
                </div>

                <div style={{ fontSize: 13, marginTop: 10, color: '#bbb', display: 'flex', justifyContent: 'space-between' }}>
                  <span>📍 {dist} {t.kmAway}</span>
                  <span>🚀 {bus.speed ? Math.round(bus.speed) : 0} km/h</span>
                </div>
              </div>
            )
          })}
        </div>

      </div>
    </main>
  );
}

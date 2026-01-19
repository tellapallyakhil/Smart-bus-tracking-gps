"use client";
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [role, setRole] = useState('user'); // user, driver, admin
    const router = useRouter();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;

            // Login Success
            localStorage.setItem('user_role', role);

            // Navigate based on role
            if (role === 'admin') {
                router.push('/admin');
            } else if (role === 'driver') {
                router.push('/driver');
            } else {
                router.push('/');
            }

        } catch (error) {
            alert(error.message || "Login failed");
        } finally {
            setLoading(false);
        }
    };

    const handleSignUp = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
            });

            if (error) throw error;

            if (data?.session) {
                // Auto-login if email confirmation is disabled on Supabase
                localStorage.setItem('user_role', role);
                if (role === 'admin') router.push('/admin');
                else if (role === 'driver') router.push('/driver');
                else router.push('/');
            } else {
                // Email confirmation required
                alert("Registration Successful! \n\nPlease check your email (including spam) to confirm your account before logging in.");
            }
        } catch (error) {
            alert(error.message || "Registration failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <main style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
            <div className="glass-panel" style={{ width: 400, textAlign: 'center' }}>
                <h1>🔐 System Login</h1>

                <div style={{ margin: '20px 0', textAlign: 'left' }}>
                    <label style={{ display: 'block', marginBottom: 5 }}>Select Role</label>
                    <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                        {['user', 'driver', 'admin'].map(r => (
                            <div
                                key={r}
                                onClick={() => setRole(r)}
                                style={{
                                    padding: '8px 16px',
                                    background: role === r ? '#0070f3' : 'rgba(255,255,255,0.1)',
                                    borderRadius: 6,
                                    cursor: 'pointer',
                                    textTransform: 'capitalize'
                                }}
                            >
                                {r}
                            </div>
                        ))}
                    </div>

                    <label style={{ display: 'block', marginBottom: 5 }}>Email</label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="user@example.com" />

                    <label style={{ display: 'block', marginBottom: 5, marginTop: 10 }}>Password</label>
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
                </div>

                <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                    <button className="primary-btn" onClick={handleLogin} disabled={loading} style={{ flex: 1 }}>
                        {loading ? 'Processing...' : 'Login'}
                    </button>
                    <button className="primary-btn" onClick={handleSignUp} disabled={loading} style={{ flex: 1, background: '#333' }}>
                        Register
                    </button>
                </div>

                <div style={{ marginTop: 20, fontSize: 11, color: '#666', borderTop: '1px solid #333', paddingTop: 10 }}>
                    {role === 'admin' ? (
                        <span>💡 Demo Admin: Use your own email, system will auto-grant based on role selection for this demo.</span>
                    ) : (
                        <span>Select your role above before registering.</span>
                    )}
                </div>
            </div>
        </main>
    );
}

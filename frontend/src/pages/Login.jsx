import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../services/auth.service';
import Button from '../components/Button'; 
import Input from '../components/Input';   
import '../styles/Auth.css';               

export default function Login() {
    const navigate = useNavigate();
    
    const [username, setUsername] = useState(''); 
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await authService.signIn({ username, password });
            navigate('/dashboard'); 
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.message || 'Login gagal. Cek username/password.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <h1 className="auth-title">Welcome back</h1>
            
            {error && (
                <div style={{ 
                    backgroundColor: '#fee2e2', 
                    color: '#dc2626', 
                    padding: '10px', 
                    borderRadius: '6px',
                    marginBottom: '1rem', 
                    textAlign: 'center', 
                    fontSize: '0.9rem' 
                }}>
                    {error}
                </div>
            )}

            <form className="auth-form" onSubmit={handleLogin}>
                <Input
                    id="username"
                    label="Username" 
                    type="text"
                    placeholder="Contoh: parlan"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                />
                
                <Input
                    id="password"
                    label="Password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />
                
                <Button type="submit" className="btn-full" disabled={loading}>
                    {loading ? 'Sedang Masuk...' : 'Sign In'}
                </Button>
            </form>

            <div className="divider">
                <span>or</span>
            </div>

            <div className="auth-footer">
                Belum punya akun? <Link to="/signup">Daftar dulu</Link>
            </div>
        </div>
    );
}
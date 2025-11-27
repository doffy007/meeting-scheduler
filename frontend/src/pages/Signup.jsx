import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../services/auth.service';
import Button from '../components/Button'; 
import Input from '../components/Input';   
import '../styles/Auth.css';               

export default function Register() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        name: "",
        username: "",
        password: "",
        email: "",
        bio: "",
        gender: "male",
        country_code: "+62",
        phone_number: "",
        location: "",
        nationality: "Indonesian",
        national_id_number: "", 
        language: "id",
        birthdate: "",
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        
        setFormData(prev => ({
            ...prev,
            [name]: value === undefined ? "" : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await authService.register(formData);
            alert("Registrasi Berhasil! Silakan Login.");
            navigate("/login");
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.message || "Gagal register. Cek input kembali.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container wide">
            <h1 className="auth-title">Create Account</h1>
            
            {error && (
                <div style={{ 
                    backgroundColor: '#fee2e2', color: '#dc2626', padding: '10px', 
                    borderRadius: '6px', marginBottom: '1rem', textAlign: 'center', fontSize: '0.9rem'
                }}>
                    {error}
                </div>
            )}

            <form className="auth-form" onSubmit={handleSubmit}>
                
                {/* --- SECTION 1: ACCOUNT INFO --- */}
                <h3 className="form-section-title">Account Info</h3>
                <div className="form-row">
                    <Input
                        label="Username"
                        name="username"
                        placeholder="username"
                        value={formData.username ?? ""}
                        onChange={handleChange}
                        required
                    />
                    <Input
                        label="Email"
                        name="email"
                        type="email"
                        placeholder="email@example.com"
                        value={formData.email ?? ""}
                        onChange={handleChange}
                        required
                    />
                </div>

                <div className="form-row">
                    <Input
                        label="Password"
                        name="password"
                        type="password"
                        placeholder="••••••••"
                        value={formData.password ?? ""}
                        onChange={handleChange}
                        required
                    />
                </div>

                {/* --- SECTION 2: PERSONAL INFO --- */}
                <h3 className="form-section-title">Personal Info</h3>
                <div className="form-row">
                    <Input
                        label="Full Name"
                        name="name"
                        placeholder="John Doe"
                        value={formData.name ?? ""}
                        onChange={handleChange}
                        required
                    />
                    <div className="form-group">
                        <label>Gender</label>
                        <select 
                            className="form-select" 
                            name="gender" 
                            value={formData.gender ?? "male"} 
                            onChange={handleChange}
                        >
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                        </select>
                    </div>
                </div>

                <div className="form-row">
                    <Input
                        label="Birthdate"
                        name="birthdate"
                        type="date"
                        value={formData.birthdate ?? ""}
                        onChange={handleChange}
                        required
                    />                  
                </div>
                
                <div className="form-row">
                     <Input
                        label="Nationality"
                        name="nationality"
                        value={formData.nationality ?? ""}
                        onChange={handleChange}
                    />
                     <Input
                        label="Language"
                        name="language"
                        placeholder="id / en"
                        value={formData.language ?? ""}
                        onChange={handleChange}
                    />
                </div>

                <h3 className="form-section-title">Contact & Location</h3>
                <div className="form-row">
                    <div style={{ flex: '0 0 80px' }}> 
                        <Input
                            label="Code"
                            name="country_code"
                            value={formData.country_code ?? ""}
                            onChange={handleChange}
                        />
                    </div>
                    <div style={{ flex: 1 }}>
                        <Input
                            label="Phone Number"
                            name="phone_number"
                            placeholder="8123456789"
                            value={formData.phone_number ?? ""}
                            onChange={handleChange}
                        />
                    </div>
                </div>

                <Input
                    label="Location (City)"
                    name="location"
                    placeholder="Jakarta, Indonesia"
                    value={formData.location ?? ""}
                    onChange={handleChange}
                />

                <div className="form-group">
                    <label>Short Bio</label>
                    <textarea
                        className="form-select"
                        style={{ height: '80px', resize: 'vertical', fontFamily: 'inherit' }}
                        name="bio"
                        placeholder="Tell us a bit about yourself..."
                        value={formData.bio ?? ""}
                        onChange={handleChange}
                    />
                </div>
                
                <Button type="submit" className="btn-full" disabled={loading}>
                    {loading ? 'Creating Account...' : 'Register'}
                </Button>
            </form>

            <div className="auth-footer">
                Sudah punya akun? <Link to="/login">Login disini</Link>
            </div>
        </div>
    );
}
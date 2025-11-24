import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import Input from '../components/Input';
import '../styles/Auth.css'; 

export default function Onboarding() {
    const navigate = useNavigate();
    const [fullName, setFullName] = useState('');
    const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
    const [startTime, setStartTime] = useState('09:00');
    const [endTime, setEndTime] = useState('17:00');

    const handleOnboarding = (e) => {
        e.preventDefault();
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const updatedUser = { ...user, fullName, timezone, workingHours: { start: startTime, end: endTime } };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        navigate('/dashboard/bookings');
    };

    return (
        <div className="auth-container">
            <h1 className="auth-title">Welcome to Cal Clone</h1>
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '2rem' }}>
                We just need a few details to get you started.
            </p>
            <form className="auth-form" onSubmit={handleOnboarding}>
                <Input
                    id="fullName"
                    label="Full Name"
                    type="text"
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                />

                <div className="input-group">
                    <label htmlFor="timezone" className="input-label">Timezone</label>
                    <select
                        id="timezone"
                        className="input-field"
                        value={timezone}
                        onChange={(e) => setTimezone(e.target.value)}
                    >
                        <option value="UTC">UTC</option>
                        <option value="America/New_York">America/New_York</option>
                        <option value="Europe/London">Europe/London</option>
                        <option value="Asia/Tokyo">Asia/Tokyo</option>
                    </select>
                </div>

                <div className="input-group">
                    <label className="input-label">Working Hours</label>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <input
                            type="time"
                            className="input-field"
                            value={startTime}
                            onChange={(e) => setStartTime(e.target.value)}
                        />
                        <span>-</span>
                        <input
                            type="time"
                            className="input-field"
                            value={endTime}
                            onChange={(e) => setEndTime(e.target.value)}
                        />
                    </div>
                </div>

                <Button type="submit" className="btn-full">Finish Setup</Button>
            </form>
        </div>
    );
}

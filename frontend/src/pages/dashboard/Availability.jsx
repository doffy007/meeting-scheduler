import { useState } from 'react';
import { Plus, Trash2, Clock, Calendar } from 'lucide-react';
import Button from '../../components/Button';
import '../../styles/Dashboard.css';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function Availability() {
    const [schedule, setSchedule] = useState(
        DAYS.map(day => ({
            day,
            enabled: ['Saturday', 'Sunday'].includes(day) ? false : true,
            slots: [{ start: '09:00', end: '17:00' }]
        }))
    );

    const toggleDay = (index) => {
        const newSchedule = [...schedule];
        newSchedule[index].enabled = !newSchedule[index].enabled;
        setSchedule(newSchedule);
    };

    const updateSlot = (dayIndex, slotIndex, field, value) => {
        const newSchedule = [...schedule];
        newSchedule[dayIndex].slots[slotIndex][field] = value;
        setSchedule(newSchedule);
    };

    const addSlot = (dayIndex) => {
        const newSchedule = [...schedule];
        newSchedule[dayIndex].slots.push({ start: '09:00', end: '17:00' });
        setSchedule(newSchedule);
    };

    const removeSlot = (dayIndex, slotIndex) => {
        const newSchedule = [...schedule];
        newSchedule[dayIndex].slots.splice(slotIndex, 1);
        setSchedule(newSchedule);
    };

    return (
        <div className="dashboard-page">
            <header className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <Calendar size={28} style={{ color: '#2563eb' }} />
                    <h1>Availability</h1>
                </div>
                <p style={{ color: '#64748b', fontSize: '1rem' }}>Configure when you can be booked</p>
            </header>

            <div className="availability-list">
                {schedule.map((day, dayIndex) => (
                    <div key={day.day} className="availability-day">
                        <div className="day-toggle">
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={day.enabled}
                                    onChange={() => toggleDay(dayIndex)}
                                    style={{ width: '1.25rem', height: '1.25rem', accentColor: '#2563eb' }}
                                />
                                <span style={{
                                    fontWeight: 500,
                                    color: day.enabled ? '#1e293b' : '#94a3b8',
                                    fontSize: '0.95rem'
                                }}>
                                    {day.day}
                                </span>
                            </label>
                        </div>

                        <div className="day-slots">
                            {!day.enabled ? (
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    color: '#94a3b8',
                                    fontStyle: 'italic',
                                    fontSize: '0.875rem'
                                }}>
                                    <Clock size={16} />
                                    <span>Unavailable</span>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {day.slots.map((slot, slotIndex) => (
                                        <div key={slotIndex} className="time-slot">
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.75rem',
                                                background: '#f8fafc',
                                                padding: '0.75rem',
                                                borderRadius: '0.5rem',
                                                border: '1px solid #e2e8f0'
                                            }}>
                                                <Clock size={16} style={{ color: '#64748b' }} />
                                                <input
                                                    type="time"
                                                    value={slot.start}
                                                    onChange={(e) => updateSlot(dayIndex, slotIndex, 'start', e.target.value)}
                                                />
                                                <span style={{ color: '#64748b', fontWeight: '500' }}>to</span>
                                                <input
                                                    type="time"
                                                    value={slot.end}
                                                    onChange={(e) => updateSlot(dayIndex, slotIndex, 'end', e.target.value)}
                                                />
                                                {day.slots.length > 1 && (
                                                    <button
                                                        className="btn-ghost"
                                                        onClick={() => removeSlot(dayIndex, slotIndex)}
                                                        style={{
                                                            padding: '0.5rem',
                                                            borderRadius: '0.375rem',
                                                            color: '#ef4444',
                                                            transition: 'all 0.2s'
                                                        }}
                                                        title="Remove time slot"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    <button
                                        className="add-slot-btn"
                                        onClick={() => addSlot(dayIndex)}
                                    >
                                        <Plus size={16} />
                                        Add time slot
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <div style={{
                marginTop: 'var(--spacing-xl)',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '0.75rem'
            }}>
                <Button
                    variant="outline"
                    style={{
                        padding: '0.75rem 1.5rem',
                        borderRadius: '0.5rem',
                        fontWeight: '500'
                    }}
                >
                    Cancel
                </Button>
                <Button
                    onClick={() => alert('Availability Saved!')}
                    style={{
                        background: '#2563eb',
                        border: 'none',
                        padding: '0.75rem 1.5rem',
                        borderRadius: '0.5rem',
                        fontWeight: '500',
                        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                    }}
                >
                    Save Changes
                </Button>
            </div>
        </div>
    );
}

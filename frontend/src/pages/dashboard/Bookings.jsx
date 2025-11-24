import { useState } from 'react';
import { Calendar, Clock, User, XCircle } from 'lucide-react';
import Button from '../../components/Button';
import { MOCK_BOOKINGS } from '../../lib/mockData';
import '../../styles/Dashboard.css';

export function Bookings() {
    const [filter, setFilter] = useState('upcoming');
    const [bookings, setBookings] = useState(MOCK_BOOKINGS);

    const filteredBookings = bookings.filter(b => b.status === filter);

    const handleCancel = (id) => {
        if (confirm('Are you sure you want to cancel this booking?')) {
            setBookings(bookings.map(b => b.id === id ? { ...b, status: 'cancelled' } : b));
        }
    };

    return (
        <div className="dashboard-page">
            <header className="page-header">
                <h1>Bookings</h1>
                <div className="tabs">
                    <button
                        className={`tab ${filter === 'upcoming' ? 'active' : ''}`}
                        onClick={() => setFilter('upcoming')}
                    >
                        Upcoming
                    </button>
                    <button
                        className={`tab ${filter === 'past' ? 'active' : ''}`}
                        onClick={() => setFilter('past')}
                    >
                        Past
                    </button>
                    <button
                        className={`tab ${filter === 'cancelled' ? 'active' : ''}`}
                        onClick={() => setFilter('cancelled')}
                    >
                        Cancelled
                    </button>
                </div>
            </header>

            <div className="bookings-list">
                {filteredBookings.length === 0 ? (
                    <div className="empty-state">No {filter} bookings found.</div>
                ) : (
                    filteredBookings.map(booking => (
                        <div key={booking.id} className="booking-card">
                            <div className="booking-info">
                                <div className="booking-date">
                                    <Calendar size={16} />
                                    <span>{booking.date}</span>
                                    <span className="dot">•</span>
                                    <Clock size={16} />
                                    <span>{booking.time} ({booking.duration}m)</span>
                                </div>
                                <h3 className="booking-title">{booking.type} with {booking.guestName}</h3>
                                <div className="booking-meta">
                                    <User size={14} />
                                    <span>{booking.guestEmail}</span>
                                </div>
                            </div>
                            <div className="booking-actions">
                                {booking.status === 'upcoming' && (
                                    <Button variant="outline" size="sm" onClick={() => handleCancel(booking.id)}>
                                        Cancel
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

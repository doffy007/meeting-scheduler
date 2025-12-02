import { useEffect, useState } from "react";
import { Calendar, Clock, User, Loader } from "lucide-react";
import Button from "../../components/Button";
import { bookingService } from "../../services/booking.service";
import { organizerService } from "../../services/organizer.service";
import { authService } from "../../services/auth.service";
import "../../styles/Dashboard.css";

export function Bookings() {
    const [filter, setFilter] = useState("upcoming");
    const [bookings, setBookings] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [organizerId, setOrganizerId] = useState(null);

    const formatDate = (iso) =>
        new Intl.DateTimeFormat("en-US", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        }).format(new Date(iso));

    const formatTime = (iso) =>
        new Intl.DateTimeFormat("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
        }).format(new Date(iso));

    // Fetch organizer ID once on mount
    useEffect(() => {
        const fetchOrganizerId = async () => {
            try {
                const profile = await authService.getProfile();
                const userId = profile.id;

                const organizer = await organizerService.getOrganizerByUserId(userId);
                const orgId = organizer?.data?.id || organizer?.id;
                
                setOrganizerId(orgId);
            } catch (error) {
                console.error("Error loading organizer:", error);
            }
        };

        fetchOrganizerId();
    }, []);

    // Fetch bookings when filter or organizerId changes
    useEffect(() => {
        if (!organizerId) return;

        const fetchBookings = async () => {
            try {
                setLoading(true);

                let apiFilters = [];
                
                switch (filter) {
                    case "upcoming":
                        apiFilters = [
                            "ended_at:gte:now",
                            "status:neq:cancelled"
                        ];
                        break;
                    case "past":
                        apiFilters = [
                            "ended_at:lte:now",
                            "status:neq:cancelled"
                        ];
                        break;
                    case "cancelled":
                        apiFilters = [
                            "status:eq:cancelled"
                        ];
                        break;
                    default:
                        break;
                }

                const response = await bookingService.getListBooking(organizerId, {
                    page: { limit: 20, offset: 0 },
                    filter: apiFilters 
                });

                const list = response?.results || response?.data || [];
                const totalCount = response?.total || 0;

                const normalized = list.map((b) => ({
                    ...b,
                    dateFormatted: formatDate(b.start_time),
                    timeFormatted: `${formatTime(b.start_time)} - ${formatTime(b.end_time)}`,
                    duration: b.duration_minutes,
                    guestName: b.invitee_name,
                    guestEmail: b.invitee_email,
                }));

                setBookings(normalized);
                setTotal(totalCount);
            } catch (error) {
                console.error("Error loading bookings:", error);
                setBookings([]);
                setTotal(0);
            } finally {
                setLoading(false);
            }
        };

        fetchBookings();
    }, [filter, organizerId]);

    const handleCancel = async (id) => {
        if (!confirm("Are you sure you want to cancel this booking?")) return;

        try {
            await bookingService.cancelBooking(id);
            setBookings(prev => prev.filter(b => b.id !== id));
            setTotal(prev => Math.max(0, prev - 1));
            
        } catch (error) {
            console.error("Cancel failed:", error);
            alert("Failed to cancel booking. Please try again.");
        }
    };

    return (
        <div className="dashboard-page">
            <header className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <h1>Bookings</h1>
                    {total > 0 && (
                        <span className="count-badge">{total}</span>
                    )}
                </div>

                <div className="tabs">
                    <button
                        className={`tab ${filter === "upcoming" ? "active" : ""}`}
                        onClick={() => setFilter("upcoming")}
                    >
                        Upcoming
                    </button>
                    <button
                        className={`tab ${filter === "past" ? "active" : ""}`}
                        onClick={() => setFilter("past")}
                    >
                        Past
                    </button>
                    <button
                        className={`tab ${filter === "cancelled" ? "active" : ""}`}
                        onClick={() => setFilter("cancelled")}
                    >
                        Cancelled
                    </button>
                </div>
            </header>

            <div className="bookings-list">
                {loading ? (
                    <div className="empty-state">
                        <Loader className="animate-spin" size={32} style={{ margin: '0 auto' }} />
                        <p style={{ marginTop: '12px' }}>Loading bookings...</p>
                    </div>
                ) : bookings.length === 0 ? (
                    <div className="empty-state">
                        <Calendar size={48} style={{ opacity: 0.3, margin: '0 auto 12px' }} />
                        <p>No {filter} bookings found.</p>
                    </div>
                ) : (
                    bookings.map((booking) => (
                        <div key={booking.id} className="booking-card">
                            <div className="booking-info">
                                <div className="booking-date">
                                    <Calendar size={16} />
                                    <span>{booking.dateFormatted}</span>
                                    <span className="dot">•</span>
                                    <Clock size={16} />
                                    <span>
                                        {booking.timeFormatted} ({booking.duration}m)
                                    </span>
                                </div>

                                <h3 className="booking-title">
                                    Meeting with {booking.guestName}
                                </h3>

                                <div className="booking-meta">
                                    <User size={14} />
                                    <span>{booking.guestEmail}</span>
                                </div>

                                {booking.invitee_notes && (
                                    <div className="booking-notes">
                                        <p style={{ 
                                            fontSize: '0.875rem', 
                                            color: '#64748b',
                                            marginTop: '8px',
                                            fontStyle: 'italic'
                                        }}>
                                            Note: {booking.invitee_notes}
                                        </p>
                                    </div>
                                )}

                                <div className="booking-status">
                                    <span 
                                        className={`status-badge ${booking.status}`}
                                        style={{
                                            display: 'inline-block',
                                            padding: '4px 10px',
                                            borderRadius: '12px',
                                            fontSize: '0.75rem',
                                            fontWeight: '600',
                                            textTransform: 'capitalize',
                                            marginTop: '8px',
                                            background: booking.status === 'confirmed' 
                                                ? '#dcfce7' 
                                                : booking.status === 'cancelled' 
                                                ? '#fee2e2' 
                                                : '#f1f5f9',
                                            color: booking.status === 'confirmed' 
                                                ? '#16a34a' 
                                                : booking.status === 'cancelled' 
                                                ? '#dc2626' 
                                                : '#64748b'
                                        }}
                                    >
                                        {booking.status}
                                    </span>
                                </div>
                            </div>

                            <div className="booking-actions">
                                {filter === "upcoming" && booking.status !== "cancelled" && (
                                    <Button
                                        variant="outline"
                                        className="btn-cancel"
                                        size="sm"
                                        onClick={() => handleCancel(booking.id)}
                                    >
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
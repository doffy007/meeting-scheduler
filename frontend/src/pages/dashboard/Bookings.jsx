import { useEffect, useState } from "react";
import { Calendar, Clock, User } from "lucide-react";
import Button from "../../components/Button";
import { bookingService } from "../../services/booking.service";
import { organizerService } from "../../services/organizer.service";
import { authService } from "../../services/auth.service";
import "../../styles/Dashboard.css";

export function Bookings() {
    const [filter, setFilter] = useState("upcoming");
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);

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

    useEffect(() => {
        const fetchBookings = async () => {
            try {
                setLoading(true);

                const profile = await authService.getProfile();
                const userId = profile.id;

                const organizer = await organizerService.getOrganizerByUserId(userId);
                const organizerId = organizer.data.id;

                let apiFilters = [];
                
                switch (filter) {
                    case "upcoming":
                        apiFilters = ["ended_at:gt:now", "status:neq:cancelled"];
                        break;
                    case "past":
                        apiFilters = ["ended_at:lte:now"];
                        break;
                    case "cancelled":
                        apiFilters = ["status:eq:cancelled"];
                        break;
                    default:
                        break;
                }

                const res = await bookingService.getListBooking(organizerId, {
                    page: { limit: 20, offset: 0 },
                    filter: apiFilters 
                });

                const list = res.data || res;

                const normalized = list.map((b) => ({
                    ...b,
                    dateFormatted: formatDate(b.start_time),
                    timeFormatted: `${formatTime(b.start_time)} - ${formatTime(b.end_time)}`,
                    duration: b.duration_minutes,
                    guestName: b.invitee_name,
                    guestEmail: b.invitee_email,
                }));

                setBookings(normalized);
            } catch (error) {
                console.error("Error loading bookings:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchBookings();
    }, [filter]); 

    const handleCancel = async (id) => {
        if (!confirm("Are you sure you want to cancel this booking?")) return;

        try {
            await bookingService.cancelBooking(id);
            setBookings(prev => prev.filter(b => b.id !== id));
            
        } catch (error) {
            console.error("Cancel failed:", error);
        }
    };

    return (
        <div className="dashboard-page">
            <header className="page-header">
                <h1>Bookings</h1>

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
                     <div className="empty-state">Loading bookings...</div>
                ) : bookings.length === 0 ? (
                    <div className="empty-state">No {filter} bookings found.</div>
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
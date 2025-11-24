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

                console.log("Fetching bookings for organizer:", organizerId);

                const res = await bookingService.getListBooking(organizerId, {
                    page: { limit: 100, offset: 0 }
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
    }, []);

    const filteredBookings = bookings.filter((b) => {
        if (filter === "upcoming") return b.status === "confirmed";
        if (filter === "cancelled") return b.status === "cancelled";
        if (filter === "past")
            return new Date(b.end_time) < new Date() && b.status !== "cancelled";
        return true;
    });

    const handleCancel = async (id) => {
        if (!confirm("Are you sure you want to cancel this booking?")) return;

        try {
            await bookingService.cancelBooking(id);
            setBookings(prev =>
                prev.map(b =>
                    b.id === id ? { ...b, status: "cancelled" } : b
                )
            );
        } catch (error) {
            console.error("Cancel failed:", error);
        }
    };

    if (loading) {
        return <div className="empty-state">Loading bookings...</div>;
    }

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
                {filteredBookings.length === 0 ? (
                    <div className="empty-state">No {filter} bookings found.</div>
                ) : (
                    filteredBookings.map((booking) => (
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
                                {booking.status === "confirmed" && (
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

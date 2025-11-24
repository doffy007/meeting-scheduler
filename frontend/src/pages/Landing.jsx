import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, User, Clock, MapPin, ArrowRight, Loader, SearchX, Calendar, Sparkles, X } from 'lucide-react';
import { organizerService } from '../services/organizer.service';
import { bookingService } from '../services/booking.service'; 

import DateSelection from '../pages/booking/DateSelection'; 
import '../styles/Landing.css'; 

export default function Landing() {
    const [organizers, setOrganizers] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const [rescheduleModal, setRescheduleModal] = useState({ 
        open: false, 
        bookingId: null, 
        organizerId: null, 
        newDate: null 
    });
    
    const [loadingAction, setLoadingAction] = useState(false);

    const fetchData = async (filter = '') => {
        setLoading(true);
        try {
            const [orgData, bookingData] = await Promise.all([
                organizerService.getPublicOrganizers(filter),
                bookingService.getPublicBooking(filter)
            ]);

            setOrganizers(Array.isArray(orgData) ? orgData : (orgData.data || []));
            setBookings(Array.isArray(bookingData) ? bookingData : (bookingData.data || []));

        } catch (error) {
            console.error("Gagal mengambil data public", error);
            setOrganizers([]);
            setBookings([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSearch = (e) => {
        e.preventDefault();
        fetchData(searchTerm);
    };

    const handleClear = () => {
        setSearchTerm('');
        fetchData('');
    };

    const openReschedule = (bookingId, organizerId) => {
        setRescheduleModal({ 
            open: true, 
            bookingId, 
            organizerId, 
            newDate: null 
        });
    };

    const closeReschedule = () => {
        setRescheduleModal({ open: false, bookingId: null, organizerId: null, newDate: null });
    };

    const handleDateSelected = (dateObj) => {
        setRescheduleModal(prev => ({ ...prev, newDate: dateObj }));
    };

    const handleRescheduleConfirm = async () => {
        if (!rescheduleModal.bookingId || !rescheduleModal.newDate?.start) return;

        setLoadingAction(true);
        try {
            await bookingService.publicReschedulBookingDetail(rescheduleModal.bookingId, {
                new_start_time: rescheduleModal.newDate.start
            });

            closeReschedule();
            fetchData();
        } catch (err) {
            console.error("Failed to reschedule", err);
            alert("Gagal melakukan reschedule. Silakan coba lagi.");
        } finally {
            setLoadingAction(false);
        }
    };

    const handleCancel = async (bookingId) => {
        if (!window.confirm("Are you sure you want to cancel this booking?")) return;
        setLoadingAction(true);
        try {
            await bookingService.publicCancelBooking(bookingId);
            fetchData();
        } catch (err) {
            console.error("Failed to cancel booking", err);
        } finally {
            setLoadingAction(false);
        }
    };

    return (
        <div className="landing-page">
            <div className="container">
                <div className="directory-header">
                    <h1 className="page-title">Find someone or something to book</h1>
                    <p className="page-subtitle">
                        Search for public organizers and book a time slot easily.
                    </p>
                    <form onSubmit={handleSearch} style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                        <div style={{
                            display: 'flex', alignItems: 'center', backgroundColor: 'white',
                            border: '1px solid #e5e7eb', borderRadius: '100px', padding: '6px', 
                            boxShadow: '0 4px 15px rgba(0,0,0,0.05)', height: '60px',
                            width: '100%', maxWidth: '550px'
                        }}>
                            <Search size={20} color="#9ca3af" style={{ marginLeft: '16px', marginRight: '10px' }} />
                            <input 
                                type="text" placeholder="Search name or event..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                                style={{ flex: 1, border: 'none', outline: 'none', fontSize: '1rem', color: '#111', background: 'transparent' }}
                            />
                            {searchTerm && (
                                <button type="button" onClick={handleClear} style={{ background:'none', border:'none', cursor:'pointer', marginRight:'15px' }}>
                                    <SearchX size={20} color="#ef4444" />
                                </button>
                            )}
                        </div>
                    </form>
                </div>

                {loading ? (
                    <div className="loading-state"><Loader className="animate-spin" size={32} /><p style={{marginTop: '10px'}}>Searching...</p></div>
                ) : (
                    <>
                        <div className="section-wrapper">
                            <div className="section-title-row">
                                <h2><User size={24} className="icon-blue"/> Public Organizers</h2>
                                <span className="count-badge">{organizers.length}</span>
                            </div>
                            {organizers.length > 0 ? (
                                <div className="organizers-grid">
                                    {organizers.map((org) => (
                                        <div key={org.id} className="organizer-card">
                                            <div className="card-header">
                                                <div className="org-avatar"><User size={28} /></div>
                                                <div className="org-identity"><h3>{org.name || 'Organizer'}</h3><span className="org-email">{org.email}</span></div>
                                            </div>
                                            <div className="card-body">
                                                <div className="info-item"><Clock size={16} /><span>{org.meeting_duration_minutes || 30} mins</span></div>
                                                <div className="info-item"><MapPin size={16} /><span>{org.timezone || 'UTC'}</span></div>
                                            </div>
                                            <div className="card-footer">
                                                <Link to={`/public-organizer/${org.id}`} className="book-btn">Book Meeting <ArrowRight size={16} /></Link>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : <p className="empty-text">No organizers found.</p>}
                        </div>

                        <div className="section-divider"></div>

                        <div className="section-wrapper">
                            <div className="section-title-row">
                                <h2><Sparkles size={24} className="icon-purple"/> Available Bookings</h2>
                                <span className="count-badge">{bookings.length}</span>
                            </div>
                            {bookings.length > 0 ? (
                                <div className="organizers-grid">
                                    {bookings.map((event) => {
                                        const dateObj = new Date(event.start_time);
                                        const dateStr = dateObj.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
                                        const timeStr = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

                                        return (
                                            <div key={event.id} className="organizer-card event-card-style">
                                                <div className="card-header">
                                                    <div className="event-icon-bg"><Calendar size={24} /></div>
                                                    <div className="org-identity">
                                                        <h3>{event.invitee_notes || 'Session'}</h3>
                                                        <span className="hosted-by" style={{ fontSize: '0.85rem', color: '#6b7280' }}>{dateStr} • {timeStr}</span>
                                                    </div>
                                                </div>
                                                <div className="card-body">
                                                    <p className="event-desc" style={{ marginBottom: '12px', color: '#374151' }}><strong>Guest:</strong> {event.invitee_name}</p>
                                                    <div className="info-item"><Clock size={16} /><span style={{ textTransform: 'capitalize' }}>{event.duration_minutes} mins • {event.status}</span></div>
                                                </div>
                                                
                                                <div className="card-footer" style={{ display: 'flex', gap: '10px' }}>
                                                    <button 
                                                        className="btn-primary" style={{justifyContent:'center', cursor:'pointer'}}
                                                        onClick={() => openReschedule(event.id, event.organizer_id)} // <-- PENTING: Pass organizer_id
                                                        disabled={loadingAction}
                                                    >
                                                        Reschedule
                                                    </button>
                                                    <button 
                                                        className="btn-danger" style={{justifyContent:'center', cursor:'pointer', background:'#fee2e2', color:'#ef4444', border:'1px solid #fecaca'}}
                                                        onClick={() => handleCancel(event.id)}
                                                        disabled={loadingAction}
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : <p className="empty-text">No available bookings found.</p>}
                        </div>

                        {rescheduleModal.open && (
                            <div
                                className="modal-backdrop"
                                onClick={closeReschedule}
                                style={{
                                    position: 'fixed', inset: 0, zIndex: 999,
                                    background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(2px)',
                                    display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px',
                                }}
                            >
                                <div
                                    className="modal-content"
                                    onClick={(e) => e.stopPropagation()}
                                    style={{
                                        background: 'white', borderRadius: '20px',
                                        width: '100%', maxWidth: '900px', 
                                        maxHeight: '90vh', display: 'flex', flexDirection: 'column',
                                        overflow: 'hidden', animation: 'fadeIn 0.2s ease-out'
                                    }}
                                >
                                    <div style={{ 
                                        padding: '16px 24px', borderBottom: '1px solid #f3f4f6',
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                    }}>
                                        <h3 style={{ margin: 0, fontSize: '1.125rem', color: '#111827' }}>Reschedule Booking</h3>
                                        <button onClick={closeReschedule} style={{ background: '#f3f4f6', border: 'none', borderRadius: '50%', width:'32px', height:'32px', display:'flex', alignItems:'center', justifyContent:'center', cursor: 'pointer' }}>
                                            <X size={18} />
                                        </button>
                                    </div>

                                    <div style={{ flex: 1, overflow: 'hidden' }}>
                                        <DateSelection 
                                            organizerId={rescheduleModal.organizerId} 
                                            onSelectSlot={handleDateSelected} 
                                            isEmbedded={true} 
                                        />
                                    </div>

                                    <div style={{ 
                                        padding: '16px 24px', borderTop: '1px solid #f3f4f6',
                                        display: 'flex', justifyContent: 'flex-end', gap: '12px', background: 'white'
                                    }}>
                                        <button onClick={closeReschedule} style={{ padding: '10px 20px', borderRadius: '8px', background: 'white', border: '1px solid #d1d5db', color: '#374151', fontWeight: '500', cursor: 'pointer' }}>
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleRescheduleConfirm}
                                            disabled={loadingAction || !rescheduleModal.newDate}
                                            style={{
                                                padding: '10px 24px', borderRadius: '8px',
                                                background: '#1e293b', border: 'none', color: 'white', fontWeight: '600',
                                                cursor: (loadingAction || !rescheduleModal.newDate) ? 'not-allowed' : 'pointer',
                                                opacity: (loadingAction || !rescheduleModal.newDate) ? 0.6 : 1
                                            }}
                                        >
                                            {loadingAction ? 'Saving...' : 'Confirm Reschedule'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
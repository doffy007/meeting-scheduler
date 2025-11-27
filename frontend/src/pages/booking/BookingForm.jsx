import { useState } from 'react';
import { Calendar, Clock, MapPin, ChevronLeft, Loader, User, Mail, Phone, AlignLeft } from 'lucide-react';
import Button from '../../components/Button';
import Input from '../../components/Input';
import { bookingService } from '../../services/booking.service';

import '../../styles/Booking.css'; 

export default function BookingForm({ organizerId, organizer, selectedDate, selectedSlot, onBack, onSuccess }) {    
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const formattedDate = selectedDate ? new Date(selectedDate).toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    }) : '';

    const formattedTime = selectedSlot ? new Date(selectedSlot.start).toLocaleTimeString('en-US', {
        hour: '2-digit', minute: '2-digit'
    }) : '';

    const toLocalISOString = (dateString) => {
        const date = new Date(dateString);
        const pad = (n) => (n < 10 ? '0' + n : n);
        const tzOffset = -date.getTimezoneOffset();
        const diff = tzOffset >= 0 ? '+' : '-';
        const padOffset = (n) => (n < 10 ? '0' + n : n);
        return date.getFullYear() +
            '-' + pad(date.getMonth() + 1) +
            '-' + pad(date.getDate()) +
            'T' + pad(date.getHours()) +
            ':' + pad(date.getMinutes()) +
            ':' + pad(date.getSeconds()) +
            diff + padOffset(Math.floor(Math.abs(tzOffset) / 60)) + ':' + padOffset(Math.abs(tzOffset) % 60);
    };

const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!selectedSlot || !selectedSlot.start) {
        setError('No time slot selected. Please go back and select a time.');
        return;
    }

    if (!name.trim()) {
        setError('Please enter your full name.');
        return;
    }

    if (!email.trim()) {
        setError('Please enter your email address.');
        return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        setError('Please enter a valid email address.');
        return;
    }

    setIsSubmitting(true);

    try {
        const payload = {
            invitee_name: name.trim(),
            invitee_email: email.trim().toLowerCase(),
            invitee_phone: phone.trim() || null,
            invitee_notes: notes.trim() || null,
            start_time: toLocalISOString(selectedSlot.start),
            invitee_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jakarta'
        };

        const res = await bookingService.createPublicBooking(organizerId, payload);
                
        if (onSuccess) {
            onSuccess(res);
        }

    } catch (err) {
        console.error("Booking failed:", err);
        
        if (err.response) {
            const errorMessage = err.response.data?.message 
                || err.response.data?.error 
                || 'Failed to create booking. Please try again.';
            
            if (err.response.status === 409) {
                setError('This time slot is no longer available. Please select another time.');
            } else if (err.response.status === 400) {
                setError(errorMessage);
            } else if (err.response.status === 422) {
                setError('Invalid booking data. Please check your information.');
            } else {
                setError(errorMessage);
            }
        } else if (err.request) {
            setError('Network error. Please check your connection and try again.');
        } else {
            setError('An unexpected error occurred. Please try again.');
        }
    } finally {
        setIsSubmitting(false);
    }
};

    return (
        <div className="bf-container">
            <div className="bf-card">
                
                <div className="bf-header">
                    <h1 className="bf-title">{organizer.name || "Organizer Name"}</h1>
                    <p className="bf-subtitle">Confirm Booking Details</p>
                </div>

                <div className="bf-info-box">
                    <h3 className="bf-section-title">Session Info</h3>
                    
                    <div className="bf-info-time">
                        <span className="time">{formattedTime}</span>
                        <span className="date">{formattedDate}</span>
                    </div>

                    <div className="bf-info-details">
                        <div className="bf-detail-item">
                            <Clock size={16} />
                            <span>{organizer.meeting_duration_minutes || 30} Mins</span>
                        </div>
                        <div className="bf-divider"></div>
                        <div className="bf-detail-item">
                            <MapPin size={16} />
                            <span>Online</span>
                        </div>
                    </div>
                </div>

                <div className="bf-form-area">
                    <h3 className="bf-section-title">Your Information</h3>

                    {error && (
                        <div className="bf-error-alert">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="bf-form">
                        <Input
                            id="name"
                            label="Full Name *"
                            placeholder="John Doe"
                            value={name}
                            icon={<User size={18} color="#9ca3af"/>}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                        
                        <Input
                            id="email"
                            label="Email Address *"
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            icon={<Mail size={18} color="#9ca3af"/>}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />

                        <Input
                            id="phone"
                            label="Phone (Optional)"
                            type="tel"
                            placeholder="+62..."
                            value={phone}
                            icon={<Phone size={18} color="#9ca3af"/>}
                            onChange={(e) => setPhone(e.target.value)}
                        />

                        <div className="bf-input-group">
                            <label className="bf-label">Additional Notes</label>
                            <div className="bf-textarea-wrapper">
                                <textarea
                                    className="bf-textarea"
                                    rows="3"
                                    placeholder="Please share anything that will help prepare for our meeting."
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                />
                                <div className="bf-icon-absolute">
                                    <AlignLeft size={16} color="#9ca3af"/>
                                </div>
                            </div>
                        </div>

                        <div className="bf-actions">
                            <Button 
                                type="submit" 
                                disabled={isSubmitting}
                                className="bf-btn-submit"
                            >
                                {isSubmitting ? (
                                    <span className="flex-center"><Loader className="animate-spin" size={18}/> Processing...</span>
                                ) : (
                                    "Confirm Booking"
                                )}
                            </Button>

                            <button 
                                type="button"
                                onClick={onBack}
                                className="bf-btn-cancel"
                            >
                                Cancel & Go Back
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, Calendar, Clock, User, Mail } from 'lucide-react';
import Button from '../../components/Button';
import '../../styles/Success.css'; 

export default function Success({ booking }) {
    if (!booking) {
        return (
            <div className="success-page">
                <div className="success-card empty-state">
                    <h1>No booking found</h1>
                    <p>We couldn't retrieve the booking details.</p>
                    <Link to="/">
                        <Button>Go Home</Button>
                    </Link>
                </div>
            </div>
        );
    }

    const dateObj = new Date(booking.start_time);
    const formattedDate = dateObj.toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
    const formattedTime = dateObj.toLocaleTimeString('en-US', {
        hour: '2-digit', minute: '2-digit'
    });

    return (
        <div className="success-page">
            <div className="success-card fade-in-up">
                
                <div className="success-header">
                    <div className="icon-pulse">
                        <CheckCircle size={64} strokeWidth={2.5} />
                    </div>
                    <h1 className="title">Booking Confirmed!</h1>
                    <p className="subtitle">
                        {booking.message || 'You will receive a confirmation email shortly.'}
                    </p>
                </div>

                <div className="success-details">
                    <div className="detail-item">
                        <div className="detail-icon"><Calendar size={20} /></div>
                        <div className="detail-info">
                            <span className="label">Date</span>
                            <span className="value">{formattedDate}</span>
                        </div>
                    </div>

                    <div className="detail-item">
                        <div className="detail-icon"><Clock size={20} /></div>
                        <div className="detail-info">
                            <span className="label">Time</span>
                            <span className="value">
                                {formattedTime} <span className="badge">{booking.duration_minutes} min</span>
                            </span>
                        </div>
                    </div>

                    <div className="divider"></div>

                    <div className="detail-item">
                        <div className="detail-icon"><User size={20} /></div>
                        <div className="detail-info">
                            <span className="label">Guest Name</span>
                            <span className="value">{booking.invitee_name}</span>
                        </div>
                    </div>

                    <div className="detail-item">
                        <div className="detail-icon"><Mail size={20} /></div>
                        <div className="detail-info">
                            <span className="label">Email</span>
                            <span className="value">{booking.invitee_email}</span>
                        </div>
                    </div>
                </div>

                <div className="success-footer">
                    <Link to={`/organizer/${booking.organizer_id}`} className="link-wrapper">
                        <Button className="btn-full">Back to Organizer Profile</Button>
                    </Link>
                </div>
            </div>
        </div>
    );
}
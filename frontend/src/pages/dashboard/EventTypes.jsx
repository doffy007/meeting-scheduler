import { useState } from 'react';
import { Clock, Link as LinkIcon, MoreHorizontal, Plus, Users, Calendar } from 'lucide-react';
import Button from '../../components/Button';
import { MOCK_EVENT_TYPES } from '../../lib/mockData';
import '../../styles/Dashboard.css';

export function EventTypes() {
    const [eventTypes] = useState(MOCK_EVENT_TYPES);
    const [copiedLink, setCopiedLink] = useState(null);

    const handleCopyLink = (slug) => {
        const url = `${window.location.origin}/username/${slug}`;
        navigator.clipboard.writeText(url);
        setCopiedLink(slug);
        setTimeout(() => setCopiedLink(null), 2000);
    };

    const getEventColor = (index) => {
        const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
        return colors[index % colors.length];
    };

    return (
        <div className="dashboard-page">
            <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ marginBottom: '0.5rem' }}>Event Types</h1>
                    <p>Create and manage your booking events</p>
                </div>
                <Button style={{
                    background: '#2563eb',
                    border: 'none',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '0.5rem',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                }}>
                    <Plus size={18} />
                    New Event Type
                </Button>
            </header>

            <div className="event-types-grid">
                {eventTypes.map((evt, index) => (
                    <div key={evt.id} className="event-type-card">
                        <div className="event-type-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '0.5rem',
                                    background: getEventColor(index),
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white'
                                }}>
                                    <Calendar size={20} />
                                </div>
                                <h3 className="event-type-title">{evt.title}</h3>
                            </div>
                            <button className="btn-ghost" style={{
                                border: "none"
                            }}>
                                <MoreHorizontal size={18} />
                            </button>
                        </div>

                        <div className="event-type-duration">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Clock size={16} />
                                <span>{evt.duration} minutes</span>
                            </div>
                            <span className="dot">•</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <Users size={16} />
                                <span>1-on-1</span>
                            </div>
                        </div>

                        <p style={{
                            color: '#64748b',
                            fontSize: '0.875rem',
                            margin: '0.75rem 0',
                            lineHeight: '1.5'
                        }}>
                            {evt.description}
                        </p>

                        <div className="event-type-footer">
                            <button
                                className="copy-link"
                                onClick={() => handleCopyLink(evt.slug)}
                                style={{
                                    background: copiedLink === evt.slug ? '#dcfce7' : 'transparent',
                                    color: copiedLink === evt.slug ? '#166534' : '#2563eb',
                                    border: copiedLink === evt.slug ? '1px solid #86efac' : '1px solid #e2e8f0'
                                }}
                            >
                                <LinkIcon size={16} />
                                {copiedLink === evt.slug ? 'Copied!' : `/${evt.slug}`}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}


import { useEffect, useState } from 'react';
import DatePicker from 'react-datepicker';
import { Loader, X, Clock, Calendar as CalendarIcon, MapPin } from 'lucide-react';
import { bookingService } from '../../services/booking.service';

import { toZonedTime } from 'date-fns-tz';

import "react-datepicker/dist/react-datepicker.css";
import '../../styles/DateSelection.css'; 
import { organizerSettingsService } from '../../services/organizerSetting.service';

export default function DateSelection({ organizerId, onSelectSlot, isEmbedded = false }) {
    const [loading, setLoading] = useState(true);
    const [slotsByDate, setSlotsByDate] = useState({});
       const [availableDates, setAvailableDates] = useState([]);
    const [selectedDate, setSelectedDate] = useState(null);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedDaySlots, setSelectedDaySlots] = useState([]);

    const [organizerTz, setOrganizerTz] = useState("Asia/Jakarta");

    useEffect(() => {
        if (!organizerId) return; 

        async function fetchData() {
            setLoading(true);

            try {
                const settings = await organizerSettingsService.publicGetSettings(organizerId);
                const tz = settings?.timezone || "Asia/Jakarta";
                setOrganizerTz(tz);

                const res = await bookingService.getAvailability(organizerId);

                let data = [];
                if (res?.slots && Array.isArray(res.slots)) data = res.slots;
                else if (Array.isArray(res)) data = res;
                else if (res?.data && Array.isArray(res.data)) data = res.data;

                const maxTime = settings?.working_hours?.end || "23:59";
                data = data.map(slot => ({ ...slot, organizer_max_time: maxTime }));

                data.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

                const grouped = {};
                const datesArr = [];

                data.forEach(slot => {
                    const d = toZonedTime(new Date(slot.start), tz);
                    const dateKey = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toDateString();

                    if (!grouped[dateKey]) {
                        grouped[dateKey] = [];
                        datesArr.push(new Date(d.getFullYear(), d.getMonth(), d.getDate()));
                    }
                    grouped[dateKey].push(slot);
                });

                setSlotsByDate(grouped);
                setAvailableDates(datesArr);

            } catch (err) {
                console.error("Failed:", err);
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, [organizerId]);

    const handleDateChange = (date) => {
        if (!date) return;

        const organizerDate = toZonedTime(date, organizerTz);

        const normalized = new Date(
            organizerDate.getFullYear(),
            organizerDate.getMonth(),
            organizerDate.getDate()
        );

        setSelectedDate(normalized);

        const key = normalized.toDateString();
        const slots = slotsByDate[key] || [];
        
        setSelectedDaySlots(slots);
        if (!isEmbedded && slots.length > 0) {
            setIsModalOpen(true);
        }
    };

    const renderSlots = () => (
        <div className="slots-grid" style={isEmbedded ? { gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '8px' } : {}}>
            {selectedDaySlots.map((slot, idx) => {
                const slotInOrganizerTz = toZonedTime(new Date(slot.start), organizerTz);

            
                const maxTimeStr = slot.organizer_max_time || "23:59"; 
                const [maxH, maxM] = maxTimeStr.split(':').map(Number);
                const maxDate = new Date(slotInOrganizerTz);
                maxDate.setHours(maxH, maxM, 0, 0);

                const isAfterMax = slotInOrganizerTz.getTime() > maxDate.getTime();

                const localDate = new Date(slot.start);
                const timeLabel = localDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

                return (
                    <button
                        key={idx}
                        disabled={!slot.available || isAfterMax}
                        onClick={() => slot.available && !isAfterMax && onSelectSlot(slot)}
                        className={slot.available && !isAfterMax ? "slot-btn available" : "slot-btn unavailable"}
                        style={isEmbedded ? { fontSize: '0.85rem', padding: '8px' } : {}}
                    >
                        {timeLabel}
                    </button>
                );
            })}
        </div>
    );

    return (
        <div className={isEmbedded ? "embedded-wrapper" : "booking-wrapper"} style={isEmbedded ? { display: 'flex', gap: '20px', height: '100%' } : {}}>
            
            {!isEmbedded && (
                <div className="session-details-panel">
                    <p style={{fontWeight: '700', color: '#64748b', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing:'1px', marginBottom:'4px'}}>Organizer</p>
                    <h1>Consultation Session</h1>
                    <div style={{marginTop: '1.5rem'}}>
                        <div className="detail-item"><Clock size={20} className="text-gray-400"/><span>30 Minutes</span></div>
                        <div className="detail-item"><MapPin size={20} className="text-gray-400"/><span>Online</span></div>
                    </div>
                </div>
            )}

            <div className="ds-container" style={isEmbedded ? { flex: 1, boxShadow: 'none', padding: 0 } : {}}>
                {loading ? (
                    <div className="loading-container">
                        <Loader className="spin-icon" size={40}/> 
                        <span>Checking availability...</span>
                    </div>
                ) : (
                    <div style={isEmbedded ? { display: 'flex', flexDirection: 'column', alignItems: 'center' } : {}}>
                        {!isEmbedded && (
                            <div className="ds-header">
                                <h2 className="ds-title">Select a Date</h2>
                                <p className="ds-subtitle">Dates with available slots are highlighted</p>
                            </div>
                        )}

                        <div className="datepicker-wrapper">
                            <DatePicker
                                selected={selectedDate}
                                onChange={handleDateChange}
                                includeDates={availableDates}
                                inline
                                calendarClassName="custom-calendar"
                            />
                        </div>
                    </div>
                )}
            </div>

            {isEmbedded && (
                <div style={{ flex: 1.2, borderLeft: '1px solid #eee', paddingLeft: '20px', overflowY: 'auto', maxHeight: '400px' }}>
                    <h4 style={{ marginTop: 0, marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Clock size={18}/> Available Slots
                    </h4>
                    
                    {!selectedDate ? (
                        <p style={{ color: '#999', fontSize: '0.9rem' }}>Please select a date first.</p>
                    ) : selectedDaySlots.length === 0 ? (
                        <p style={{ color: '#999', fontSize: '0.9rem' }}>No slots available.</p>
                    ) : (
                        renderSlots()
                    )}
                </div>
            )}

            {!isEmbedded && isModalOpen && (
                <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="modal-title-group">
                                <h3><CalendarIcon size={20} className="text-slate-700"/> Available Time</h3>
                                <p>{selectedDate?.toLocaleDateString('en-US', { weekday:'long', day:'numeric', month:'long' })}</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="close-btn"><X size={24} /></button>
                        </div>
                        <div className="slots-container">
                            {selectedDaySlots.length === 0 ? (
                                <div className="text-center py-8 text-gray-500"><p>No slots available.</p></div>
                            ) : (
                                renderSlots()
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

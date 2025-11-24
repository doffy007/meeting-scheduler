import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { organizerService } from "../../services/organizer.service";
import { MapPin, Phone, Mail, Clock, Calendar, User, CalendarX } from "lucide-react";
import '../../styles/Detail.css';

export default function OrganizerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [organizer, setOrganizer] = useState(null);
  const [loading, setLoading] = useState(true);
  const fetched = useRef(false);

  // Helper untuk mengubah angka hari menjadi nama hari
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const getDayName = (num) => days[num] || `Day ${num}`;

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;

    async function fetchData() {
      try {
        const res = await organizerService.getPublicOrganizerDetail(id);
        setOrganizer(res.data);
      } catch (err) {
        console.error("Error getting detail:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [id]);

  const handleBooking = () => {
    navigate(`/booking/${id}`);
  };

  if (loading) return (
    <div className="detail-page-center">
        <div className="spinner"></div>
    </div>
  );

  if (!organizer) return (
    <div className="detail-page-center">
        <p>Organizer not found.</p>
    </div>
  );

  return (
    <div className="detail-page">
      <div className="profile-card fade-in-up">
        
        <div className="profile-header-section">
            <h1 className="profile-name">{organizer.name}</h1>
            <span className="profile-badge">Public Organizer</span>
        </div>

        <div className="info-section">
            <div className="info-item">
                <Mail size={18} className="info-icon" />
                <span>{organizer.email}</span>
            </div>
            <div className="info-item">
                <Phone size={18} className="info-icon" />
                <span>{organizer.phone || '-' }</span>
            </div>
            <div className="info-item">
                <MapPin size={18} className="info-icon" />
                <span>{organizer.address || '-'}</span>
            </div>
        </div>

        <div className="divider"></div>

        <div className="section-block">
            <h3 className="section-title">
                <Clock size={20} className="title-icon" /> Working Hours
            </h3>
            <div className="chips-grid">
                {organizer.working_hours?.length > 0 ? (
                    organizer.working_hours.map((wh, i) => (
                        <div key={i} className="chip time-chip">
                            <span className="chip-label">{getDayName(wh.day)}</span>
                            <span className="chip-value">{wh.start} - {wh.end}</span>
                        </div>
                    ))
                ) : (
                    <p className="empty-text">No working hours set.</p>
                )}
            </div>
        </div>

        <div className="section-block">
            <h3 className="section-title">
                <CalendarX size={20} className="title-icon" /> Unavailable Dates
            </h3>
            <div className="chips-grid">
                {organizer.blackout_dates?.length > 0 ? (
                    organizer.blackout_dates.map((date, i) => (
                        <div key={i} className="chip date-chip">
                            {date}
                        </div>
                    ))
                ) : (
                    <p className="empty-text">No unavailable dates.</p>
                )}
            </div>
        </div>

        <div className="action-footer">
            <button className="btn-book-now" onClick={handleBooking}>
                Book an Appointment
            </button>
        </div>

      </div>
    </div>
  );
}
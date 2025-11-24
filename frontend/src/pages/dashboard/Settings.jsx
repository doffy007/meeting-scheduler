import { useState, useEffect } from 'react';
import { Save, Plus, Trash2, Clock, CalendarOff, Globe, AlertCircle } from 'lucide-react';
import Button from '../../components/Button';
import { organizerSettingsService } from '../../services/organizerSetting.service';
import { organizerService } from '../../services/organizer.service';
import { authService } from '../../services/auth.service';
import '../../styles/Dashboard.css';

const DAYS = [
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' },
    { value: 0, label: 'Sunday' },
];

const TIMEZONES = [
    "Asia/Jakarta", "Asia/Makassar", "Asia/Jayapura", "UTC",
    "America/New_York", "Europe/London"
];

export function Settings() {

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const [formData, setFormData] = useState({
        meeting_duration_minutes: 30,
        buffer_before_minutes: 0,
        buffer_after_minutes: 0,
        minimum_notice_hours: 24,
        timezone: "Asia/Jakarta",
        working_hours: [],
        blackout_dates: []
    });

    const [newBlackoutDate, setNewBlackoutDate] = useState("");
    const [hasSettings, setHasSettings] = useState(false);
    const [organizerId, setOrganizerId] = useState(null);

useEffect(() => {
  const fetchAll = async () => {
    try {
      const profile = await authService.getProfile();
      const userId = profile.id;

      const organizer = await organizerService.getOrganizerByUserId(userId);
      setOrganizerId(organizer.data.id);

      try {
        const response = await organizerSettingsService.getSettings(organizer.data.id);

        if (response?.success && response.data) {
          const settings = response.data;
          setHasSettings(true);

          setFormData({
            meeting_duration_minutes: settings.meeting_duration_minutes,
            buffer_before_minutes: settings.buffer_before_minutes,
            buffer_after_minutes: settings.buffer_after_minutes,
            minimum_notice_hours: settings.minimum_notice_hours,
            timezone: settings.timezone,
            working_hours: settings.working_hours || [],
            blackout_dates: settings.blackout_dates || []
          });
        } else {
          setHasSettings(false);
        }
      } catch (err) {
        console.error("Failed to fetch settings:", err);
        setHasSettings(false);
      }

    } catch (err) {
      console.error("Failed to fetch organizer or profile:", err);
    } finally {
      setLoading(false);
    }
  };

  fetchAll();
}, []);



const handleSubmit = async (e) => {
    e.preventDefault();
    if (!organizerId) return; 
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
        if (hasSettings) {
            await organizerSettingsService.updateSettings({ ...formData, id: organizerId });
        } else {
            const created = await organizerSettingsService.createSettings({ ...formData, id: organizerId });
            setFormData(created);
            setHasSettings(true);
        }
        setMessage({ type: 'success', text: 'Settings saved successfully!' });
    } catch (err) {
        console.error(err);
        setMessage({ type: 'error', text: 'Failed to save settings.' });
    } finally {
        setSaving(false);
    }
};


    const handleInputChange = (e) => {
        const { name, value } = e.target;

        setFormData(prev => ({
            ...prev,
            [name]: name.includes("minutes") || name.includes("hours")
                ? parseInt(value) || 0
                : value
        }));
    };

    const handleDayToggle = (dayValue) => {
        const exists = formData.working_hours.find(wh => wh.day === dayValue);

        let updated;

        if (exists) {
            updated = formData.working_hours.filter(wh => wh.day !== dayValue);
        } else {
            updated = [...formData.working_hours, { day: dayValue, start: "09:00", end: "17:00" }];
        }

        updated.sort((a, b) => a.day - b.day);

        setFormData(prev => ({ ...prev, working_hours: updated }));
    };

    const handleTimeChange = (dayValue, field, value) => {
        const updated = formData.working_hours.map(wh =>
            wh.day === dayValue ? { ...wh, [field]: value } : wh
        );
        setFormData(prev => ({ ...prev, working_hours: updated }));
    };

    const addBlackoutDate = () => {
        if (!newBlackoutDate) return;
        if (formData.blackout_dates.includes(newBlackoutDate)) return;

        setFormData(prev => ({
            ...prev,
            blackout_dates: [...prev.blackout_dates, newBlackoutDate].sort()
        }));

        setNewBlackoutDate("");
    };

    const removeBlackoutDate = (date) => {
        setFormData(prev => ({
            ...prev,
            blackout_dates: prev.blackout_dates.filter(d => d !== date)
        }));
    };

    const isEmptySettings =
        formData.working_hours.length === 0 &&
        formData.blackout_dates.length === 0 &&
        formData.meeting_duration_minutes === 30 &&
        formData.timezone === "Asia/Jakarta";

    if (loading) {
        return (
            <div className="dashboard-page">
                <p>Loading settings...</p>
            </div>
        );
    }

    return (
        <div className="dashboard-page">

            <header className="page-header">
                <h1>Availability & Settings</h1>
                <p className="subtitle">Configure how and when people can book you.</p>
            </header>

            {isEmptySettings && !hasSettings && (
                <div className="info-alert">
                    <AlertCircle size={18} />
                    <span>You don't have settings yet. Please create your availability.</span>
                </div>
            )}

            {message.text && (
                <div className={`alert-box ${message.type}`}>
                    {message.text}
                </div>
            )}

            <form onSubmit={handleSubmit} className="settings-form">

                <section className="card">
                    <h3 className="card-title"><Globe size={18} /> General Settings</h3>

                    <div className="form-grid">
                        <div className="input-group">
                            <label>Meeting Duration (minutes)</label>
                            <input
                                type="number"
                                name="meeting_duration_minutes"
                                value={formData.meeting_duration_minutes}
                                onChange={handleInputChange}
                            />
                        </div>

                        <div className="input-group">
                            <label>Timezone</label>
                            <select
                                name="timezone"
                                value={formData.timezone}
                                onChange={handleInputChange}
                            >
                                {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                            </select>
                        </div>

                        <div className="input-group">
                            <label>Buffer Before (minutes)</label>
                            <input
                                type="number"
                                name="buffer_before_minutes"
                                value={formData.buffer_before_minutes}
                                onChange={handleInputChange}
                            />
                        </div>

                        <div className="input-group">
                            <label>Buffer After (minutes)</label>
                            <input
                                type="number"
                                name="buffer_after_minutes"
                                value={formData.buffer_after_minutes}
                                onChange={handleInputChange}
                            />
                        </div>

                        <div className="input-group full">
                            <label>Minimum Notice (hours)</label>
                            <input
                                type="number"
                                name="minimum_notice_hours"
                                value={formData.minimum_notice_hours}
                                onChange={handleInputChange}
                            />
                        </div>
                    </div>
                </section>

                <section className="card">
                    <h3 className="card-title"><Clock size={18} /> Working Hours</h3>

                    <div className="working-hours">
                        {DAYS.map(day => {
                            const schedule = formData.working_hours.find(wh => wh.day === day.value);
                            const active = !!schedule;

                            return (
                                <div key={day.value} className="working-row">

                                    <label className="day-label">
                                        <input
                                            type="checkbox"
                                            checked={active}
                                            onChange={() => handleDayToggle(day.value)}
                                        />
                                        {day.label}
                                    </label>

                                    {active ? (
                                        <div className="time-range">
                                            <input
                                                type="time"
                                                value={schedule.start}
                                                onChange={(e) => handleTimeChange(day.value, "start", e.target.value)}
                                            />
                                            <span>—</span>
                                            <input
                                                type="time"
                                                value={schedule.end}
                                                onChange={(e) => handleTimeChange(day.value, "end", e.target.value)}
                                            />
                                        </div>
                                    ) : (
                                        <span className="inactive-text">Unavailable</span>
                                    )}

                                </div>
                            );
                        })}
                    </div>
                </section>

                <section className="card">
                    <h3 className="card-title"><CalendarOff size={18} /> Blackout Dates</h3>

                    <div className="blackout-input">
                        <input
                            type="date"
                            value={newBlackoutDate}
                            onChange={(e) => setNewBlackoutDate(e.target.value)}
                        />
                        <button type="button" className="btn-add" onClick={addBlackoutDate}>
                            <Plus size={18} /> Add
                        </button>
                    </div>

                    <div className="chip-list">
                        {formData.blackout_dates.length > 0 ? (
                            formData.blackout_dates.map(date => (
                                <div key={date} className="chip">
                                    {date}
                                    <button onClick={() => removeBlackoutDate(date)}>
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))
                        ) : (
                            <p className="empty">No blackout dates added.</p>
                        )}
                    </div>
                </section>
                <footer className="submit-footer">
                <footer className="submit-footer">
                    <Button onClick={handleSubmit} disabled={saving}>
                        {saving ? "Saving…" : <><Save size={18} /> Save Changes</>}
                    </Button>
                    </footer>
                </footer>
            </form>
        </div>
    );
}
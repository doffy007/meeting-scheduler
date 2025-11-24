import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'; 
import { Calendar, Clock, Link as LinkIcon, Settings, LogOut } from 'lucide-react';
import { authService } from '../services/auth.service'; 

export default function DashboardLayout() {
    const location = useLocation();
    const navigate = useNavigate(); 

    const isActive = (path) => {
        return location.pathname === path || location.pathname.startsWith(path + '/');
    };

    const handleLogout = async () => {
        const confirmLogout = window.confirm("Apakah Anda yakin ingin keluar?");
        if (!confirmLogout) return;

        try {
            await authService.logout(); 
        } catch (error) {
            console.error("Server error", error);
        } finally {
            localStorage.removeItem('token');
            navigate('/login');
        }
    };

    return (
        <div className="dashboard-layout">
            <aside className="sidebar">
                <div className="sidebar-header">
                    <Link to="/dashboard/bookings" className="logo">Meeting Scheduler</Link>
                </div>
                <nav className="sidebar-nav">
                    <Link to="/dashboard/bookings" className={`nav-item ${isActive('/dashboard/bookings') ? 'active' : ''}`}>
                        <Calendar size={20} />
                        <span>Bookings</span>
                    </Link>
                    {/* <Link to="/dashboard/event-types" className={`nav-item ${isActive('/dashboard/event-types') ? 'active' : ''}`}>
                        <LinkIcon size={20} />
                        <span>Event Types</span>
                    </Link>
                    <Link to="/dashboard/availability" className={`nav-item ${isActive('/dashboard/availability') ? 'active' : ''}`}>
                        <Clock size={20} />
                        <span>Availability</span>
                    </Link> */}
                    <Link to="/dashboard/settings" className={`nav-item ${isActive('/dashboard/settings') ? 'active' : ''}`}>
                        <Settings size={20} />
                        <span>Settings</span>
                    </Link>
                </nav>
                <div className="sidebar-footer">
                    <button className="nav-item logout-btn" onClick={handleLogout}>
                        <LogOut size={20} />
                        <span>Logout</span>
                    </button>
                </div>
            </aside>
            <main className="dashboard-content">
                <Outlet />
            </main>
        </div>
    );
}
import { Outlet, Link } from 'react-router-dom';

export default function PublicLayout() {
    return (
        <div className="public-layout">
            <header className="public-header">
                <div className="container">
                    <Link to="/" className="logo">Meeting Scheduler</Link>
                    <nav>
                        <Link to="/login">Login</Link>
                        <Link to="/signup" className="btn btn-primary">Get Started</Link>
                    </nav>
                </div>
            </header>
            <main>
                <Outlet />
            </main>
            <footer className="public-footer">
                <div className="container">
                    <p>&copy; 2025 Meeting Scheduler. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
}

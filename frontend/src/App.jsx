import { Routes, Route, Navigate } from 'react-router-dom';

import PublicLayout from './layouts/PublicLayout';
import DashboardLayout from './layouts/DashboardLayout';

import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Onboarding from './pages/Onboarding';

import { Bookings, EventTypes, Availability, Settings } from './pages/dashboard';

import OrganizerIndex from "./pages/organizer/index"; 
import OrganizerDetail from "./pages/organizer/Detail";
import BookingPage from './pages/booking';

function App() {
  return (
    <Routes>

      <Route path="/" element={<PublicLayout />}>
        <Route index element={<Landing />} />
        <Route path="login" element={<Login />} />
        <Route path="signup" element={<Signup />} />
        <Route path="onboarding" element={<Onboarding />} />
      </Route>

      <Route path="/organizers" element={<OrganizerIndex />} />

      <Route path="/public-organizer/:id" element={<OrganizerDetail />} />
      <Route path="/booking/:organizerId" element={<BookingPage />} />

      <Route path="/dashboard" element={<DashboardLayout />}>
        <Route index element={<Navigate to="bookings" replace />} /> 
        <Route path="bookings" element={<Bookings />} />
        <Route path="event-types" element={<EventTypes />} />
        <Route path="availability" element={<Availability />} />
        <Route path="settings" element={<Settings />} />
    </Route>


      <Route path="*" element={<Navigate to="/" replace />} />

    </Routes>
  );
}

export default App;
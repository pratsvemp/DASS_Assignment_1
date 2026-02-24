import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute, RoleRoute } from './components/ProtectedRoute';

// Auth pages
import LoginPage from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';
import OnboardingPage from './pages/auth/OnboardingPage';

// Participant pages
import ParticipantDashboard from './pages/participant/Dashboard';
import BrowseEventsPage from './pages/participant/BrowseEvents';
import EventDetailPage from './pages/participant/EventDetail';
import ParticipantProfile from './pages/participant/Profile';
import ClubsPage from './pages/participant/Clubs';
import OrganizerDetailPage from './pages/participant/OrganizerDetail';

// Organizer pages
import OrganizerDashboard from './pages/organizer/Dashboard';
import CreateEventPage from './pages/organizer/CreateEvent';
import OrganizerEventDetail from './pages/organizer/EventDetail';
import OrganizerProfile from './pages/organizer/Profile';

// Admin pages
import AdminDashboard from './pages/admin/Dashboard';
import ManageOrganizers from './pages/admin/ManageOrganizers';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Post-signup onboarding (participant only) */}
          <Route path="/onboarding" element={
            <RoleRoute role="participant"><OnboardingPage /></RoleRoute>
          } />

          {/* ── Participant ── */}
          <Route path="/dashboard" element={
            <RoleRoute role="participant"><ParticipantDashboard /></RoleRoute>
          } />
          <Route path="/events" element={
            <ProtectedRoute><BrowseEventsPage /></ProtectedRoute>
          } />
          <Route path="/events/:id" element={
            <ProtectedRoute><EventDetailPage /></ProtectedRoute>
          } />
          <Route path="/profile" element={
            <RoleRoute role="participant"><ParticipantProfile /></RoleRoute>
          } />
          <Route path="/clubs" element={
            <ProtectedRoute><ClubsPage /></ProtectedRoute>
          } />
          <Route path="/clubs/:id" element={
            <ProtectedRoute><OrganizerDetailPage /></ProtectedRoute>
          } />

          {/* ── Organizer ── */}
          <Route path="/organizer/dashboard" element={
            <RoleRoute role="organizer"><OrganizerDashboard /></RoleRoute>
          } />
          <Route path="/organizer/events/create" element={
            <RoleRoute role="organizer"><CreateEventPage /></RoleRoute>
          } />
          <Route path="/organizer/events/:id" element={
            <RoleRoute role="organizer"><OrganizerEventDetail /></RoleRoute>
          } />
          <Route path="/organizer/profile" element={
            <RoleRoute role="organizer"><OrganizerProfile /></RoleRoute>
          } />

          {/* ── Admin ── */}
          <Route path="/admin/dashboard" element={
            <RoleRoute role="admin"><AdminDashboard /></RoleRoute>
          } />
          <Route path="/admin/organizers" element={
            <RoleRoute role="admin"><ManageOrganizers /></RoleRoute>
          } />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Shows a spinner while session is being verified on load
const Spinner = () => (
    <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
);

// Generic protected route — redirects to /login if not authenticated
export const ProtectedRoute = ({ children }) => {
    const { isAuthenticated, loading } = useAuth();
    const location = useLocation();
    if (loading) return <Spinner />;
    if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;
    return children;
};

// Role-gated route — redirects to appropriate dashboard if wrong role
export const RoleRoute = ({ children, role }) => {
    const { user, loading, isAuthenticated } = useAuth();
    const location = useLocation();

    if (loading) return <Spinner />;
    if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;

    if (user.role !== role) {
        const dashMap = { participant: '/dashboard', organizer: '/organizer/dashboard', admin: '/admin/dashboard' };
        return <Navigate to={dashMap[user.role] || '/login'} replace />;
    }
    return children;
};

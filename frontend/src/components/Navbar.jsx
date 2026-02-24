import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/Button';

const NAV = {
    participant: [
        { label: 'Dashboard', to: '/dashboard' },
        { label: 'Browse', to: '/events' },
        { label: 'Clubs', to: '/clubs' },
        { label: 'Profile', to: '/profile' },
    ],
    organizer: [
        { label: 'Dashboard', to: '/organizer/dashboard' },
        { label: 'Create Event', to: '/organizer/events/create' },
        { label: 'Profile', to: '/organizer/profile' },
    ],
    admin: [
        { label: 'Dashboard', to: '/admin/dashboard' },
        { label: 'Organizers', to: '/admin/organizers' },
    ],
};

export default function Navbar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const { pathname } = useLocation();

    const links = NAV[user?.role] || [];

    const handleLogout = () => {
        logout();
        navigate('/login', { replace: true });
    };

    return (
        <nav className="sticky top-0 z-50 bg-background">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
                {/* Brand */}
                <Link to="/" className="pixel-font text-base font-bold tracking-tight text-foreground">
                    FELICITY
                </Link>

                {/* Nav links */}
                <div className="hidden md:flex items-center gap-1">
                    {links.map(link => (
                        <Link
                            key={link.to}
                            to={link.to}
                            className={`px-3 py-1.5 text-xs font-medium transition-colors ${pathname === link.to
                                ? 'bg-primary text-primary-foreground shadow-[var(--pixel-box-shadow)]'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                                }`}
                        >
                            {link.label}
                        </Link>
                    ))}
                </div>

                {/* User + Logout */}
                <div className="flex items-center gap-3">
                    <span className="hidden sm:block text-xs text-muted-foreground capitalize">
                        {user?.firstName || user?.organizerName || user?.adminName || user?.email}
                    </span>
                    <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleLogout}
                    >
                        Logout
                    </Button>
                </div>
            </div>
        </nav>
    );
}

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import { participantAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../../components/ui/Badge';
import { Card, CardContent } from '../../components/ui/Card';

const STATUS_VARIANT = {
    Confirmed: 'success',
    Pending: 'warning',
    Approved: 'success',
    Rejected: 'destructive',
    Cancelled: 'secondary',
};

const TABS = ['All', 'Normal', 'Merchandise', 'Completed', 'Cancelled'];

export default function ParticipantDashboard() {
    const { user } = useAuth();
    const [registrations, setRegistrations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('All');

    useEffect(() => {
        participantAPI.getMyEvents()
            .then(res => setRegistrations(res.data.registrations))
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    const now = new Date();

    const upcoming = registrations.filter(r =>
        ['Confirmed', 'Approved'].includes(r.status) && new Date(r.event?.startDate) > now
    );

    const filtered = registrations.filter(r => {
        if (activeTab === 'All') return true;
        if (activeTab === 'Normal') return r.event?.eventType === 'Normal';
        if (activeTab === 'Merchandise') return r.event?.eventType === 'Merchandise';
        if (activeTab === 'Completed') return r.event?.status === 'Completed';
        if (activeTab === 'Cancelled') return ['Rejected', 'Cancelled'].includes(r.status) || r.event?.status === 'Cancelled';
        return true;
    });

    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <div className="mx-auto max-w-5xl px-4 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="pixel-font text-xl font-bold">Welcome, {user?.firstName}!</h1>
                    <p className="text-muted-foreground mt-2 text-sm">Here&apos;s what&apos;s happening with your events.</p>
                </div>

                {/* Upcoming Events */}
                <section className="mb-10">
                    <h2 className="pixel-font text-sm font-semibold mb-4 uppercase tracking-wider">Upcoming Events</h2>
                    {loading ? (
                        <p className="text-muted-foreground text-sm">Loading…</p>
                    ) : upcoming.length === 0 ? (
                        <Card>
                            <CardContent className="py-8 text-center">
                                <p className="text-muted-foreground text-sm">No upcoming events.</p>
                                <Link to="/events" className="mt-3 inline-block text-xs text-primary font-medium hover:underline">
                                    Browse events →
                                </Link>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            {upcoming.map(r => (
                                <Link key={r._id} to={`/events/${r.event?._id}`}>
                                    <Card className="hover:brightness-95 transition-all">
                                        <CardContent className="p-5">
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <p className="font-semibold text-sm">{r.event?.name}</p>
                                                    <p className="text-xs text-muted-foreground mt-0.5">{r.event?.organizer?.organizerName}</p>
                                                </div>
                                                <Badge variant="default">{r.event?.eventType}</Badge>
                                            </div>
                                            <p className="mt-3 text-xs text-muted-foreground">
                                                {new Date(r.event?.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </p>
                                            {r.ticketId && (
                                                <p className="mt-1 text-xs text-muted-foreground font-mono">{r.ticketId}</p>
                                            )}
                                            {r.qrCodeUrl && (
                                                <img src={r.qrCodeUrl} alt="QR" className="mt-2 w-20 h-20 rounded border border-border" />
                                            )}
                                        </CardContent>
                                    </Card>
                                </Link>
                            ))}
                        </div>
                    )}
                </section>

                {/* Participation History */}
                <section>
                    <h2 className="pixel-font text-sm font-semibold mb-4 uppercase tracking-wider">Participation History</h2>
                    {/* Tabs */}
                    <div className="flex gap-1 mb-4 border-b border-border">
                        {TABS.map(tab => (
                            <button key={tab} onClick={() => setActiveTab(tab)}
                                className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors -mb-px ${activeTab === tab
                                    ? 'border-primary text-primary'
                                    : 'border-transparent text-muted-foreground hover:text-foreground'
                                    }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    {loading ? <p className="text-muted-foreground text-sm">Loading…</p>
                        : filtered.length === 0 ? (
                            <p className="text-muted-foreground py-4 text-sm">No records found.</p>
                        ) : (
                            <div className="overflow-x-auto shadow-[var(--pixel-box-shadow)] box-shadow-margin">
                                <table className="w-full text-xs">
                                    <thead className="bg-muted text-muted-foreground">
                                        <tr>
                                            <th className="px-4 py-3 text-left font-medium uppercase tracking-wider">Event</th>
                                            <th className="px-4 py-3 text-left font-medium uppercase tracking-wider">Type</th>
                                            <th className="px-4 py-3 text-left font-medium uppercase tracking-wider">Organizer</th>
                                            <th className="px-4 py-3 text-left font-medium uppercase tracking-wider">Status</th>
                                            <th className="px-4 py-3 text-left font-medium uppercase tracking-wider">Ticket / Order ID</th>
                                            <th className="px-4 py-3 text-left font-medium uppercase tracking-wider">QR</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {filtered.map(r => (
                                            <tr key={r._id} className="hover:bg-muted/30">
                                                <td className="px-4 py-3 font-medium">{r.event?.name}</td>
                                                <td className="px-4 py-3 text-muted-foreground">{r.event?.eventType}</td>
                                                <td className="px-4 py-3 text-muted-foreground">{r.event?.organizer?.organizerName}</td>
                                                <td className="px-4 py-3">
                                                    <Badge variant={STATUS_VARIANT[r.status] || 'secondary'}>{r.status}</Badge>
                                                </td>
                                                <td className="px-4 py-3 font-mono text-muted-foreground">
                                                    {r.ticketId || '—'}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {r.qrCodeUrl
                                                        ? <a href={r.qrCodeUrl} target="_blank" rel="noreferrer"><img src={r.qrCodeUrl} alt="QR" className="w-10 h-10 rounded border border-border hover:scale-150 transition-transform cursor-zoom-in" /></a>
                                                        : <span className="text-muted-foreground">—</span>
                                                    }
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                </section>
            </div>
        </div>
    );
}

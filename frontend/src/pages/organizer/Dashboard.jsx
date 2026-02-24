import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import { organizerAPI, eventsAPI } from '../../services/api';

const STATUS_PILL = {
    Draft: 'bg-muted text-muted-foreground',
    Published: 'bg-blue-100 text-blue-700',
    Ongoing: 'bg-green-100 text-green-700',
    Completed: 'bg-purple-100 text-purple-700',
    Closed: 'bg-muted text-muted-foreground',
};

export default function OrganizerDashboard() {
    const [profile, setProfile] = useState(null);
    const [events, setEvents] = useState([]);
    const [analytics, setAnalytics] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([organizerAPI.getDashboard(), organizerAPI.getProfile()])
            .then(([dashRes, profileRes]) => {
                setEvents(dashRes.data.events);
                setAnalytics(dashRes.data.analytics);
                setProfile(profileRes.data.organizer);
            })
            .finally(() => setLoading(false));
    }, []);

    if (loading) return (
        <div className="min-h-screen bg-background"><Navbar />
            <div className="flex justify-center py-24"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
        </div>
    );

    const quickPublish = async (eventId) => {
        try {
            await eventsAPI.publishEvent(eventId);
            setEvents(prev => prev.map(e => e._id === eventId ? { ...e, status: 'Published' } : e));
        } catch (_) { }
    };

    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <div className="mx-auto max-w-6xl px-4 py-8">
                {/* Disabled account banner */}
                {profile && !profile.isApproved && (
                    <div className="mb-6 rounded-xl bg-destructive/10 border border-destructive/30 px-6 py-5">
                        <p className="text-destructive font-semibold text-base mb-1">Account Disabled</p>
                        <p className="text-sm text-destructive/80">Your account has been disabled by the admin. You cannot create new events or access most features. If you believe this is a mistake, please contact the admin.</p>
                    </div>
                )}
                {/* Header */}
                <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
                    <div>
                        <h1 className="text-3xl font-bold">{profile?.organizerName}</h1>
                        <span className="text-sm text-muted-foreground bg-muted px-2.5 py-1 rounded-full mt-1 inline-block">{profile?.category}</span>
                    </div>
                    {profile?.isApproved && (
                        <Link to="/organizer/events/create"
                            className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity">
                            + Create Event
                        </Link>
                    )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                    {[
                        { label: 'Total Events', value: events.length },
                        { label: 'Published/Ongoing', value: events.filter(e => ['Published', 'Ongoing'].includes(e.status)).length },
                        { label: 'Total Registrations', value: analytics.totalRegistrations || 0 },
                        { label: 'Total Revenue', value: `₹${analytics.totalRevenue || 0}` },
                    ].map(({ label, value }) => (
                        <div key={label} className="bg-card border border-border rounded-2xl p-5">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
                            <p className="text-2xl font-bold mt-1">{value}</p>
                        </div>
                    ))}
                </div>

                {/* Events list */}
                <h2 className="text-xl font-semibold mb-4">My Events</h2>
                {events.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border p-12 text-center">
                        <p className="text-muted-foreground">No events yet.</p>
                        <Link to="/organizer/events/create" className="mt-2 inline-block text-sm text-primary hover:underline">Create your first event →</Link>
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-xl border border-border">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/50 text-muted-foreground">
                                <tr>
                                    <th className="px-4 py-3 text-left font-medium">Event</th>
                                    <th className="px-4 py-3 text-left font-medium">Type</th>
                                    <th className="px-4 py-3 text-left font-medium">Status</th>
                                    <th className="px-4 py-3 text-left font-medium">Registrations</th>
                                    <th className="px-4 py-3 text-left font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {events.map(e => (
                                    <tr key={e._id} className="hover:bg-muted/30">
                                        <td className="px-4 py-3 font-medium">{e.name}</td>
                                        <td className="px-4 py-3 text-muted-foreground">{e.eventType}</td>
                                        <td className="px-4 py-3">
                                            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_PILL[e.status]}`}>{e.status}</span>
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground">{e.registrationCount}</td>
                                        <td className="px-4 py-3 flex gap-2">
                                            <Link to={`/organizer/events/${e._id}`} className="text-primary text-xs hover:underline">Manage</Link>
                                            {e.status === 'Draft' && (
                                                <>
                                                    <Link to={`/organizer/events/${e._id}`} state={{ tab: 'edit' }} className="text-amber-500 text-xs hover:underline">Edit</Link>
                                                    <button onClick={() => quickPublish(e._id)} className="text-green-600 text-xs hover:underline">Publish</button>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

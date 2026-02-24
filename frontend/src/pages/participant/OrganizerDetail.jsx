import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import { organizerAPI } from '../../services/api';

export default function OrganizerDetailPage() {
    const { id } = useParams();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        organizerAPI.getPublicDetail(id).then(res => setData(res.data)).finally(() => setLoading(false));
    }, [id]);

    if (loading) return (
        <div className="min-h-screen bg-background"><Navbar />
            <div className="flex justify-center py-24"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
        </div>
    );

    if (!data) return null;
    const { organizer, upcoming, past } = data;

    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <div className="mx-auto max-w-4xl px-4 py-8">
                {/* Organizer info */}
                <div className="bg-card border border-border rounded-2xl p-8 mb-8">
                    <div className="flex items-start gap-5">
                        <div className="h-16 w-16 rounded-2xl bg-primary/20 flex items-center justify-center text-primary font-bold text-2xl flex-shrink-0">
                            {organizer.organizerName[0]}
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold">{organizer.organizerName}</h1>
                            <span className="text-sm text-muted-foreground bg-muted px-2.5 py-1 rounded-full inline-block mt-1">{organizer.category}</span>
                            <p className="mt-3 text-muted-foreground">{organizer.description}</p>
                            <p className="mt-2 text-sm">📧 <a href={`mailto:${organizer.contactEmail}`} className="text-primary hover:underline">{organizer.contactEmail}</a></p>
                        </div>
                    </div>
                </div>

                {/* Upcoming Events */}
                <section className="mb-8">
                    <h2 className="text-xl font-semibold mb-4">Upcoming Events</h2>
                    {upcoming.length === 0 ? (
                        <p className="text-muted-foreground">No upcoming events.</p>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {upcoming.map(e => (
                                <Link key={e._id} to={`/events/${e._id}`} className="block bg-card border border-border rounded-xl p-4 hover:border-primary/50 transition-colors">
                                    <p className="font-semibold">{e.name}</p>
                                    <p className="text-sm text-muted-foreground mt-1">{new Date(e.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                    <p className="text-xs text-muted-foreground mt-1">{e.registrationFee > 0 ? `₹${e.registrationFee}` : 'Free'}</p>
                                </Link>
                            ))}
                        </div>
                    )}
                </section>

                {/* Past Events */}
                <section>
                    <h2 className="text-xl font-semibold mb-4">Past Events</h2>
                    {past.length === 0 ? (
                        <p className="text-muted-foreground">No past events.</p>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {past.map(e => (
                                <div key={e._id} className="bg-card border border-border rounded-xl p-4 opacity-75">
                                    <p className="font-semibold">{e.name}</p>
                                    <p className="text-sm text-muted-foreground mt-1">{new Date(e.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}

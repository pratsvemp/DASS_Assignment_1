import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import { eventsAPI } from '../../services/api';

const EVENT_TYPES = ['All', 'Normal', 'Merchandise'];
const ELIGIBILITIES = ['All', 'IIIT Only', 'Non-IIIT Only'];

export default function BrowseEventsPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [events, setEvents] = useState([]);
    const [trending, setTrending] = useState([]);
    const [loading, setLoading] = useState(true);

    const search = searchParams.get('search') || '';
    const eventType = searchParams.get('eventType') || '';
    const eligibility = searchParams.get('eligibility') || '';
    const dateFrom = searchParams.get('dateFrom') || '';
    const dateTo = searchParams.get('dateTo') || '';
    const followedOnly = searchParams.get('followedOnly') || '';

    const fetchEvents = useCallback(async () => {
        setLoading(true);
        try {
            const params = {
                search, eventType: eventType || undefined, eligibility: eligibility || undefined,
                dateFrom: dateFrom || undefined, dateTo: dateTo || undefined,
                followedOnly: followedOnly || undefined
            };
            const [evRes, trRes] = await Promise.all([
                eventsAPI.getEvents(params),
                eventsAPI.getEvents({ trending: 'true' })
            ]);
            setEvents(evRes.data.events);
            setTrending(trRes.data.events);
        } catch (_) { }
        setLoading(false);
    }, [search, eventType, eligibility, dateFrom, dateTo, followedOnly]);

    useEffect(() => { fetchEvents(); }, [fetchEvents]);

    const set = (key, val) => {
        const updated = new URLSearchParams(searchParams);
        if (val) updated.set(key, val); else updated.delete(key);
        setSearchParams(updated);
    };

    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <div className="mx-auto max-w-6xl px-4 py-8">
                <h1 className="text-3xl font-bold mb-6">Browse Events</h1>

                {/* Trending */}
                {trending.length > 0 && !search && (
                    <section className="mb-8">
                        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">Trending (Top 5 / 24h)</h2>
                        <div className="flex gap-3 overflow-x-auto pb-1">
                            {trending.map(e => (
                                <Link key={e._id} to={`/events/${e._id}`}
                                    className="flex-shrink-0 w-56 rounded-xl border border-border bg-card p-4 hover:border-primary/50 transition-colors">
                                    <p className="font-semibold text-sm truncate">{e.name}</p>
                                    <p className="text-xs text-muted-foreground mt-1">{e.organizer?.organizerName}</p>
                                    <p className="text-xs text-muted-foreground mt-2">
                                        {new Date(e.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                    </p>
                                </Link>
                            ))}
                        </div>
                    </section>
                )}

                {/* Search + Filters */}
                <div className="bg-card border border-border rounded-2xl p-4 mb-6 flex flex-wrap gap-3">
                    <input
                        type="text"
                        placeholder="Search events or organizers…"
                        value={search}
                        onChange={e => set('search', e.target.value)}
                        className="flex-1 min-w-48 rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <select value={eventType} onChange={e => set('eventType', e.target.value === 'All' ? '' : e.target.value)}
                        className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                        {EVENT_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                    <select value={eligibility} onChange={e => set('eligibility', e.target.value === 'All' ? '' : e.target.value)}
                        className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                        {ELIGIBILITIES.map(e => <option key={e}>{e}</option>)}
                    </select>
                    <input type="date" value={dateFrom} onChange={e => set('dateFrom', e.target.value)}
                        className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                    <input type="date" value={dateTo} onChange={e => set('dateTo', e.target.value)}
                        className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                    <button onClick={() => set('followedOnly', followedOnly ? '' : 'true')}
                        className={`rounded-lg px-3 py-2 text-sm font-medium border transition-colors ${followedOnly ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary'}`}>
                        Followed clubs
                    </button>
                </div>

                {/* Event Grid */}
                {loading ? (
                    <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
                ) : events.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border p-16 text-center">
                        <p className="text-muted-foreground">No events found</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {events.map(e => (
                            <Link key={e._id} to={`/events/${e._id}`}
                                className="group block rounded-2xl border border-border bg-card hover:border-primary/50 hover:shadow-md transition-all overflow-hidden">
                                <div className="h-2 bg-gradient-to-r from-primary/60 to-primary" />
                                <div className="p-5">
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                        <h3 className="font-semibold group-hover:text-primary transition-colors">{e.name}</h3>
                                        <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0">
                                            {e.eventType}
                                        </span>
                                    </div>
                                    <p className="text-sm text-muted-foreground">{e.organizer?.organizerName}</p>
                                    <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                                        <span>{new Date(e.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                        <span>{e.registrationFee > 0 ? `₹${e.registrationFee}` : 'Free'}</span>
                                    </div>
                                    {e.eligibility !== 'All' && (
                                        <p className="mt-2 text-xs text-dark-amber-600 bg-dark-amber-50 px-2 py-1 rounded">{e.eligibility}</p>
                                    )}
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

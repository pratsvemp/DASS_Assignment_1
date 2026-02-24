import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import { organizerAPI, participantAPI } from '../../services/api';

export default function ClubsPage() {
    const [organizers, setOrganizers] = useState([]);
    const [followed, setFollowed] = useState([]);
    const [loading, setLoading] = useState(true);
    const [toggleError, setToggleError] = useState(null);

    useEffect(() => {
        // Load organizers independently of profile so one failure doesn't block the other
        organizerAPI.listPublic()
            .then(res => setOrganizers(res.data.organizers || []))
            .catch(() => setOrganizers([]))
            .finally(() => setLoading(false));

        participantAPI.getProfile()
            .then(profileRes => {
                // Normalize to plain strings — followedOrganizers may be populated objects or raw ObjectIds
                const ids = (profileRes.data.participant?.followedOrganizers || [])
                    .map(o => (o._id || o).toString());
                setFollowed(ids);
            })
            .catch(() => { }); // follow state is optional, don't block the page
    }, []);

    const toggle = async (id) => {
        const sid = id.toString();
        const isFollowed = followed.includes(sid);
        setToggleError(null);
        try {
            if (isFollowed) {
                await participantAPI.unfollowOrganizer(sid);
            } else {
                await participantAPI.followOrganizer(sid);
            }
            // Re-fetch from server to confirm the actual DB state
            const profileRes = await participantAPI.getProfile();
            const ids = (profileRes.data.participant?.followedOrganizers || [])
                .map(o => (o._id || o).toString());
            setFollowed(ids);
        } catch (err) {
            setToggleError(err.response?.data?.message || 'Failed to update follow status');
        }
    };

    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <div className="mx-auto max-w-5xl px-4 py-8">
                <h1 className="text-3xl font-bold mb-6">Clubs & Organizers</h1>
                {toggleError && (
                    <div className="mb-4 rounded-lg bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive">
                        {toggleError}
                    </div>
                )}
                {loading ? (
                    <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
                ) : organizers.length === 0 ? (
                    <p className="text-muted-foreground py-12 text-center text-sm">No organizers found. Ask your admin to create some.</p>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {organizers.map(org => (
                            <div key={org._id} className="bg-card border border-border rounded-2xl p-5 flex flex-col">
                                <div className="flex items-start gap-3 mb-3">
                                    <div className="h-11 w-11 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-lg flex-shrink-0">
                                        {org.organizerName[0]}
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-semibold truncate">{org.organizerName}</h3>
                                        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{org.category}</span>
                                    </div>
                                </div>
                                <p className="text-sm text-muted-foreground line-clamp-2 flex-1">{org.description}</p>
                                <div className="flex gap-2 mt-4">
                                    <Link to={`/clubs/${org._id}`}
                                        className="flex-1 rounded-lg border border-border px-3 py-2 text-sm text-center font-medium hover:bg-muted transition-colors">
                                        View
                                    </Link>
                                    <button onClick={() => toggle(org._id)}
                                        className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${followed.includes(org._id)
                                            ? 'bg-primary text-primary-foreground hover:opacity-90'
                                            : 'border border-border hover:border-primary hover:text-primary'}`}>
                                        {followed.includes(org._id) ? 'Following' : 'Follow'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { organizerAPI, participantAPI } from '../../services/api';

const INTERESTS = [
    'Technology', 'Music', 'Sports', 'Art & Design', 'Gaming',
    'Photography', 'Dance', 'Drama', 'Literature', 'Science',
    'Robotics', 'Finance', 'Cooking', 'Film', 'Entrepreneurship'
];

export default function OnboardingPage() {
    const navigate = useNavigate();
    const [organizers, setOrganizers] = useState([]);
    const [selectedInterests, setSelectedInterests] = useState([]);
    const [followedOrganizers, setFollowedOrganizers] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        organizerAPI.listPublic().then(res => setOrganizers(res.data.organizers)).catch(() => { });
    }, []);

    const toggleInterest = (interest) =>
        setSelectedInterests(prev =>
            prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest]
        );

    const toggleOrganizer = (id) =>
        setFollowedOrganizers(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );

    const handleSubmit = async () => {
        setLoading(true);
        try {
            await participantAPI.onboarding({ areasOfInterest: selectedInterests, followedOrganizers });
        } catch (_) { /* ignore errors — onboarding is skippable */ }
        navigate('/dashboard', { replace: true });
    };

    return (
        <div className="min-h-screen bg-background px-4 py-10">
            <div className="mx-auto max-w-2xl">
                <div className="text-center mb-10">
                    <h1 className="text-3xl font-bold">Welcome to Felicity!</h1>
                    <p className="mt-2 text-muted-foreground">Let's personalise your experience. You can update these later.</p>
                </div>

                {/* Interests */}
                <div className="bg-card border border-border rounded-2xl p-6 mb-6">
                    <h2 className="text-lg font-semibold mb-4">Areas of Interest</h2>
                    <div className="flex flex-wrap gap-2">
                        {INTERESTS.map(interest => (
                            <button
                                key={interest}
                                onClick={() => toggleInterest(interest)}
                                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors border ${selectedInterests.includes(interest)
                                    ? 'bg-primary text-primary-foreground border-primary'
                                    : 'bg-background border-border hover:border-primary text-foreground'
                                    }`}
                            >
                                {interest}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Organizers to follow */}
                {organizers.length > 0 && (
                    <div className="bg-card border border-border rounded-2xl p-6 mb-8">
                        <h2 className="text-lg font-semibold mb-4">Clubs & Organizers to Follow</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {organizers.map(org => (
                                <button
                                    key={org._id}
                                    onClick={() => toggleOrganizer(org._id)}
                                    className={`flex items-start gap-3 rounded-xl border p-3 text-left transition-colors ${followedOrganizers.includes(org._id)
                                        ? 'border-primary bg-primary/5'
                                        : 'border-border hover:border-primary/50'
                                        }`}
                                >
                                    <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-sm flex-shrink-0">
                                        {org.organizerName[0]}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-medium text-sm truncate">{org.organizerName}</p>
                                        <p className="text-xs text-muted-foreground">{org.category}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <div className="flex gap-3 justify-end">
                    <button
                        onClick={() => navigate('/dashboard', { replace: true })}
                        className="rounded-lg border border-border px-6 py-2.5 text-sm font-medium hover:bg-muted transition-colors"
                    >
                        Skip for now
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                        {loading ? 'Saving…' : 'Save preferences'}
                    </button>
                </div>
            </div>
        </div>
    );
}

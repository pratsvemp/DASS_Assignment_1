import { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import { participantAPI } from '../../services/api';
import { useForm } from 'react-hook-form';

export default function ParticipantProfile() {
    const [participant, setParticipant] = useState(null);
    const [tab, setTab] = useState('profile');
    const [msg, setMsg] = useState(null);

    const { register: regProfile, handleSubmit: handleProfile, reset } = useForm();
    const { register: regPwd, handleSubmit: handlePwd, reset: resetPwd } = useForm();

    useEffect(() => {
        participantAPI.getProfile().then(res => {
            setParticipant(res.data.participant);
            reset(res.data.participant);
        }).catch(() => setParticipant({})); // show form even if request fails
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const onProfileSave = async (data) => {
        try {
            const res = await participantAPI.updateProfile(data);
            setParticipant(res.data.participant);
            setMsg({ type: 'success', text: 'Profile updated!' });
        } catch (e) {
            setMsg({ type: 'error', text: e.response?.data?.message || 'Update failed' });
        }
    };

    const onPasswordChange = async (data) => {
        try {
            await participantAPI.changePassword(data);
            setMsg({ type: 'success', text: 'Password changed successfully!' });
            resetPwd();
        } catch (e) {
            setMsg({ type: 'error', text: e.response?.data?.message || 'Password change failed' });
        }
    };

    if (!participant) return (
        <div className="min-h-screen bg-background"><Navbar />
            <div className="flex justify-center py-24"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
        </div>
    );

    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <div className="mx-auto max-w-2xl px-4 py-8">
                <h1 className="text-3xl font-bold mb-6">Profile</h1>

                {/* Tabs */}
                <div className="flex gap-1 border-b border-border mb-6">
                    {['profile', 'security'].map(t => (
                        <button key={t} onClick={() => { setTab(t); setMsg(null); }}
                            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px capitalize transition-colors ${tab === t ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}>
                            {t === 'profile' ? 'Personal Info' : 'Security'}
                        </button>
                    ))}
                </div>

                {msg && (
                    <div className={`mb-4 rounded-lg px-4 py-3 text-sm border ${msg.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-destructive/10 text-destructive border-destructive/30'}`}>
                        {msg.text}
                    </div>
                )}

                {tab === 'profile' && (
                    <form onSubmit={handleProfile(onProfileSave)} className="bg-card border border-border rounded-2xl p-6 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1.5">First Name</label>
                                <input {...regProfile('firstName')} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1.5">Last Name</label>
                                <input {...regProfile('lastName')} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5">Email <span className="text-muted-foreground text-xs">(non-editable)</span></label>
                            <input value={participant.email} disabled className="w-full rounded-lg border border-input bg-muted px-3 py-2 text-sm text-muted-foreground cursor-not-allowed" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5">Participant Type <span className="text-muted-foreground text-xs">(non-editable)</span></label>
                            <input value={participant.participantType} disabled className="w-full rounded-lg border border-input bg-muted px-3 py-2 text-sm text-muted-foreground cursor-not-allowed" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5">College / Organization</label>
                            <input {...regProfile('college')} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5">Contact Number</label>
                            <input {...regProfile('contactNumber')} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">Areas of Interest <span className="text-muted-foreground text-xs">(used to personalise event recommendations)</span></label>
                            <div className="grid grid-cols-2 gap-2">
                                {['Technology', 'Arts & Culture', 'Sports', 'Music', 'Gaming', 'Entrepreneurship', 'Research', 'Social Impact', 'Design', 'Finance'].map(area => (
                                    <label key={area} className="flex items-center gap-2 text-sm cursor-pointer select-none">
                                        <input type="checkbox" value={area}
                                            {...regProfile('areasOfInterest')}
                                            className="rounded border-input accent-primary" />
                                        {area}
                                    </label>
                                ))}
                            </div>
                        </div>
                        <button type="submit" className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity">
                            Save changes
                        </button>
                    </form>

                )}

                {tab === 'security' && (
                    <form onSubmit={handlePwd(onPasswordChange)} className="bg-card border border-border rounded-2xl p-6 space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1.5">Current Password</label>
                            <input type="password" {...regPwd('currentPassword', { required: true })} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5">New Password</label>
                            <input type="password" {...regPwd('newPassword', { required: true, minLength: 6 })} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                        </div>
                        <button type="submit" className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity">
                            Change password
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}

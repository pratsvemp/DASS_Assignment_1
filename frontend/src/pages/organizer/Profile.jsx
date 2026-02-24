import { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import { organizerAPI } from '../../services/api';
import { useForm } from 'react-hook-form';

const STATUS_STYLE = {
    Pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    Approved: 'bg-green-100 text-green-800 border-green-300',
    Rejected: 'bg-red-100 text-red-800 border-red-300',
};

export default function OrganizerProfile() {
    const { register, handleSubmit, reset } = useForm();
    const [msg, setMsg] = useState(null);

    // Password reset state
    const [reason, setReason] = useState('');
    const [prMsg, setPrMsg] = useState(null);
    const [prLoading, setPrLoading] = useState(false);
    const [prHistory, setPrHistory] = useState([]);
    const [histLoading, setHistLoading] = useState(true);

    useEffect(() => {
        organizerAPI.getProfile().then(res => reset(res.data.organizer));
    }, [reset]);

    useEffect(() => {
        organizerAPI.getMyPasswordResetRequests()
            .then(res => setPrHistory(res.data.requests || []))
            .catch(() => { })
            .finally(() => setHistLoading(false));
    }, []);

    const onSave = async (data) => {
        try {
            await organizerAPI.updateProfile(data);
            setMsg({ type: 'success', text: 'Profile updated!' });
        } catch (e) {
            setMsg({ type: 'error', text: e.response?.data?.message || 'Update failed' });
        }
    };

    const hasPending = prHistory.some(r => r.status === 'Pending');

    const submitResetRequest = async () => {
        if (!reason.trim()) return;
        setPrLoading(true);
        setPrMsg(null);
        try {
            const res = await organizerAPI.requestPasswordReset({ reason: reason.trim() });
            setPrMsg({ type: 'success', text: res.data.message });
            setReason('');
            // Refresh history
            const hist = await organizerAPI.getMyPasswordResetRequests();
            setPrHistory(hist.data.requests || []);
        } catch (e) {
            setPrMsg({ type: 'error', text: e.response?.data?.message || 'Request failed' });
        } finally {
            setPrLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <div className="mx-auto max-w-2xl px-4 py-8 space-y-8">
                <h1 className="text-3xl font-bold">Organizer Profile</h1>

                {/* ── Profile form ───────────────────────────────── */}
                {msg && (
                    <div className={`rounded-lg px-4 py-3 text-sm border ${msg.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-destructive/10 text-destructive border-destructive/30'}`}>
                        {msg.text}
                    </div>
                )}
                <form onSubmit={handleSubmit(onSave)} className="bg-card border border-border rounded-2xl p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1.5">Organizer Name</label>
                        <input {...register('organizerName')} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1.5">Category</label>
                        <input {...register('category')} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1.5">Description</label>
                        <textarea rows={4} {...register('description')} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1.5">Contact Email <span className="text-xs text-muted-foreground">(cannot be changed)</span></label>
                        <input type="email" {...register('contactEmail')} readOnly
                            className="w-full rounded-lg border border-input bg-muted px-3 py-2 text-sm text-muted-foreground cursor-not-allowed" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1.5">Contact Number</label>
                        <input {...register('contactNumber')} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1.5">Discord Webhook URL</label>
                        <input {...register('discordWebhook')} placeholder="https://discord.com/api/webhooks/…"
                            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                        <p className="text-xs text-muted-foreground mt-1">Automatic event announcement webhook for your Discord server</p>
                    </div>
                    <button type="submit" className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity">
                        Save changes
                    </button>
                </form>

                {/* ── Password Reset Request ─────────────────────── */}
                <section className="bg-card border border-border rounded-2xl p-6 space-y-5">
                    <div>
                        <h2 className="text-lg font-semibold mb-0.5">Password Reset Request</h2>
                        <p className="text-xs text-muted-foreground">
                            Forgot your password? Submit a request to the Admin. They will review it and generate a new password for you.
                        </p>
                    </div>

                    {prMsg && (
                        <div className={`rounded-lg px-4 py-3 text-sm border ${prMsg.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-destructive/10 text-destructive border-destructive/30'}`}>
                            {prMsg.text}
                        </div>
                    )}

                    {hasPending ? (
                        <div className="rounded-lg bg-yellow-50 border border-yellow-200 px-4 py-3 text-sm text-yellow-800">
                            You have a pending password reset request. Please wait for the Admin to respond before submitting another.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium mb-1.5">Reason for reset</label>
                                <textarea
                                    rows={3}
                                    value={reason}
                                    onChange={e => setReason(e.target.value)}
                                    placeholder="Briefly explain why you need a password reset…"
                                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                />
                            </div>
                            <button
                                onClick={submitResetRequest}
                                disabled={prLoading || !reason.trim()}
                                className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {prLoading ? 'Submitting…' : 'Submit Request'}
                            </button>
                        </div>
                    )}

                    {/* ── Request History ───────────────────────── */}
                    <div>
                        <h3 className="text-sm font-semibold mb-3 uppercase tracking-wider text-muted-foreground">Request History</h3>
                        {histLoading ? (
                            <p className="text-sm text-muted-foreground">Loading…</p>
                        ) : prHistory.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No requests yet.</p>
                        ) : (
                            <div className="overflow-x-auto rounded-lg border border-border">
                                <table className="w-full text-xs">
                                    <thead className="bg-muted text-muted-foreground">
                                        <tr>
                                            <th className="px-4 py-3 text-left font-medium">Date</th>
                                            <th className="px-4 py-3 text-left font-medium">Reason</th>
                                            <th className="px-4 py-3 text-left font-medium">Status</th>
                                            <th className="px-4 py-3 text-left font-medium">Admin Note</th>
                                            <th className="px-4 py-3 text-left font-medium">Resolved</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {prHistory.map(r => (
                                            <tr key={r._id} className="hover:bg-muted/30">
                                                <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                                                    {new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                </td>
                                                <td className="px-4 py-3 max-w-[180px]">{r.reason}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`inline-block rounded border px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[r.status]}`}>
                                                        {r.status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-muted-foreground">{r.adminComment || '—'}</td>
                                                <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                                                    {r.resolvedAt ? new Date(r.resolvedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
}

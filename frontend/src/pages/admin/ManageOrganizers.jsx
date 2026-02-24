import { useState, useEffect, useCallback } from 'react';
import Navbar from '../../components/Navbar';
import { adminAPI } from '../../services/api';
import { useForm } from 'react-hook-form';

const CATEGORIES = ['Club', 'Council', 'Fest Team', 'Department', 'Other'];

const PR_STATUS_STYLE = {
    Pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    Approved: 'bg-green-100 text-green-800 border-green-300',
    Rejected: 'bg-red-100 text-red-800 border-red-300',
};

// ── Resolve Modal ──────────────────────────────────────────────────────────────
function ResolveModal({ request, onClose, onDone }) {
    const [action, setAction] = useState('approve');
    const [comment, setComment] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const submit = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await adminAPI.resolvePasswordResetRequest(request._id, { action, comment });
            onDone(res.data);
        } catch (e) {
            setError(e.response?.data?.message || 'Action failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
            <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md space-y-4">
                <h3 className="font-semibold text-base">
                    Resolve Request — <span className="text-primary">{request.organizer?.organizerName}</span>
                </h3>
                <p className="text-xs text-muted-foreground">Reason: {request.reason}</p>

                <div className="flex gap-3">
                    {['approve', 'reject'].map(a => (
                        <button key={a} onClick={() => setAction(a)}
                            className={`flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition-colors capitalize
                                ${action === a
                                    ? a === 'approve' ? 'bg-green-600 text-white border-green-600' : 'bg-destructive text-white border-destructive'
                                    : 'border-border text-muted-foreground hover:bg-muted'}`}>
                            {a}
                        </button>
                    ))}
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1.5">Admin Comment <span className="text-muted-foreground">(optional)</span></label>
                    <textarea rows={3} value={comment} onChange={e => setComment(e.target.value)}
                        placeholder="Leave a note for the organizer…"
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>

                {error && <p className="text-sm text-destructive">{error}</p>}

                <div className="flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Cancel</button>
                    <button onClick={submit} disabled={loading}
                        className={`rounded-lg px-5 py-2 text-sm font-semibold text-white transition-opacity disabled:opacity-50
                            ${action === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-destructive hover:bg-destructive/90'}`}>
                        {loading ? 'Working…' : action === 'approve' ? 'Approve & Reset' : 'Reject'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Password display after approval ───────────────────────────────────────────
function NewPasswordBanner({ data, onDismiss }) {
    const [copied, setCopied] = useState(false);
    const copy = () => {
        navigator.clipboard.writeText(data.newPassword).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
    };
    return (
        <div className="mb-6 bg-green-50 border border-green-300 rounded-xl p-5 space-y-2">
            <p className="font-semibold text-green-800">Password reset approved! Share this new password with the organizer:</p>
            <div className="flex items-center gap-3">
                <code className="flex-1 rounded-lg bg-green-100 border border-green-200 px-4 py-2 font-mono text-lg tracking-widest text-green-900">
                    {data.newPassword}
                </code>
                <button onClick={copy} className="rounded-lg border border-green-400 px-3 py-2 text-xs font-medium text-green-800 hover:bg-green-100 transition-colors">
                    {copied ? 'Copied!' : 'Copy'}
                </button>
            </div>
            <p className="text-xs text-green-700">This password is shown ONCE. Please note it down before dismissing.</p>
            <button onClick={onDismiss} className="text-xs text-green-700 hover:underline">Dismiss</button>
        </div>
    );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function ManageOrganizers() {
    const [tab, setTab] = useState('organizers');   // 'organizers' | 'password-resets'

    // Organizers state
    const [organizers, setOrganizers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [newCreds, setNewCreds] = useState(null);
    const [msg, setMsg] = useState(null);
    const { register, handleSubmit, reset, formState: { errors } } = useForm();

    // Password resets state
    const [prRequests, setPrRequests] = useState([]);
    const [prLoading, setPrLoading] = useState(true);
    const [resolveTarget, setResolveTarget] = useState(null);
    const [newPasswordData, setNewPasswordData] = useState(null);

    const reloadOrganizers = useCallback(() => {
        setLoading(true);
        adminAPI.listOrganizers().then(res => setOrganizers(res.data.organizers)).finally(() => setLoading(false));
    }, []);

    const reloadPR = useCallback(() => {
        setPrLoading(true);
        adminAPI.getPasswordResetRequests().then(res => setPrRequests(res.data.requests || [])).finally(() => setPrLoading(false));
    }, []);

    useEffect(() => { reloadOrganizers(); }, [reloadOrganizers]);
    useEffect(() => { reloadPR(); }, [reloadPR]);

    const onCreateOrganizer = async (data) => {
        try {
            const res = await adminAPI.createOrganizer(data);
            setNewCreds(res.data.organizer);
            setShowCreate(false);
            reset();
            reloadOrganizers();
        } catch (e) {
            setMsg({ type: 'error', text: e.response?.data?.message || 'Failed to create organizer' });
        }
    };

    const toggleDisable = async (o) => {
        try {
            if (o.isApproved) {
                await adminAPI.removeOrganizer(o._id);
            } else {
                await adminAPI.enableOrganizer(o._id);
            }
            reloadOrganizers();
            setMsg({ type: 'success', text: `Organizer ${o.isApproved ? 'disabled' : 'enabled'} successfully` });
        } catch (e) {
            setMsg({ type: 'error', text: e.response?.data?.message || 'Action failed' });
        }
    };

    const resetPwd = async (id) => {
        const res = await adminAPI.resetOrganizerPassword(id);
        setMsg({ type: 'success', text: `New password: ${res.data.newPassword}` });
    };

    const permanentDelete = async (o) => {
        if (!window.confirm(`Permanently delete "${o.organizerName}"? This cannot be undone.`)) return;
        try {
            await adminAPI.deleteOrganizer(o._id);
            reloadOrganizers();
            setMsg({ type: 'success', text: `"${o.organizerName}" permanently deleted.` });
        } catch (e) {
            setMsg({ type: 'error', text: e.response?.data?.message || 'Delete failed' });
        }
    };

    const onResolveDone = (data) => {
        setResolveTarget(null);
        reloadPR();
        if (data.newPassword) setNewPasswordData(data);
    };

    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <div className="mx-auto max-w-6xl px-4 py-8">
                <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                    <h1 className="text-3xl font-bold">Manage Organizers</h1>
                    {tab === 'organizers' && (
                        <button onClick={() => setShowCreate(!showCreate)}
                            className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity">
                            {showCreate ? '✕ Cancel' : '+ Create Organizer'}
                        </button>
                    )}
                </div>

                {/* Tabs */}
                <div className="flex gap-1 mb-6 border-b border-border">
                    {[['organizers', 'Organizers'], ['password-resets', 'Password Resets']].map(([key, label]) => (
                        <button key={key} onClick={() => setTab(key)}
                            className={`px-5 py-2 text-sm font-medium border-b-2 -mb-px transition-colors
                                ${tab === key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
                            {label}
                            {key === 'password-resets' && prRequests.filter(r => r.status === 'Pending').length > 0 && (
                                <span className="ml-2 inline-flex items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-xs font-bold text-primary-foreground">
                                    {prRequests.filter(r => r.status === 'Pending').length}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* ── Organizers tab ─────────────────────────────── */}
                {tab === 'organizers' && (
                    <>
                        {newCreds && (
                            <div className="mb-6 bg-[var(--success)]/10 border border-[var(--success)]/30 p-5">
                                <p className="font-semibold text-[var(--success)] mb-2">✓ Organizer created! Share these credentials:</p>
                                <div className="grid grid-cols-2 gap-4 text-sm font-mono">
                                    <div className="bg-card px-3 py-2 border border-[var(--success)]/20">
                                        <span className="text-[var(--success)] text-xs block mb-0.5">Login Email</span>
                                        {newCreds.loginEmail}
                                    </div>
                                    <div className="bg-card px-3 py-2 border border-[var(--success)]/20">
                                        <span className="text-[var(--success)] text-xs block mb-0.5">Password (once only!)</span>
                                        {newCreds.plainPassword}
                                    </div>
                                </div>
                                <button onClick={() => setNewCreds(null)} className="mt-3 text-xs text-[var(--success)] hover:underline">Dismiss</button>
                            </div>
                        )}

                        {msg && (
                            <div className={`mb-4 px-4 py-3 text-sm border-l-4 ${msg.type === 'success' ? 'bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]' : 'bg-destructive/10 text-destructive border-destructive'}`}>
                                {msg.text} <button onClick={() => setMsg(null)} className="ml-2 opacity-50 hover:opacity-100">✕</button>
                            </div>
                        )}

                        {showCreate && (
                            <form onSubmit={handleSubmit(onCreateOrganizer)} className="bg-card border border-border rounded-2xl p-6 mb-6 space-y-4">
                                <h2 className="text-lg font-semibold">New Organizer</h2>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1.5">Organizer Name *</label>
                                        <input {...register('organizerName', { required: true })}
                                            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1.5">Category *</label>
                                        <select {...register('category', { required: true })}
                                            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                                            <option value="">Select…</option>
                                            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1.5">Description *</label>
                                    <textarea rows={3} {...register('description', { required: true })}
                                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1.5">Contact Email *</label>
                                        <input type="email" {...register('contactEmail', { required: true })}
                                            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1.5">Contact Number</label>
                                        <input {...register('contactNumber')}
                                            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                                    </div>
                                </div>
                                <button type="submit" className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity">
                                    Create Organizer
                                </button>
                            </form>
                        )}

                        {loading ? (
                            <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
                        ) : (
                            <div className="overflow-x-auto rounded-xl border border-border">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted/50 text-muted-foreground">
                                        <tr>
                                            <th className="px-4 py-3 text-left font-medium">Name</th>
                                            <th className="px-4 py-3 text-left font-medium">Category</th>
                                            <th className="px-4 py-3 text-left font-medium">Login Email</th>
                                            <th className="px-4 py-3 text-left font-medium">Status</th>
                                            <th className="px-4 py-3 text-left font-medium">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {organizers.map(o => (
                                            <tr key={o._id} className="hover:bg-muted/30">
                                                <td className="px-4 py-3 font-medium">{o.organizerName}</td>
                                                <td className="px-4 py-3 text-muted-foreground">{o.category}</td>
                                                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{o.email}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`px-2.5 py-1 text-xs font-medium shadow-[var(--pixel-box-shadow)] ${o.isApproved ? 'bg-[var(--success)]/20 text-[var(--success)]' : 'bg-destructive/20 text-destructive'}`}>
                                                        {o.isApproved ? 'Active' : 'Disabled'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 flex gap-3">
                                                    <button onClick={() => resetPwd(o._id)} className="text-[var(--link)] text-xs hover:underline whitespace-nowrap">Reset Password</button>
                                                    <button onClick={() => toggleDisable(o)} className={`text-xs hover:underline whitespace-nowrap ${o.isApproved ? 'text-destructive' : 'text-[var(--success)]'}`}>
                                                        {o.isApproved ? 'Disable' : 'Enable'}
                                                    </button>
                                                    <button onClick={() => permanentDelete(o)} className="text-xs text-destructive hover:underline whitespace-nowrap font-medium">Delete</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </>
                )}

                {/* ── Password Resets tab ────────────────────────── */}
                {tab === 'password-resets' && (
                    <>
                        {newPasswordData && (
                            <NewPasswordBanner data={newPasswordData} onDismiss={() => setNewPasswordData(null)} />
                        )}

                        {prLoading ? (
                            <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
                        ) : prRequests.length === 0 ? (
                            <div className="py-16 text-center text-muted-foreground text-sm">No password reset requests yet.</div>
                        ) : (
                            <div className="overflow-x-auto rounded-xl border border-border">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted/50 text-muted-foreground">
                                        <tr>
                                            <th className="px-4 py-3 text-left font-medium">Club / Organizer</th>
                                            <th className="px-4 py-3 text-left font-medium">Category</th>
                                            <th className="px-4 py-3 text-left font-medium">Reason</th>
                                            <th className="px-4 py-3 text-left font-medium">Requested</th>
                                            <th className="px-4 py-3 text-left font-medium">Status</th>
                                            <th className="px-4 py-3 text-left font-medium">Admin Note</th>
                                            <th className="px-4 py-3 text-left font-medium">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {prRequests.map(r => (
                                            <tr key={r._id} className="hover:bg-muted/30">
                                                <td className="px-4 py-3 font-medium">{r.organizer?.organizerName}</td>
                                                <td className="px-4 py-3 text-muted-foreground">{r.organizer?.category}</td>
                                                <td className="px-4 py-3 max-w-[200px] text-muted-foreground">{r.reason}</td>
                                                <td className="px-4 py-3 text-muted-foreground whitespace-nowrap text-xs">
                                                    {new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`inline-block rounded border px-2 py-0.5 text-xs font-semibold ${PR_STATUS_STYLE[r.status]}`}>
                                                        {r.status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-muted-foreground text-xs max-w-[150px]">{r.adminComment || '—'}</td>
                                                <td className="px-4 py-3">
                                                    {r.status === 'Pending' ? (
                                                        <button onClick={() => setResolveTarget(r)}
                                                            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 transition-opacity whitespace-nowrap">
                                                            Review
                                                        </button>
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground">
                                                            {r.resolvedAt ? new Date(r.resolvedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Resolve modal */}
            {resolveTarget && (
                <ResolveModal
                    request={resolveTarget}
                    onClose={() => setResolveTarget(null)}
                    onDone={onResolveDone}
                />
            )}
        </div>
    );
}

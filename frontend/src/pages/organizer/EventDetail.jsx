import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import { eventsAPI, organizerAPI } from '../../services/api';

const STATUS_PILL = {
    Confirmed: 'bg-green-100 text-green-700',
    Pending: 'bg-yellow-100 text-yellow-700',
    Approved: 'bg-blue-100 text-blue-700',
    Rejected: 'bg-red-100 text-red-700',
};

const toLocalDT = (iso) => iso ? new Date(iso).toISOString().slice(0, 16) : '';

export default function OrganizerEventDetail() {
    const { id } = useParams();
    const location = useLocation();
    const [event, setEvent] = useState(null);
    const [registrations, setRegistrations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState(location.state?.tab || 'registrations');
    const [msg, setMsg] = useState(null);
    const [editData, setEditData] = useState(null);
    const [editFormFields, setEditFormFields] = useState([]);
    const [editVariants, setEditVariants] = useState([]);
    const [saving, setSaving] = useState(false);
    const [isApproved, setIsApproved] = useState(true);
    const [regSearch, setRegSearch] = useState('');
    const [regStatusFilter, setRegStatusFilter] = useState('All');
    // Scan tab state
    const [scanInput, setScanInput] = useState('');
    const [scanResult, setScanResult] = useState(null); // { type: 'success'|'duplicate'|'error', data }
    const [scanLoading, setScanLoading] = useState(false);
    // Attendance tab state
    const [attSearch, setAttSearch] = useState('');
    const [attFilter, setAttFilter] = useState('All'); // All | Present | Absent
    const [overrideModal, setOverrideModal] = useState(null); // { regId, action, name }
    const [overrideNote, setOverrideNote] = useState('');
    const [overrideSaving, setOverrideSaving] = useState(false);

    useEffect(() => {
        organizerAPI.getProfile().then(res => {
            if (res.data.organizer?.isApproved === false) setIsApproved(false);
        }).catch(() => { });
    }, []);

    const reload = () => {
        Promise.all([
            eventsAPI.getOrganizerEventById(id).then(r => {
                const ev = r.data.event;
                setEvent(ev);
                // Pre-fill edit form with current values
                setEditData({
                    name: ev.name || '',
                    description: ev.description || '',
                    eventType: ev.eventType || 'Normal',
                    registrationDeadline: toLocalDT(ev.registrationDeadline),
                    startDate: toLocalDT(ev.startDate),
                    endDate: toLocalDT(ev.endDate),
                    eligibility: ev.eligibility || 'All',
                    registrationLimit: ev.registrationLimit || '',
                    registrationFee: ev.registrationFee ?? 0,
                    tags: (ev.tags || []).join(', '),
                });
                setEditFormFields((ev.formFields || []).map((f, i) => ({ ...f, _key: f._id || `ff-${i}` })));
                setEditVariants((ev.variants || []).map((v, i) => ({ ...v, _key: v._id || `vr-${i}` })));
            }),
            eventsAPI.getRegistrations(id).then(r => setRegistrations(r.data.registrations))
        ]).finally(() => setLoading(false));
    };

    useEffect(() => { reload(); }, [id]);

    const upEdit = (key, val) => setEditData(p => ({ ...p, [key]: val }));

    const handleSaveEdit = async (publish = false) => {
        setSaving(true);
        setMsg(null);
        try {
            const isLocked = event.registrationCount > 0;
            if (!isLocked) {
                // Only send field updates when the draft is unlocked
                const payload = {
                    ...editData,
                    tags: editData.tags ? editData.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
                    registrationLimit: editData.registrationLimit ? Number(editData.registrationLimit) : null,
                    registrationFee: Number(editData.registrationFee || 0),
                    formFields: editData.eventType === 'Normal' ? editFormFields.map(({ _key, ...rest }) => rest) : [],
                    variants: editData.eventType === 'Merchandise' ? editVariants.map(({ _key, ...rest }) => rest) : [],
                };
                await eventsAPI.updateEvent(id, payload);
            }
            if (publish) await eventsAPI.publishEvent(id);
            reload();
            setMsg({ type: 'success', text: publish ? 'Event published!' : 'Draft saved.' });
            if (!publish) setTab('registrations');
        } catch (e) {
            setMsg({ type: 'error', text: e.response?.data?.message || 'Save failed' });
        } finally {
            setSaving(false);
        }
    };

    const markAttend = async (regId) => {
        try {
            await eventsAPI.markAttendance(id, regId, {});
            setRegistrations(prev => prev.map(r => r._id === regId ? { ...r, attended: true } : r));
            setMsg({ type: 'success', text: 'Attendance marked' });
        } catch (e) { setMsg({ type: 'error', text: e.response?.data?.message || 'Error' }); }
    };

    const approvePayment = async (regId, action) => {
        try {
            await eventsAPI.approvePayment(id, regId, { action });
            reload();
            setMsg({ type: 'success', text: `Payment ${action}d` });
        } catch (e) { setMsg({ type: 'error', text: e.response?.data?.message || 'Error' }); }
    };

    // ── Scan: called with a decoded ticketId string ──────────────────────────────
    const handleScan = async (ticketId) => {
        const tid = (ticketId || scanInput).trim().toUpperCase();
        if (!tid) return;
        setScanLoading(true);
        setScanResult(null);
        try {
            const res = await eventsAPI.scanTicket(id, tid);
            setScanResult({ type: 'success', data: res.data.registration });
            setScanInput('');
            // Optimistically update local state
            setRegistrations(prev => prev.map(r =>
                r.ticketId === tid ? { ...r, attended: true, attendedAt: new Date().toISOString() } : r
            ));
        } catch (e) {
            const msg = e.response?.data?.message || 'Scan failed';
            const isDuplicate = /already scanned/i.test(msg);
            setScanResult({ type: isDuplicate ? 'duplicate' : 'error', message: msg, data: e.response?.data?.registration });
        } finally { setScanLoading(false); }
    };

    // ── Scan: file upload → decode QR with jsQR ──────────────────────────────────
    const handleFileUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                import('jsqr').then(({ default: jsQR }) => {
                    const result = jsQR(imageData.data, imageData.width, imageData.height);
                    if (result?.data) {
                        let ticketId = result.data;
                        try { const parsed = JSON.parse(result.data); ticketId = parsed.ticketId || ticketId; } catch { }
                        handleScan(ticketId.trim().toUpperCase());
                    } else {
                        setScanResult({ type: 'error', message: 'No QR code detected in image.' });
                    }
                });
            };
            img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
        e.target.value = ''; // allow same file re-pick
    };

    // ── Manual override attendance ───────────────────────────────────────────────
    const submitOverride = async () => {
        if (!overrideNote.trim()) return;
        setOverrideSaving(true);
        try {
            const res = await eventsAPI.manualMarkAttendance(id, overrideModal.regId, { action: overrideModal.action, note: overrideNote });
            const updated = res.data.registration;
            setRegistrations(prev => prev.map(r => r._id === updated._id ? { ...r, attended: updated.attended, attendedAt: updated.attendedAt, attendanceLog: updated.attendanceLog } : r));
            setMsg({ type: 'success', text: `Attendance ${overrideModal.action === 'mark' ? 'marked' : 'unmarked'} (manual override)` });
            setOverrideModal(null);
            setOverrideNote('');
        } catch (e) {
            setMsg({ type: 'error', text: e.response?.data?.message || 'Override failed' });
        } finally { setOverrideSaving(false); }
    };

    // ── CSV export for attendance ────────────────────────────────────────────────
    const exportAttendanceCSV = () => {
        const eligible = registrations.filter(r => ['Confirmed', 'Approved'].includes(r.status));
        const header = ['Name', 'Email', 'Ticket ID', 'Status', 'Attended', 'Attended At'];
        const rows = eligible.map(r => [
            `${r.participant?.firstName ?? ''} ${r.participant?.lastName ?? ''}`.trim(),
            r.participant?.email ?? '',
            r.ticketId ?? '',
            r.status,
            r.attended ? 'Yes' : 'No',
            r.attendedAt ? new Date(r.attendedAt).toLocaleString('en-IN') : '',
        ]);
        const csv = [header, ...rows].map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
        a.download = `${event?.name || 'event'}-attendance.csv`; a.click();
    };

    const handleStatusChange = async (newStatus) => {
        if (!window.confirm(`Change event status to "${newStatus}"?`)) return;
        setSaving(true);
        setMsg(null);
        try {
            await eventsAPI.updateEvent(id, { status: newStatus });
            reload();
            setMsg({ type: 'success', text: `Status changed to ${newStatus}` });
        } catch (e) {
            setMsg({ type: 'error', text: e.response?.data?.message || 'Status change failed' });
        } finally { setSaving(false); }
    };

    // Published-only editable fields
    const [pubEdit, setPubEdit] = useState({ description: '', registrationDeadline: '', registrationLimit: '' });
    const upPub = (key, val) => setPubEdit(p => ({ ...p, [key]: val }));

    // Sync pubEdit when event loads
    useEffect(() => {
        if (event?.status === 'Published') {
            setPubEdit({
                description: event.description || '',
                registrationDeadline: toLocalDT(event.registrationDeadline),
                registrationLimit: event.registrationLimit || '',
                startDate: toLocalDT(event.startDate),
                endDate: toLocalDT(event.endDate),
            });
        }
    }, [event?.status, event?.description, event?.registrationDeadline, event?.registrationLimit, event?.startDate, event?.endDate]);

    const handleSavePublished = async () => {
        setSaving(true);
        setMsg(null);
        try {
            await eventsAPI.updateEvent(id, {
                description: pubEdit.description,
                registrationDeadline: pubEdit.registrationDeadline,
                registrationLimit: pubEdit.registrationLimit ? Number(pubEdit.registrationLimit) : null,
                startDate: pubEdit.startDate,
                endDate: pubEdit.endDate,
            });
            reload();
            setMsg({ type: 'success', text: 'Event updated.' });
        } catch (e) {
            setMsg({ type: 'error', text: e.response?.data?.message || 'Update failed' });
        } finally { setSaving(false); }
    };

    const handleCloseRegistrations = async () => {
        if (!window.confirm('Close registrations? Participants can no longer register.')) return;
        setSaving(true);
        try {
            await eventsAPI.updateEvent(id, { registrationDeadline: new Date().toISOString() });
            reload();
            setMsg({ type: 'success', text: 'Registrations closed.' });
        } catch (e) {
            setMsg({ type: 'error', text: e.response?.data?.message || 'Error' });
        } finally { setSaving(false); }
    };

    const handleReopenRegistrations = async () => {
        // Reopen by setting deadline 30 days from now (organizer can then edit it in the Manage tab)
        const thirtyDaysOut = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        setSaving(true);
        try {
            await eventsAPI.updateEvent(id, { registrationDeadline: thirtyDaysOut });
            reload();
            setMsg({ type: 'success', text: 'Registrations reopened (deadline set to 30 days from now). Edit the deadline in the Edit tab if needed.' });
        } catch (e) {
            setMsg({ type: 'error', text: e.response?.data?.message || 'Error' });
        } finally { setSaving(false); }
    };

    if (loading) return (
        <div className="min-h-screen bg-background"><Navbar />
            <div className="flex justify-center py-24"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
        </div>
    );

    return (
        <>
            <div className="min-h-screen bg-background">
                <Navbar />
                <div className="mx-auto max-w-6xl px-4 py-8">
                    {/* Header */}
                    <div className="bg-card border border-border rounded-2xl p-6 mb-6">
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                            <div>
                                <h1 className="text-2xl font-bold">{event?.name}</h1>
                                <p className="text-muted-foreground mt-1">{event?.eventType} · {event?.status}</p>
                            </div>
                            <div className="text-right text-sm text-muted-foreground">
                                <p>{event?.registrationCount} registrations</p>
                                <p>₹{event?.revenue} revenue</p>
                            </div>
                        </div>
                    </div>

                    {msg && (
                        <div className={`mb-4 rounded-lg px-4 py-3 text-sm border ${msg.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-destructive/10 text-destructive border-destructive/30'}`}>
                            {msg.text} <button onClick={() => setMsg(null)} className="ml-2 opacity-50 hover:opacity-100">✕</button>
                        </div>
                    )}

                    {/* Disabled account banner */}
                    {!isApproved && (
                        <div className="mb-6 rounded-xl bg-destructive/10 border border-destructive/30 px-5 py-4">
                            <p className="text-destructive font-semibold text-sm mb-0.5">Account Disabled</p>
                            <p className="text-xs text-destructive/80">Your account has been disabled. You can view registrations but cannot make any changes. Contact the admin if you think this is a mistake.</p>
                        </div>
                    )}

                    {/* Tabs */}
                    <div className="flex gap-1 border-b border-border mb-6 flex-wrap items-start">
                        <div className="flex gap-1 flex-1">
                            {[
                                ...(event?.status === 'Draft' && isApproved ? ['edit'] : []),
                                ...(event?.status === 'Published' && isApproved ? ['manage'] : []),
                                'registrations', 'attendance', 'scan'
                            ].map(t => (
                                <button key={t} onClick={() => setTab(t)}
                                    className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px capitalize transition-colors ${tab === t ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}>
                                    {t === 'scan' ? 'QR Scan' : t === 'edit' ? 'Edit Draft' : t === 'manage' ? 'Edit' : t.charAt(0).toUpperCase() + t.slice(1)}
                                </button>
                            ))}
                        </div>
                        {/* Status action buttons — depend on eventType + status */}
                        {event?.status === 'Draft' && isApproved && (
                            <button onClick={() => { if (window.confirm('Cancel this draft event?')) handleStatusChange('Cancelled'); }} disabled={saving}
                                className="mb-1 rounded-lg border border-destructive/50 text-destructive px-3 py-1.5 text-xs font-medium hover:bg-destructive/10 disabled:opacity-50">
                                Cancel Event
                            </button>
                        )}
                        {event?.status === 'Published' && isApproved && (
                            <div className="flex gap-2 mb-1 flex-wrap">
                                {/* Normal events can go Ongoing; Merch events go straight to Completed */}
                                {event.eventType === 'Normal' && (
                                    <button onClick={() => handleStatusChange('Ongoing')} disabled={saving}
                                        className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50">
                                        Mark Ongoing
                                    </button>
                                )}
                                {event.eventType === 'Merchandise' && (
                                    <button onClick={() => handleStatusChange('Completed')} disabled={saving}
                                        className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50">
                                        Mark Completed
                                    </button>
                                )}
                                {/* Reopen registrations if deadline has passed (#7) */}
                                {new Date(event.registrationDeadline) < new Date() && (
                                    <button onClick={handleReopenRegistrations} disabled={saving}
                                        className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50">
                                        Reopen Registrations
                                    </button>
                                )}
                                <button onClick={() => { if (window.confirm('Cancel this published event? Participants may need to be notified.')) handleStatusChange('Cancelled'); }} disabled={saving}
                                    className="rounded-lg border border-destructive/50 text-destructive px-3 py-1.5 text-xs font-medium hover:bg-destructive/10 disabled:opacity-50">
                                    Cancel Event
                                </button>
                            </div>
                        )}
                        {event?.status === 'Ongoing' && isApproved && (
                            <div className="flex gap-2 mb-1 flex-wrap">
                                <button onClick={() => handleStatusChange('Completed')} disabled={saving}
                                    className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50">
                                    Mark Completed
                                </button>
                                <button onClick={() => { if (window.confirm('Revert to Published?')) handleStatusChange('Published'); }} disabled={saving}
                                    className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50">
                                    ↩ Undo Ongoing
                                </button>
                            </div>
                        )}
                        {event?.status === 'Completed' && (
                            <button onClick={() => { if (window.confirm('Revert to Ongoing?')) handleStatusChange('Ongoing'); }} disabled={saving}
                                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50 mb-1">
                                ↩ Undo Completed
                            </button>
                        )}
                        {event?.status === 'Cancelled' && (
                            <button onClick={() => { if (window.confirm('Restore this event to Published?')) handleStatusChange('Published'); }} disabled={saving}
                                className="rounded-lg border border-primary/50 text-primary px-3 py-1.5 text-xs font-medium hover:bg-primary/10 disabled:opacity-50 mb-1">
                                ↩ Restore Event
                            </button>
                        )}
                    </div>

                    {/* Edit Tab — only for Draft events */}
                    {tab === 'edit' && editData && (
                        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
                            {event.registrationCount > 0 && (
                                <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 px-4 py-3 text-sm text-amber-600">
                                    This event already has <strong>{event.registrationCount}</strong> registration(s). The form is locked and cannot be edited. You can only publish or cancel the event.
                                </div>
                            )}
                            {event.registrationCount === 0 && (
                                <p className="text-sm text-muted-foreground">Edit your draft event. Changes are only visible after publishing.</p>
                            )}
                            <fieldset disabled={event.registrationCount > 0} className="space-y-4 disabled:opacity-50">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <label className="block text-sm font-medium mb-1.5">Event Name *</label>
                                        <input value={editData.name} onChange={e => upEdit('name', e.target.value)}
                                            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-sm font-medium mb-1.5">Description *</label>
                                        <textarea rows={4} value={editData.description} onChange={e => upEdit('description', e.target.value)}
                                            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1.5">Registration Deadline *</label>
                                        <input type="datetime-local" value={editData.registrationDeadline} onChange={e => upEdit('registrationDeadline', e.target.value)}
                                            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1.5">Start Date *</label>
                                        <input type="datetime-local" value={editData.startDate} onChange={e => upEdit('startDate', e.target.value)}
                                            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1.5">End Date *</label>
                                        <input type="datetime-local" value={editData.endDate} onChange={e => upEdit('endDate', e.target.value)}
                                            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1.5">Eligibility</label>
                                        <select value={editData.eligibility} onChange={e => upEdit('eligibility', e.target.value)}
                                            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                                            <option>All</option>
                                            <option>IIIT Only</option>
                                            <option>Non-IIIT Only</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1.5">Registration Limit</label>
                                        <input type="number" placeholder="Unlimited" value={editData.registrationLimit} onChange={e => upEdit('registrationLimit', e.target.value)}
                                            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1.5">Registration Fee (₹)</label>
                                        <input type="number" min="0" value={editData.registrationFee} onChange={e => upEdit('registrationFee', e.target.value)}
                                            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-sm font-medium mb-1.5">Tags <span className="text-xs text-muted-foreground">(comma-separated)</span></label>
                                        <input value={editData.tags} onChange={e => upEdit('tags', e.target.value)} placeholder="hackathon, gaming"
                                            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                                    </div>
                                </div>

                                {/* Form Fields builder — Normal events */}
                                {editData.eventType === 'Normal' && (
                                    <div className="border-t border-border pt-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <h3 className="text-sm font-semibold">Registration Form Fields</h3>
                                            <button type="button" onClick={() => setEditFormFields(p => [...p, { _key: `ff-${Date.now()}`, label: '', type: 'text', required: false, options: [] }])}
                                                className="rounded-lg border border-primary text-primary px-3 py-1.5 text-xs font-medium hover:bg-primary/5">+ Add Field</button>
                                        </div>
                                        <div className="space-y-3">
                                            {editFormFields.map((field, i) => (
                                                <div key={field._key} className="border border-border rounded-xl p-4">
                                                    <div className="flex gap-2 mb-2">
                                                        <div className="flex flex-col gap-0.5">
                                                            <button type="button" onClick={() => { const a = [...editFormFields]; if (i > 0) { [a[i - 1], a[i]] = [a[i], a[i - 1]]; setEditFormFields(a); } }} disabled={i === 0} className="text-xs px-1.5 py-1 rounded bg-muted hover:bg-muted/80 disabled:opacity-30">▲</button>
                                                            <button type="button" onClick={() => { const a = [...editFormFields]; if (i < a.length - 1) { [a[i], a[i + 1]] = [a[i + 1], a[i]]; setEditFormFields(a); } }} disabled={i === editFormFields.length - 1} className="text-xs px-1.5 py-1 rounded bg-muted hover:bg-muted/80 disabled:opacity-30">▼</button>
                                                        </div>
                                                        <input placeholder="Field label" value={field.label}
                                                            onChange={e => setEditFormFields(p => p.map((f, j) => j === i ? { ...f, label: e.target.value } : f))}
                                                            className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                                                        <select value={field.type}
                                                            onChange={e => setEditFormFields(p => p.map((f, j) => j === i ? { ...f, type: e.target.value } : f))}
                                                            className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                                                            {['text', 'textarea', 'dropdown', 'checkbox', 'file'].map(t => <option key={t}>{t}</option>)}
                                                        </select>
                                                        <label className="flex items-center gap-1.5 text-sm whitespace-nowrap">
                                                            <input type="checkbox" checked={field.required}
                                                                onChange={e => setEditFormFields(p => p.map((f, j) => j === i ? { ...f, required: e.target.checked } : f))} />
                                                            Required
                                                        </label>
                                                        <button type="button" onClick={() => setEditFormFields(p => p.filter((_, j) => j !== i))} className="text-destructive hover:opacity-70 px-1">✕</button>
                                                    </div>
                                                    {field.type === 'dropdown' && (
                                                        <input placeholder="Options (comma-separated)"
                                                            value={field.options?.join(',') || ''}
                                                            onChange={e => setEditFormFields(p => p.map((f, j) => j === i ? { ...f, options: e.target.value.split(',').map(o => o.trim()) } : f))}
                                                            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                                                    )}
                                                </div>
                                            ))}
                                            {editFormFields.length === 0 && (
                                                <p className="text-center text-muted-foreground py-4 text-sm">No custom fields. Participants register with basic info only.</p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Variant builder — Merchandise events */}
                                {editData.eventType === 'Merchandise' && (
                                    <div className="border-t border-border pt-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <h3 className="text-sm font-semibold">Merchandise Variants</h3>
                                            <button type="button" onClick={() => setEditVariants(p => [...p, { _key: `vr-${Date.now()}`, name: '', stock: 0, price: 0 }])}
                                                className="rounded-lg border border-primary text-primary px-3 py-1.5 text-xs font-medium hover:bg-primary/5">+ Add Variant</button>
                                        </div>
                                        <div className="space-y-3">
                                            {editVariants.map((v, i) => (
                                                <div key={v._key} className="grid grid-cols-3 gap-3 items-end border border-border rounded-xl p-4">
                                                    <div>
                                                        <label className="block text-xs text-muted-foreground mb-1">Variant Name</label>
                                                        <input value={v.name} onChange={e => setEditVariants(p => p.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} placeholder="e.g. S / Black"
                                                            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs text-muted-foreground mb-1">Stock</label>
                                                        <input type="number" min="0" value={v.stock} onChange={e => setEditVariants(p => p.map((x, j) => j === i ? { ...x, stock: Number(e.target.value) } : x))}
                                                            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <div className="flex-1">
                                                            <label className="block text-xs text-muted-foreground mb-1">Price (₹)</label>
                                                            <input type="number" min="0" value={v.price} onChange={e => setEditVariants(p => p.map((x, j) => j === i ? { ...x, price: Number(e.target.value) } : x))}
                                                                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                                                        </div>
                                                        {editVariants.length > 1 && (
                                                            <button type="button" onClick={() => setEditVariants(p => p.filter((_, j) => j !== i))} className="self-end pb-2 text-destructive hover:opacity-70">✕</button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </fieldset>
                            <div className="flex gap-3 pt-2">
                                <button onClick={() => handleSaveEdit(false)} disabled={saving || event.registrationCount > 0}
                                    className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                                    title={event.registrationCount > 0 ? 'Form is locked — publish or cancel the event' : ''}>
                                    {saving ? 'Saving…' : 'Save Draft'}
                                </button>
                                <button onClick={() => handleSaveEdit(true)} disabled={saving}
                                    className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50">
                                    {saving ? 'Publishing…' : 'Save & Publish'}
                                </button>
                            </div>
                        </div>
                    )}
                    {/* Manage Tab — only for Published events */}
                    {tab === 'manage' && (
                        <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
                            {event.registrationCount > 0 && (
                                <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 px-4 py-3 text-sm text-amber-600">
                                    <strong>{event.registrationCount}</strong> registration(s) received. Description and dates are locked — only the registration deadline and limit can be adjusted.
                                </div>
                            )}
                            <div className="space-y-4">
                                <fieldset disabled={event.registrationCount > 0} className="disabled:opacity-50 disabled:pointer-events-none">
                                    <div>
                                        <label className="block text-sm font-medium mb-1.5">Description</label>
                                        <textarea rows={5} value={pubEdit.description} onChange={e => upPub('description', e.target.value)}
                                            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 mt-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-1.5">Start Date</label>
                                            <input type="datetime-local" value={pubEdit.startDate} onChange={e => upPub('startDate', e.target.value)}
                                                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1.5">End Date</label>
                                            <input type="datetime-local" value={pubEdit.endDate} onChange={e => upPub('endDate', e.target.value)}
                                                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                                        </div>
                                    </div>
                                </fieldset>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1.5">Registration Deadline</label>
                                        <input type="datetime-local" value={pubEdit.registrationDeadline} onChange={e => upPub('registrationDeadline', e.target.value)}
                                            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1.5">Registration Limit</label>
                                        <input type="number" placeholder="Unlimited" value={pubEdit.registrationLimit} onChange={e => upPub('registrationLimit', e.target.value)}
                                            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-3 pt-1">
                                <button onClick={handleSavePublished} disabled={saving}
                                    className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50">
                                    {saving ? 'Saving…' : 'Save Changes'}
                                </button>
                                <button onClick={handleCloseRegistrations} disabled={saving}
                                    className="rounded-lg border border-destructive/50 text-destructive px-5 py-2.5 text-sm font-medium hover:bg-destructive/10 disabled:opacity-50">
                                    Close Registrations Now
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Registrations Tab */}
                    {tab === 'registrations' && (() => {
                        // Derived filtered list
                        const filtered = registrations.filter(r => {
                            const name = `${r.participant?.firstName ?? ''} ${r.participant?.lastName ?? ''}`.toLowerCase();
                            const email = (r.participant?.email ?? '').toLowerCase();
                            const q = regSearch.toLowerCase();
                            const matchesSearch = !q || name.includes(q) || email.includes(q);
                            const matchesStatus = regStatusFilter === 'All' || r.status === regStatusFilter;
                            return matchesSearch && matchesStatus;
                        });

                        const exportCSV = () => {
                            const header = ['Name', 'Email', 'Reg Date', 'Payment (₹)', 'Status', 'Attended', 'Ticket ID'];
                            const rows = registrations.map(r => {
                                return [
                                    `${r.participant?.firstName ?? ''} ${r.participant?.lastName ?? ''}`.trim(),
                                    r.participant?.email ?? '',
                                    r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '',
                                    r.amountPaid ?? 0,
                                    r.status,
                                    r.attended ? 'Yes' : 'No',
                                    r.ticketId ?? '',
                                ];
                            });
                            const csv = [header, ...rows]
                                .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
                                .join('\n');
                            const blob = new Blob([csv], { type: 'text/csv' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `${event?.name ?? 'registrations'}-registrations.csv`;
                            a.click();
                            URL.revokeObjectURL(url);
                        };

                        return (
                            <div className="space-y-4">
                                {/* Toolbar */}
                                <div className="flex flex-wrap gap-3 items-center justify-between">
                                    <div className="flex gap-2 flex-1 flex-wrap">
                                        <input
                                            type="text"
                                            placeholder="Search by name or email…"
                                            value={regSearch}
                                            onChange={e => setRegSearch(e.target.value)}
                                            className="flex-1 min-w-48 rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                        />
                                        <select
                                            value={regStatusFilter}
                                            onChange={e => setRegStatusFilter(e.target.value)}
                                            className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                        >
                                            {['All', 'Confirmed', 'Pending', 'Approved', 'Rejected', 'Cancelled'].map(s => (
                                                <option key={s}>{s}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <button onClick={exportCSV}
                                        className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted flex items-center gap-1.5">
                                        ⬇ Export CSV
                                    </button>
                                </div>

                                {/* Table */}
                                <div className="overflow-x-auto rounded-xl border border-border">
                                    <table className="w-full text-sm">
                                        <thead className="bg-muted/50 text-muted-foreground">
                                            <tr>
                                                <th className="px-4 py-3 text-left font-medium">Name</th>
                                                <th className="px-4 py-3 text-left font-medium">Email</th>
                                                <th className="px-4 py-3 text-left font-medium">Reg Date</th>
                                                <th className="px-4 py-3 text-left font-medium">Payment</th>
                                                <th className="px-4 py-3 text-left font-medium">Status</th>
                                                <th className="px-4 py-3 text-left font-medium">Attendance</th>
                                                <th className="px-4 py-3 text-left font-medium">Ticket ID</th>
                                                {(event?.eventType === 'Merchandise' || event?.registrationFee > 0) && <th className="px-4 py-3 text-left font-medium">Actions</th>}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {filtered.length === 0 && (
                                                <tr><td colSpan={8} className="text-center py-8 text-muted-foreground text-sm">No registrations found.</td></tr>
                                            )}
                                            {filtered.map(r => {
                                                return (
                                                    <tr key={r._id} className="hover:bg-muted/30">
                                                        <td className="px-4 py-3 font-medium whitespace-nowrap">
                                                            {r.participant?.firstName} {r.participant?.lastName}
                                                        </td>
                                                        <td className="px-4 py-3 text-muted-foreground">{r.participant?.email}</td>
                                                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                                                            {r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            {r.amountPaid > 0
                                                                ? `₹${r.amountPaid}`
                                                                : event?.registrationFee > 0
                                                                    ? <span>₹{event.registrationFee}{r.status === 'Pending' && <span className="text-xs text-muted-foreground"> (pending)</span>}</span>
                                                                    : 'Free'
                                                            }
                                                            {r.paymentProofUrl && r.status === 'Pending' && (
                                                                <a href={r.paymentProofUrl} target="_blank" rel="noreferrer"
                                                                    className="ml-2 text-primary text-xs hover:underline">Proof</a>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_PILL[r.status] || 'bg-muted text-muted-foreground'}`}>
                                                                {r.status}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            {r.attended
                                                                ? <span className="text-xs font-medium text-green-600">✓ {r.attendedAt ? new Date(r.attendedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'Attended'}</span>
                                                                : <span className="text-xs text-muted-foreground">—</span>
                                                            }
                                                        </td>
                                                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{r.ticketId ?? '—'}</td>
                                                        {(event?.eventType === 'Merchandise' || event?.registrationFee > 0) && (
                                                            <td className="px-4 py-3 flex gap-2">
                                                                {r.status === 'Pending' && (
                                                                    <>
                                                                        <button onClick={() => approvePayment(r._id, 'approve')} className="text-green-600 text-xs hover:underline">Approve</button>
                                                                        <button onClick={() => approvePayment(r._id, 'reject')} className="text-red-600 text-xs hover:underline">Reject</button>
                                                                    </>
                                                                )}
                                                            </td>
                                                        )}
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                                <p className="text-xs text-muted-foreground">{filtered.length} of {registrations.length} registration(s)</p>
                            </div>
                        );
                    })()}

                    {/* Attendance Tab */}
                    {tab === 'attendance' && (() => {
                        const eligible = registrations.filter(r => ['Confirmed', 'Approved'].includes(r.status));
                        const attended = eligible.filter(r => r.attended);
                        const pct = eligible.length ? Math.round((attended.length / eligible.length) * 100) : 0;

                        const filtered = eligible.filter(r => {
                            const name = `${r.participant?.firstName ?? ''} ${r.participant?.lastName ?? ''}`.toLowerCase();
                            const matchSearch = !attSearch || name.includes(attSearch.toLowerCase()) || (r.participant?.email ?? '').toLowerCase().includes(attSearch.toLowerCase());
                            const matchFilter = attFilter === 'All' || (attFilter === 'Present' ? r.attended : !r.attended);
                            return matchSearch && matchFilter;
                        });

                        return (
                            <div className="space-y-4">
                                {/* Stats bar */}
                                <div className="rounded-xl border border-border p-4 bg-muted/30 space-y-2">
                                    <div className="flex justify-between text-sm font-medium">
                                        <span>Attendance Progress</span>
                                        <span>{attended.length} / {eligible.length} checked in ({pct}%)</span>
                                    </div>
                                    <div className="w-full h-2.5 rounded-full bg-muted overflow-hidden">
                                        <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${pct}%` }} />
                                    </div>
                                </div>

                                {/* Toolbar */}
                                <div className="flex flex-wrap gap-3 items-center justify-between">
                                    <div className="flex gap-2 flex-1 flex-wrap">
                                        <input type="text" placeholder="Search by name or email…" value={attSearch}
                                            onChange={e => setAttSearch(e.target.value)}
                                            className="flex-1 min-w-48 rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                                        <select value={attFilter} onChange={e => setAttFilter(e.target.value)}
                                            className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                                            {['All', 'Present', 'Absent'].map(f => <option key={f}>{f}</option>)}
                                        </select>
                                    </div>
                                    <button onClick={exportAttendanceCSV}
                                        className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted flex items-center gap-1.5">⬇ Export CSV</button>
                                </div>

                                {/* Table */}
                                <div className="overflow-x-auto rounded-xl border border-border">
                                    <table className="w-full text-sm">
                                        <thead className="bg-muted/50 text-muted-foreground">
                                            <tr>
                                                <th className="px-4 py-3 text-left font-medium">Participant</th>
                                                <th className="px-4 py-3 text-left font-medium">Ticket ID</th>
                                                <th className="px-4 py-3 text-left font-medium">Status</th>
                                                <th className="px-4 py-3 text-left font-medium">Checked In</th>
                                                <th className="px-4 py-3 text-left font-medium">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {filtered.length === 0 && (
                                                <tr><td colSpan={5} className="text-center py-8 text-muted-foreground text-sm">No participants found.</td></tr>
                                            )}
                                            {filtered.map(r => (
                                                <tr key={r._id} className={`hover:bg-muted/30 ${r.attended ? 'bg-green-500/5' : ''}`}>
                                                    <td className="px-4 py-3 font-medium">
                                                        {r.participant?.firstName} {r.participant?.lastName}
                                                        <div className="text-xs text-muted-foreground">{r.participant?.email}</div>
                                                    </td>
                                                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{r.ticketId ?? '—'}</td>
                                                    <td className="px-4 py-3">
                                                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_PILL[r.status] || ''}`}>{r.status}</span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {r.attended
                                                            ? <span className="text-green-600 text-xs font-medium">✓ {r.attendedAt ? new Date(r.attendedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'Attended'}</span>
                                                            : <span className="text-muted-foreground text-xs">—</span>
                                                        }
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <button
                                                            onClick={() => { setOverrideModal({ regId: r._id, action: r.attended ? 'unmark' : 'mark', name: `${r.participant?.firstName} ${r.participant?.lastName}` }); setOverrideNote(''); }}
                                                            className={`text-xs hover:underline ${r.attended ? 'text-red-500' : 'text-primary'}`}>
                                                            {r.attended ? 'Unmark (override)' : 'Mark attended (override)'}
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <p className="text-xs text-muted-foreground">{filtered.length} of {eligible.length} eligible participant(s)</p>
                            </div>
                        );
                    })()}

                    {/* QR Scan Tab */}
                    {tab === 'scan' && (
                        <div className="max-w-lg mx-auto space-y-6">
                            {/* File upload */}
                            <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
                                <h2 className="text-base font-semibold">Upload QR Image</h2>
                                <p className="text-sm text-muted-foreground">Take a photo / screenshot of the participant's QR ticket and upload it here.</p>
                                <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border p-8 cursor-pointer hover:bg-muted/30 transition-colors">
                                    <span className="text-sm text-muted-foreground">{scanLoading ? 'Processing…' : 'Click to select QR image'}</span>
                                    <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} disabled={scanLoading} />
                                </label>
                            </div>

                            {/* Manual input */}
                            <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
                                <h2 className="text-base font-semibold">Enter Ticket ID Manually</h2>
                                <div className="flex gap-2">
                                    <input value={scanInput} onChange={e => setScanInput(e.target.value.toUpperCase())}
                                        onKeyDown={e => e.key === 'Enter' && handleScan()}
                                        placeholder="TKT-XXXXX"
                                        className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring" />
                                    <button onClick={() => handleScan()} disabled={scanLoading || !scanInput}
                                        className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50">
                                        {scanLoading ? '…' : 'Confirm'}
                                    </button>
                                </div>
                            </div>

                            {/* Result card */}
                            {scanResult && (
                                <div className={`rounded-2xl border p-5 space-y-1 ${scanResult.type === 'success' ? 'border-green-500 bg-green-500/10' :
                                    scanResult.type === 'duplicate' ? 'border-yellow-500 bg-yellow-500/10' :
                                        'border-red-500 bg-red-500/10'
                                    }`}>
                                    <p className="font-semibold text-sm">
                                        {scanResult.type === 'success' && 'Check-in Successful'}
                                        {scanResult.type === 'duplicate' && 'Already Scanned'}
                                        {scanResult.type === 'error' && 'Scan Failed'}
                                    </p>
                                    {scanResult.data?.participant && (
                                        <>
                                            <p className="text-sm font-medium">{scanResult.data.participant?.firstName} {scanResult.data.participant?.lastName}</p>
                                            <p className="text-xs text-muted-foreground font-mono">{scanResult.data.ticketId}</p>
                                            {scanResult.type === 'duplicate' && scanResult.data.attendedAt && (
                                                <p className="text-xs text-muted-foreground">Scanned at {new Date(scanResult.data.attendedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
                                            )}
                                        </>
                                    )}
                                    {!scanResult.data?.participant && <p className="text-sm text-muted-foreground">{scanResult.message}</p>}
                                    <button onClick={() => setScanResult(null)} className="text-xs text-muted-foreground hover:underline pt-1 block">Dismiss</button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {overrideModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setOverrideModal(null)}>
                    <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-xl" onClick={e => e.stopPropagation()}>
                        <h3 className="text-base font-semibold">
                            {overrideModal.action === 'mark' ? 'Mark as Attended' : 'Unmark Attendance'} — Manual Override
                        </h3>
                        <p className="text-sm text-muted-foreground">Participant: <strong>{overrideModal.name}</strong></p>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">Reason / Note <span className="text-red-500">*</span></label>
                            <textarea
                                value={overrideNote}
                                onChange={e => setOverrideNote(e.target.value)}
                                placeholder="e.g. Badge lost, verified by phone…"
                                rows={3}
                                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                            />
                        </div>
                        <div className="flex gap-2 justify-end">
                            <button onClick={() => setOverrideModal(null)}
                                className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted">Cancel</button>
                            <button onClick={submitOverride} disabled={overrideSaving || !overrideNote.trim()}
                                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50">
                                {overrideSaving ? 'Saving…' : 'Confirm Override'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

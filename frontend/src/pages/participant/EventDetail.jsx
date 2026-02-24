import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import { eventsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function EventDetailPage() {
    const { id } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();

    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState(null);
    const [formData, setFormData] = useState({});
    const [selectedVariant, setSelectedVariant] = useState('');

    // After a successful purchase, hold the created registration so we can upload proof
    const [pendingRegistration, setPendingRegistration] = useState(null);
    const [proofUrl, setProofUrl] = useState('');
    const [proofSubmitting, setProofSubmitting] = useState(false);

    useEffect(() => {
        eventsAPI.getEventById(id)
            .then(res => setEvent(res.data.event))
            .catch(() => navigate('/events'))
            .finally(() => setLoading(false));
    }, [id, navigate]);

    if (loading) return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <div className="flex justify-center py-24"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
        </div>
    );

    if (!event) return null;

    const now = new Date();
    const deadlinePassed = now > new Date(event.registrationDeadline);
    const isFull = event.registrationLimit && event.registrationCount >= event.registrationLimit;
    const canAct = !deadlinePassed && !isFull && ['Published', 'Ongoing'].includes(event.status);

    const handleRegister = async () => {
        // Client-side required field validation
        const missing = (event.formFields || [])
            .filter(f => f.required && !formData[f._id]?.toString().trim())
            .map(f => f.label);

        if (missing.length > 0) {
            setMessage({ type: 'error', text: `Please fill in the required fields: ${missing.join(', ')}` });
            return;
        }

        setSubmitting(true);
        setMessage(null);
        try {
            const res = await eventsAPI.register(id, { formResponses: Object.entries(formData).map(([fieldId, response]) => ({ fieldId, response })) });
            const isPaid = event.registrationFee > 0;
            if (isPaid) {
                setPendingRegistration(res.data.registration);
                setMessage({ type: 'success', text: 'Registered! Please upload your payment proof below to confirm your spot.' });
            } else {
                setMessage({ type: 'success', text: 'Registered successfully! Check your email for your ticket.' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Registration failed' });
        } finally {
            setSubmitting(false);
        }
    };

    const handlePurchase = async () => {
        if (!selectedVariant) return setMessage({ type: 'error', text: 'Please select a variant' });
        setSubmitting(true);
        setMessage(null);
        try {
            const res = await eventsAPI.purchase(id, { variantId: selectedVariant, quantity: 1 });
            setPendingRegistration(res.data.registration);
            setMessage({ type: 'success', text: 'Order placed! Now submit your payment proof below to complete your purchase.' });
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Purchase failed' });
        } finally {
            setSubmitting(false);
        }
    };

    const handleUploadProof = async () => {
        if (!proofUrl.trim()) return;
        setProofSubmitting(true);
        try {
            await eventsAPI.uploadPayment(id, pendingRegistration._id, { paymentProofUrl: proofUrl.trim() });
            setMessage({ type: 'success', text: 'Payment proof submitted! The organizer will review and confirm your order.' });
            setPendingRegistration(null);
            setProofUrl('');
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to upload proof' });
        } finally {
            setProofSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <div className="mx-auto max-w-4xl px-4 py-8">
                {/* Header */}
                <div className="bg-card border border-border rounded-2xl p-8 mb-6">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-sm bg-primary/10 text-primary px-2.5 py-1 rounded-full font-medium">{event.eventType}</span>
                                <span className="text-sm bg-muted text-muted-foreground px-2.5 py-1 rounded-full">{event.status}</span>
                            </div>
                            <h1 className="text-3xl font-bold">{event.name}</h1>
                            <p className="mt-1 text-muted-foreground">{event.organizer?.organizerName}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-2xl font-bold">{event.registrationFee > 0 ? `₹${event.registrationFee}` : 'Free'}</p>
                        </div>
                    </div>

                    <p className="mt-5 text-muted-foreground leading-relaxed">{event.description}</p>

                    <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                        {[
                            { label: 'Starts', value: new Date(event.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) },
                            { label: 'Ends', value: new Date(event.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) },
                            { label: 'Deadline', value: new Date(event.registrationDeadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) },
                            { label: 'Eligibility', value: event.eligibility },
                        ].map(({ label, value }) => (
                            <div key={label} className="bg-muted/50 rounded-xl p-3">
                                <p className="text-xs text-muted-foreground">{label}</p>
                                <p className="font-semibold mt-0.5">{value}</p>
                            </div>
                        ))}
                    </div>

                    {event.tags?.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-2">
                            {event.tags.map(tag => (
                                <span key={tag} className="text-xs bg-muted px-2.5 py-1 rounded-full text-muted-foreground">#{tag}</span>
                            ))}
                        </div>
                    )}
                </div>

                {/* Registration / Purchase section */}
                {user?.role === 'participant' && (
                    <div className="bg-card border border-border rounded-2xl p-6">
                        <h2 className="text-xl font-semibold mb-4">
                            {event.eventType === 'Normal' ? 'Register for this event' : 'Purchase merchandise'}
                        </h2>

                        {message && (
                            <div className={`mb-4 rounded-lg px-4 py-3 text-sm ${message.type === 'success' ? 'bg-[var(--success)]/10 text-[var(--success)] border border-[var(--success)]/30' : 'bg-destructive/10 text-destructive border border-destructive/30'}`}>
                                {message.text}
                            </div>
                        )}

                        {deadlinePassed && <p className="text-amber-500 bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-3 text-sm mb-4">Registration deadline has passed.</p>}
                        {isFull && <p className="text-amber-500 bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-3 text-sm mb-4">Registration limit reached.</p>}

                        {canAct && event.eventType === 'Normal' && (
                            <>
                                {/* Dynamic form fields */}
                                {event.formFields?.length > 0 && (
                                    <div className="space-y-4 mb-6">
                                        {event.formFields.sort((a, b) => a.order - b.order).map(field => (
                                            <div key={field._id}>
                                                <label className="block text-sm font-medium mb-1.5">
                                                    {field.label}{field.required && <span className="text-destructive ml-1">*</span>}
                                                </label>
                                                {field.type === 'textarea' ? (
                                                    <textarea rows={3} onChange={e => setFormData(p => ({ ...p, [field._id]: e.target.value }))}
                                                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                                                ) : field.type === 'dropdown' ? (
                                                    <select onChange={e => setFormData(p => ({ ...p, [field._id]: e.target.value }))}
                                                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                                                        <option value="">Select…</option>
                                                        {field.options.map(o => <option key={o}>{o}</option>)}
                                                    </select>
                                                ) : field.type === 'checkbox' ? (
                                                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                                                        <input type="checkbox"
                                                            onChange={e => setFormData(p => ({ ...p, [field._id]: e.target.checked }))}
                                                            className="h-4 w-4 rounded border-input accent-primary" />
                                                        <span className="text-muted-foreground">Check to confirm</span>
                                                    </label>
                                                ) : field.type === 'file' ? (
                                                    <input type="url" placeholder="Paste a file link (e.g. Google Drive URL)"
                                                        onChange={e => setFormData(p => ({ ...p, [field._id]: e.target.value }))}
                                                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                                                ) : (
                                                    <input type="text" onChange={e => setFormData(p => ({ ...p, [field._id]: e.target.value }))}
                                                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <button onClick={handleRegister} disabled={submitting}
                                    className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50">
                                    {submitting ? 'Registering…' : 'Register now'}
                                </button>
                            </>
                        )}

                        {canAct && event.eventType === 'Merchandise' && !pendingRegistration && (
                            <>
                                <div className="mb-5">
                                    <label className="block text-sm font-medium mb-2">Select variant</label>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                        {event.variants?.map(v => (
                                            <button key={v._id} onClick={() => setSelectedVariant(v._id)}
                                                disabled={v.stock === 0}
                                                className={`rounded-xl border p-3 text-left transition-colors ${v.stock === 0 ? 'opacity-40 cursor-not-allowed border-border' : selectedVariant === v._id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}>
                                                <p className="text-sm font-medium">{v.name}</p>
                                                <p className="text-xs text-muted-foreground">₹{v.price} · {v.stock > 0 ? `${v.stock} left` : 'Out of stock'}</p>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <button onClick={handlePurchase} disabled={submitting || !selectedVariant}
                                    className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50">
                                    {submitting ? 'Processing…' : 'Purchase'}
                                </button>
                            </>
                        )}

                        {/* Payment proof upload — shown right after purchase */}
                        {pendingRegistration && (
                            <div className="border border-border rounded-xl p-5 mt-2 space-y-3">
                                <div>
                                    <p className="text-sm font-semibold mb-1">Submit Payment Proof</p>
                                    <p className="text-xs text-muted-foreground">
                                        Transfer ₹{pendingRegistration.amountPaid} and share a screenshot link (Google Drive, Imgur, etc.)
                                        or a UPI transaction ID/reference URL.
                                    </p>
                                </div>
                                <p className="text-xs font-mono text-muted-foreground">
                                    Order ID: {pendingRegistration.ticketId}
                                </p>
                                <div className="flex gap-2">
                                    <input
                                        type="url"
                                        value={proofUrl}
                                        onChange={e => setProofUrl(e.target.value)}
                                        placeholder="https://drive.google.com/..."
                                        className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                    />
                                    <button
                                        onClick={handleUploadProof}
                                        disabled={proofSubmitting || !proofUrl.trim()}
                                        className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50 whitespace-nowrap">
                                        {proofSubmitting ? 'Submitting…' : 'Submit proof'}
                                    </button>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

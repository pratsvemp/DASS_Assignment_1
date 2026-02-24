import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import { eventsAPI, organizerAPI } from '../../services/api';

const BLANK_FIELD = { label: '', type: 'text', options: [], required: false };
const BLANK_VARIANT = { name: '', stock: 0, price: 0 };

export default function CreateEventPage() {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);   // 1 = details, 2 = form builder / variants
    const [formData, setFormData] = useState({
        name: '', description: '', eventType: 'Normal',
        registrationDeadline: '', startDate: '', endDate: '',
        eligibility: 'All', registrationLimit: '', registrationFee: 0,
        tags: '', purchaseLimitPerParticipant: 1,
    });
    const [formFields, setFormFields] = useState([]);
    const [variants, setVariants] = useState([{ ...BLANK_VARIANT }]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [isApproved, setIsApproved] = useState(true);

    useEffect(() => {
        organizerAPI.getProfile().then(res => {
            if (res.data.organizer?.isApproved === false) setIsApproved(false);
        }).catch(() => { });
    }, []);

    const update = (key, val) => setFormData(p => ({ ...p, [key]: val }));

    // ── Step 1: basic details ───────────────────────────────────────────────────
    const step1Valid = formData.name && formData.description && formData.registrationDeadline && formData.startDate && formData.endDate;

    // ── Form field helpers ──────────────────────────────────────────────────────
    const addField = () => setFormFields(f => [...f, { ...BLANK_FIELD, _key: Date.now() }]);
    const removeField = (i) => setFormFields(f => f.filter((_, idx) => idx !== i));
    const updateField = (i, key, val) => setFormFields(f => f.map((field, idx) => idx === i ? { ...field, [key]: val } : field));
    const moveField = (i, dir) => setFormFields(f => {
        const arr = [...f];
        const j = i + dir;
        if (j < 0 || j >= arr.length) return arr;
        [arr[i], arr[j]] = [arr[j], arr[i]];
        return arr;
    });

    // ── Variant helpers ─────────────────────────────────────────────────────────
    const addVariant = () => setVariants(v => [...v, { ...BLANK_VARIANT }]);
    const removeVariant = (i) => setVariants(v => v.filter((_, idx) => idx !== i));
    const updateVariant = (i, key, val) => setVariants(v => v.map((vr, idx) => idx === i ? { ...vr, [key]: val } : vr));

    const handleCreate = async (publish = false) => {
        setLoading(true);
        setError('');
        try {
            const payload = {
                ...formData,
                tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
                registrationLimit: formData.registrationLimit ? Number(formData.registrationLimit) : null,
                registrationFee: Number(formData.registrationFee || 0),
                formFields: formData.eventType === 'Normal' ? formFields : [],
                variants: formData.eventType === 'Merchandise' ? variants : [],
                purchaseLimitPerParticipant: formData.eventType === 'Merchandise' ? Number(formData.purchaseLimitPerParticipant || 1) : 1,
            };
            const res = await eventsAPI.createEvent(payload);
            if (publish) await eventsAPI.publishEvent(res.data.event._id);
            navigate('/organizer/dashboard');
        } catch (e) {
            setError(e.response?.data?.message || 'Failed to create event');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <div className="mx-auto max-w-3xl px-4 py-8">
                <h1 className="text-3xl font-bold mb-6">Create Event</h1>

                {!isApproved ? (
                    <div className="rounded-xl bg-destructive/10 border border-destructive/30 px-6 py-8 text-center">
                        <p className="text-destructive font-semibold text-lg mb-2">Account Disabled</p>
                        <p className="text-sm text-destructive/80">Your account has been disabled by the admin. You cannot create new events. If you believe this is a mistake, please contact the admin.</p>
                    </div>
                ) : (
                    <>
                        {error && (
                            <div className="mb-4 rounded-lg bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive">{error}</div>
                        )}

                        {/* Steps */}
                        <div className="flex items-center gap-2 mb-8">
                            {[1, 2].map(s => (
                                <div key={s} className="flex items-center gap-2">
                                    <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold ${step >= s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>{s}</div>
                                    {s < 2 && <div className={`h-0.5 w-12 ${step > s ? 'bg-primary' : 'bg-border'}`} />}
                                </div>
                            ))}
                        </div>

                        {step === 1 && (
                            <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1.5">Event Name *</label>
                                    <input value={formData.name} onChange={e => update('name', e.target.value)}
                                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1.5">Description *</label>
                                    <textarea rows={4} value={formData.description} onChange={e => update('description', e.target.value)}
                                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1.5">Event Type *</label>
                                    <div className="flex gap-3">
                                        {['Normal', 'Merchandise'].map(t => (
                                            <button key={t} type="button" onClick={() => update('eventType', t)}
                                                className={`flex-1 rounded-xl border py-3 text-sm font-medium transition-colors ${formData.eventType === t ? 'border-primary bg-primary/5 text-primary' : 'border-border'}`}>
                                                {t === 'Normal' ? 'Normal Event' : 'Merchandise'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1.5">Registration Deadline *</label>
                                        <input type="datetime-local" value={formData.registrationDeadline} onChange={e => update('registrationDeadline', e.target.value)}
                                            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1.5">Start Date *</label>
                                        <input type="datetime-local" value={formData.startDate} onChange={e => update('startDate', e.target.value)}
                                            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1.5">End Date *</label>
                                        <input type="datetime-local" value={formData.endDate} onChange={e => update('endDate', e.target.value)}
                                            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1.5">Eligibility</label>
                                        <select value={formData.eligibility} onChange={e => update('eligibility', e.target.value)}
                                            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                                            <option>All</option>
                                            <option>IIIT Only</option>
                                            <option>Non-IIIT Only</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1.5">Registration Limit</label>
                                        <input type="number" placeholder="Unlimited" value={formData.registrationLimit} onChange={e => update('registrationLimit', e.target.value)}
                                            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1.5">Registration Fee (₹)</label>
                                        <input type="number" min="0" value={formData.registrationFee} onChange={e => update('registrationFee', e.target.value)}
                                            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1.5">Tags <span className="text-muted-foreground text-xs">(comma-separated)</span></label>
                                    <input value={formData.tags} onChange={e => update('tags', e.target.value)} placeholder="hackathon, gaming, open-source"
                                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                                </div>
                                <button onClick={() => setStep(2)} disabled={!step1Valid}
                                    className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50">
                                    Next →
                                </button>
                            </div>
                        )}

                        {step === 2 && formData.eventType === 'Normal' && (
                            <div className="bg-card border border-border rounded-2xl p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-lg font-semibold">Registration Form Builder</h2>
                                    <button onClick={addField} className="rounded-lg border border-primary text-primary px-3 py-1.5 text-sm font-medium hover:bg-primary/5 transition-colors">+ Add Field</button>
                                </div>
                                <p className="text-sm text-muted-foreground mb-4">Add custom fields for participants to fill out during registration. Once the event has its first registration, the form is locked.</p>
                                <div className="space-y-3">
                                    {formFields.map((field, i) => (
                                        <div key={field._key || i} className="border border-border rounded-xl p-4">
                                            <div className="flex gap-2 mb-3">
                                                {/* Reorder buttons */}
                                                <div className="flex flex-col gap-0.5">
                                                    <button type="button" onClick={() => moveField(i, -1)} disabled={i === 0}
                                                        className="text-xs leading-none px-1.5 py-1 rounded bg-muted hover:bg-muted/80 disabled:opacity-30" title="Move up">▲</button>
                                                    <button type="button" onClick={() => moveField(i, 1)} disabled={i === formFields.length - 1}
                                                        className="text-xs leading-none px-1.5 py-1 rounded bg-muted hover:bg-muted/80 disabled:opacity-30" title="Move down">▼</button>
                                                </div>
                                                <input placeholder="Field label" value={field.label} onChange={e => updateField(i, 'label', e.target.value)}
                                                    className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                                                <select value={field.type} onChange={e => updateField(i, 'type', e.target.value)}
                                                    className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                                                    {['text', 'textarea', 'dropdown', 'checkbox', 'file'].map(t => <option key={t}>{t}</option>)}
                                                </select>
                                                <label className="flex items-center gap-1.5 text-sm whitespace-nowrap">
                                                    <input type="checkbox" checked={field.required} onChange={e => updateField(i, 'required', e.target.checked)} />
                                                    Required
                                                </label>
                                                <button type="button" onClick={() => removeField(i)} className="text-destructive text-sm hover:opacity-70 px-1">✕</button>
                                            </div>
                                            {field.type === 'dropdown' && (
                                                <input placeholder="Options (comma-separated, e.g. Option A, Option B)"
                                                    value={field.options?.join(',') || ''}
                                                    onChange={e => updateField(i, 'options', e.target.value.split(',').map(o => o.trim()))}
                                                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                                            )}
                                            {field.type === 'file' && (
                                                <p className="text-xs text-muted-foreground">Participants will be asked to upload a file URL (e.g. Google Drive link).</p>
                                            )}
                                        </div>
                                    ))}
                                    {formFields.length === 0 && (
                                        <p className="text-center text-muted-foreground py-6 text-sm">No custom fields yet. Participants will still be registered with their basic info.</p>
                                    )}
                                </div>
                                <div className="flex gap-3 mt-6">
                                    <button onClick={() => setStep(1)} className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium hover:bg-muted">← Back</button>
                                    <button onClick={() => handleCreate(false)} disabled={loading} className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium hover:bg-muted">Save as Draft</button>
                                    <button onClick={() => handleCreate(true)} disabled={loading} className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50">
                                        {loading ? 'Creating…' : 'Create & Publish'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {step === 2 && formData.eventType === 'Merchandise' && (
                            <div className="bg-card border border-border rounded-2xl p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-lg font-semibold">Merchandise Variants</h2>
                                    <button onClick={addVariant} className="rounded-lg border border-primary text-primary px-3 py-1.5 text-sm font-medium hover:bg-primary/5 transition-colors">+ Add Variant</button>
                                </div>
                                <div className="space-y-3">
                                    {variants.map((v, i) => (
                                        <div key={i} className="grid grid-cols-3 gap-3 items-end border border-border rounded-xl p-4">
                                            <div>
                                                <label className="block text-xs text-muted-foreground mb-1">Variant Name</label>
                                                <input value={v.name} onChange={e => updateVariant(i, 'name', e.target.value)} placeholder="e.g. S / Black"
                                                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-muted-foreground mb-1">Stock</label>
                                                <input type="number" min="0" value={v.stock} onChange={e => updateVariant(i, 'stock', Number(e.target.value))}
                                                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                                            </div>
                                            <div className="flex gap-2">
                                                <div className="flex-1">
                                                    <label className="block text-xs text-muted-foreground mb-1">Price (&#8377;)</label>
                                                    <input type="number" min="0" value={v.price} onChange={e => updateVariant(i, 'price', Number(e.target.value))}
                                                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                                                </div>
                                                {variants.length > 1 && (
                                                    <button onClick={() => removeVariant(i)} className="self-end pb-2 text-destructive text-sm hover:opacity-70">&#x2715;</button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-4 flex items-center gap-3">
                                    <label className="text-sm font-medium whitespace-nowrap">Purchase Limit Per Participant</label>
                                    <input type="number" min="1" value={formData.purchaseLimitPerParticipant}
                                        onChange={e => update('purchaseLimitPerParticipant', e.target.value)}
                                        className="w-24 rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                                    <span className="text-xs text-muted-foreground">item(s) max per person</span>
                                </div>
                                <div className="flex gap-3 mt-6">
                                    <button onClick={() => setStep(1)} className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium hover:bg-muted">&#8592; Back</button>
                                    <button onClick={() => handleCreate(false)} disabled={loading} className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium hover:bg-muted">Save as Draft</button>
                                    <button onClick={() => handleCreate(true)} disabled={loading} className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50">
                                        {loading ? 'Creating…' : 'Create & Publish'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

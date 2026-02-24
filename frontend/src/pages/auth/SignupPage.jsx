import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../services/api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';

// hCaptcha test site key — works without a real account in dev
const HCAPTCHA_SITE_KEY = '10000000-ffff-ffff-ffff-000000000001';

const selectCls = 'w-full pixel-font text-xs bg-background text-foreground p-2 shadow-[var(--pixel-box-shadow)] box-shadow-margin outline-none border-none';

export default function SignupPage() {
    const { register, handleSubmit, watch, formState: { errors } } = useForm();
    const { login } = useAuth();
    const navigate = useNavigate();
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [captchaToken, setCaptchaToken] = useState('');
    const captchaRef = useRef(null);

    const participantType = watch('participantType');

    const onSubmit = async (data) => {
        setLoading(true);
        setError('');
        try {
            const res = await authAPI.signup({ ...data, captchaToken });
            login(res.data.token, res.data.user);
            navigate('/onboarding', { replace: true });
        } catch (err) {
            setError(err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || 'Signup failed.');
            captchaRef.current?.resetCaptcha();
            setCaptchaToken('');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
            <div className="w-full max-w-lg">
                <div className="text-center mb-8">
                    <h1 className="pixel-font text-2xl font-bold tracking-tight text-foreground">FELICITY</h1>
                    <p className="mt-3 text-sm text-muted-foreground">Create your participant account</p>
                </div>

                <Card>
                    <CardHeader><CardTitle>Sign up</CardTitle></CardHeader>
                    <CardContent className="space-y-5">
                        {error && (
                            <div className="border-l-4 border-destructive bg-destructive/10 px-4 py-3 text-xs text-destructive pixel-font">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium mb-2 uppercase tracking-wider">First Name</label>
                                    <Input {...register('firstName', { required: 'Required' })} placeholder="John" />
                                    {errors.firstName && <p className="mt-1 text-xs text-destructive">{errors.firstName.message}</p>}
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-2 uppercase tracking-wider">Last Name</label>
                                    <Input {...register('lastName', { required: 'Required' })} placeholder="Doe" />
                                    {errors.lastName && <p className="mt-1 text-xs text-destructive">{errors.lastName.message}</p>}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium mb-2 uppercase tracking-wider">Participant Type</label>
                                <select {...register('participantType', { required: 'Select type' })} className={selectCls}>
                                    <option value="">Select…</option>
                                    <option value="IIIT">IIIT Student</option>
                                    <option value="Non-IIIT">Non-IIIT Participant</option>
                                </select>
                                {errors.participantType && <p className="mt-1 text-xs text-destructive">{errors.participantType.message}</p>}
                            </div>

                            <div>
                                <label className="block text-xs font-medium mb-2 uppercase tracking-wider">Email</label>
                                <Input
                                    type="email"
                                    {...register('email', {
                                        required: 'Email is required',
                                        validate: (v) => participantType !== 'IIIT' || v.endsWith('@students.iiit.ac.in')
                                            ? true : 'IIIT students must use @students.iiit.ac.in'
                                    })}
                                    placeholder={participantType === 'IIIT' ? 'you@students.iiit.ac.in' : 'you@example.com'}
                                />
                                {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>}
                            </div>

                            <div>
                                <label className="block text-xs font-medium mb-2 uppercase tracking-wider">Password</label>
                                <Input type="password"
                                    {...register('password', { required: 'Required', minLength: { value: 6, message: 'At least 6 chars' } })}
                                    placeholder="••••••••" />
                                {errors.password && <p className="mt-1 text-xs text-destructive">{errors.password.message}</p>}
                            </div>

                            <div>
                                <label className="block text-xs font-medium mb-2 uppercase tracking-wider">College / Organization</label>
                                <Input {...register('college', { required: 'Required' })} placeholder="IIIT Hyderabad" />
                                {errors.college && <p className="mt-1 text-xs text-destructive">{errors.college.message}</p>}
                            </div>

                            <div>
                                <label className="block text-xs font-medium mb-2 uppercase tracking-wider">Contact Number</label>
                                <Input
                                    {...register('contactNumber', { required: 'Required', pattern: { value: /^[0-9]{10}$/, message: '10 digits' } })}
                                    placeholder="9876543210" maxLength={10} />
                                {errors.contactNumber && <p className="mt-1 text-xs text-destructive">{errors.contactNumber.message}</p>}
                            </div>

                            {/* hCaptcha widget */}
                            <div className="flex justify-center pt-1">
                                <HCaptcha
                                    sitekey={HCAPTCHA_SITE_KEY}
                                    onVerify={(token) => setCaptchaToken(token)}
                                    onExpire={() => setCaptchaToken('')}
                                    ref={captchaRef}
                                />
                            </div>

                            <Button type="submit" disabled={loading} className="w-full" size="lg">
                                {loading ? 'Creating account…' : 'Create account'}
                            </Button>
                        </form>

                        <p className="text-center text-xs text-muted-foreground pt-2">
                            Already have an account?{' '}
                            <Link to="/login" className="text-primary font-medium hover:underline">Sign in</Link>
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

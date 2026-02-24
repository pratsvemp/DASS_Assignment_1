import { useState, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../services/api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';

// hCaptcha test site key — works without a real account in dev
const HCAPTCHA_SITE_KEY = '10000000-ffff-ffff-ffff-000000000001';

export default function LoginPage() {
    const { register, handleSubmit, formState: { errors } } = useForm();
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [captchaToken, setCaptchaToken] = useState('');
    const captchaRef = useRef(null);

    const from = location.state?.from?.pathname;
    const roleDash = { participant: '/dashboard', organizer: '/organizer/dashboard', admin: '/admin/dashboard' };

    const onSubmit = async (data) => {
        setLoading(true);
        setError('');
        try {
            const res = await authAPI.login({ ...data, captchaToken });
            login(res.data.token, res.data.user);
            navigate(from || roleDash[res.data.user.role] || '/dashboard', { replace: true });
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed. Please try again.');
            captchaRef.current?.resetCaptcha();
            setCaptchaToken('');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
            <div className="w-full max-w-sm">
                {/* Logo */}
                <div className="text-center mb-10">
                    <h1 className="pixel-font text-2xl font-bold tracking-tight text-foreground">FELICITY</h1>
                    <p className="mt-3 text-sm text-muted-foreground">Event Management System</p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Sign in</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        {error && (
                            <div className="rounded-none bg-destructive/10 border-l-4 border-destructive px-4 py-3 text-xs text-destructive pixel-font">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                            <div>
                                <label className="block text-xs font-medium mb-2 uppercase tracking-wider">Email</label>
                                <Input
                                    type="email"
                                    {...register('email', { required: 'Email is required' })}
                                    placeholder="you@example.com"
                                    className="w-full"
                                />
                                {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>}
                            </div>

                            <div>
                                <label className="block text-xs font-medium mb-2 uppercase tracking-wider">Password</label>
                                <Input
                                    type="password"
                                    {...register('password', { required: 'Password is required' })}
                                    placeholder="••••••••"
                                    className="w-full"
                                />
                                {errors.password && <p className="mt-1 text-xs text-destructive">{errors.password.message}</p>}
                            </div>

                            {/* hCaptcha widget */}
                            <div className="flex justify-center">
                                <HCaptcha
                                    sitekey={HCAPTCHA_SITE_KEY}
                                    onVerify={(token) => setCaptchaToken(token)}
                                    onExpire={() => setCaptchaToken('')}
                                    ref={captchaRef}
                                />
                            </div>

                            <Button
                                type="submit"
                                disabled={loading}
                                className="w-full"
                                size="lg"
                            >
                                {loading ? 'Signing in…' : 'Sign in'}
                            </Button>
                        </form>

                        <p className="text-center text-xs text-muted-foreground pt-2">
                            New participant?{' '}
                            <Link to="/signup" className="text-primary font-medium hover:underline">Create account</Link>
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

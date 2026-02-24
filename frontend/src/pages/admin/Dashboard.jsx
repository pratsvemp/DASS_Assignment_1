import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import { adminAPI } from '../../services/api';

export default function AdminDashboard() {
    const navigate = useNavigate();
    const [organizers, setOrganizers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        adminAPI.listOrganizers()
            .then(res => setOrganizers(res.data.organizers))
            .finally(() => setLoading(false));
    }, []);

    const total = organizers.length;
    const active = organizers.filter(o => o.isApproved).length;
    const disabled = organizers.filter(o => !o.isApproved).length;

    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <div className="mx-auto max-w-5xl px-4 py-8">
                <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
                    <div>
                        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
                        <p className="text-muted-foreground mt-1">Manage your system here</p>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mb-8">
                    {[
                        { label: 'Total Organizers', value: total, color: 'bg-dark-blue-50 border-blue-300 text-light-blue-700' },
                        { label: 'Active', value: active, color: 'bg-dark-green-50 border-green-300 text-light-green-700' },
                        { label: 'Disabled', value: disabled, color: 'bg-dark-red-50 border-red-300 text-light-red-700' },
                    ].map(({ label, value, color }) => (
                        <div key={label} className={`rounded-2xl border p-5 ${color}`}>
                            <p className="text-xs uppercase tracking-wide opacity-70">{label}</p>
                            <p className="text-3xl font-bold mt-1">{loading ? '…' : value}</p>
                        </div>
                    ))}
                </div>

                {/* Quick links */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button onClick={() => navigate('/admin/organizers')}
                        className="text-left bg-card border border-border rounded-2xl p-6 hover:border-primary/50 transition-colors group">
                        <h3 className="font-semibold group-hover:text-primary transition-colors">Manage Organizers</h3>
                        <p className="text-sm text-muted-foreground mt-1">Create, disable, and reset passwords for organizer accounts</p>
                    </button>
                </div>
            </div>
        </div>
    );
}

'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import GlassCard from '@/components/ui/GlassCard';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { StatCardSkeleton } from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';

export default function EditEventPage() {
    const params = useParams();
    const router = useRouter();
    const { token } = useAuth();
    const eventId = params.eventId as string;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [form, setForm] = useState({
        title: '',
        date: '',
        location: '',
        privacy: 'public',
        password: '',
        expiresAt: '',
    });

    useEffect(() => {
        if (!token) return;

        fetch(`/api/events/${eventId}`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((r) => r.json())
            .then((data) => {
                if (data.event) {
                    const e = data.event;
                    setForm({
                        title: e.title || '',
                        date: e.date ? new Date(e.date).toISOString().split('T')[0] : '',
                        location: e.location || '',
                        privacy: e.privacy || 'public',
                        password: '',
                        expiresAt: e.expiresAt ? new Date(e.expiresAt).toISOString().split('T')[0] : '',
                    });
                }
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [eventId, token]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setSaving(true);

        try {
            // Only send fields that have values; skip empty password
            const payload: Record<string, string> = {};
            if (form.title) payload.title = form.title;
            if (form.date) payload.date = form.date;
            if (form.location) payload.location = form.location;
            if (form.privacy) payload.privacy = form.privacy;
            if (form.password) payload.password = form.password;
            if (form.expiresAt) payload.expiresAt = form.expiresAt;

            const res = await fetch(`/api/events/${eventId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to update event');

            setSuccess('Event updated successfully!');
            setTimeout(() => router.push(`/dashboard/events/${eventId}`), 1000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="max-w-2xl animate-fade-in">
                <StatCardSkeleton />
            </div>
        );
    }

    if (!form.title && !loading) {
        return (
            <EmptyState
                title="Event not found"
                description="This event doesn't exist or you don't have access."
            />
        );
    }

    return (
        <div className="max-w-2xl animate-fade-in">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white">Edit Event</h1>
                <p className="text-gray-500 mt-1">Update your event details</p>
            </div>

            <GlassCard className="p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-slide-down">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm animate-slide-down">
                            {success}
                        </div>
                    )}

                    <Input
                        label="Event Title"
                        name="title"
                        placeholder="Wedding of Sarah & John"
                        value={form.title}
                        onChange={handleChange}
                        required
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Event Date"
                            name="date"
                            type="date"
                            value={form.date}
                            onChange={handleChange}
                            required
                        />
                        <Input
                            label="Location"
                            name="location"
                            placeholder="Central Park, NYC"
                            value={form.location}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-gray-300">Privacy</label>
                            <select
                                name="privacy"
                                value={form.privacy}
                                onChange={handleChange}
                                className="w-full px-4 py-3 bg-dark-50/50 border border-white/[0.1] rounded-xl text-white outline-none focus:border-accent-purple/50 transition-all"
                            >
                                <option value="public">Public</option>
                                <option value="private">Private</option>
                            </select>
                        </div>

                        {form.privacy === 'private' && (
                            <Input
                                label="Event Password"
                                name="password"
                                type="password"
                                placeholder="Leave blank to keep current"
                                value={form.password}
                                onChange={handleChange}
                            />
                        )}
                    </div>

                    <Input
                        label="Expiry Date (Optional)"
                        name="expiresAt"
                        type="date"
                        value={form.expiresAt}
                        onChange={handleChange}
                    />

                    <div className="flex gap-3 pt-4">
                        <Button type="submit" loading={saving} className="flex-1">
                            Save Changes
                        </Button>
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => router.push(`/dashboard/events/${eventId}`)}
                        >
                            Cancel
                        </Button>
                    </div>
                </form>
            </GlassCard>
        </div>
    );
}

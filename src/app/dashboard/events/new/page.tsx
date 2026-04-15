'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import GlassCard from '@/components/ui/GlassCard';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

export default function CreateEventPage() {
    const { token } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [form, setForm] = useState({
        title: '',
        date: '',
        location: '',
        privacy: 'public',
        password: '',
        expiresAt: '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await fetch('/api/events', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(form),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to create event');

            router.push(`/dashboard/events/${data.event._id}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl animate-fade-in">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white">Create Event</h1>
                <p className="text-gray-500 mt-1">Set up a new event for photo sharing</p>
            </div>

            <GlassCard className="p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                            {error}
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
                                placeholder="Optional password"
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
                        <Button type="submit" loading={loading} className="flex-1">
                            Create Event
                        </Button>
                        <Button type="button" variant="secondary" onClick={() => router.back()}>
                            Cancel
                        </Button>
                    </div>
                </form>
            </GlassCard>
        </div>
    );
}

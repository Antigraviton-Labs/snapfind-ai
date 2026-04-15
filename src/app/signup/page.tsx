'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { GoogleLogin } from '@react-oauth/google';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Navbar from '@/components/ui/Navbar';

export default function SignupPage() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const { signup, googleLogin } = useAuth();
    const router = useRouter();

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await signup(name, email, password);
            router.push('/dashboard');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Signup failed');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSuccess = async (credentialResponse: { credential?: string }) => {
        if (!credentialResponse.credential) {
            setError('Google signup failed — no credential received');
            return;
        }

        setGoogleLoading(true);
        setError('');

        try {
            await googleLogin(credentialResponse.credential);
            router.push('/dashboard');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Google signup failed');
        } finally {
            setGoogleLoading(false);
        }
    };

    return (
        <>
            <Navbar />
            <div className="page-container flex items-center justify-center min-h-screen p-4 pt-20">
                <div className="absolute inset-0 bg-gradient-radial pointer-events-none" />
                <div className="absolute top-1/3 right-1/3 w-96 h-96 bg-accent-blue/5 rounded-full blur-[128px]" />

                <div className="w-full max-w-md relative animate-scale-in">
                    <div className="text-center mb-8">
                        <Link href="/" className="inline-flex items-center gap-2">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-purple to-accent-blue flex items-center justify-center">
                                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </div>
                            <span className="text-xl font-bold gradient-text">SnapFind AI</span>
                        </Link>
                        <h1 className="text-2xl font-bold text-white mt-6 mb-2">Create your account</h1>
                        <p className="text-gray-500">Start sharing event photos with AI</p>
                    </div>

                    <div className="glass-card p-8">
                        {/* Google Sign-Up Button */}
                        <div className="flex justify-center mb-6">
                            {googleLoading ? (
                                <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-white/[0.1] bg-white/[0.03] w-full justify-center">
                                    <svg className="w-5 h-5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    <span className="text-white font-medium text-sm">Creating account...</span>
                                </div>
                            ) : (
                                <GoogleLogin
                                    onSuccess={handleGoogleSuccess}
                                    onError={() => setError('Google signup failed. Please try again.')}
                                    theme="filled_black"
                                    shape="rectangular"
                                    size="large"
                                    width="360"
                                    text="signup_with"
                                />
                            )}
                        </div>

                        {/* Divider */}
                        <div className="relative mb-6">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-white/[0.08]" />
                            </div>
                            <div className="relative flex justify-center text-xs">
                                <span className="px-3 bg-dark-100 text-gray-500">or sign up with email</span>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            {error && (
                                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-slide-down">
                                    {error}
                                </div>
                            )}

                            <Input
                                label="Full Name"
                                type="text"
                                placeholder="John Doe"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />

                            <Input
                                label="Email"
                                type="email"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />

                            <Input
                                label="Password"
                                type="password"
                                placeholder="Min. 8 characters"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={8}
                            />

                            <Button type="submit" loading={loading} className="w-full">
                                Create Account
                            </Button>
                        </form>

                        <p className="text-center text-sm text-gray-500 mt-6">
                            Already have an account?{' '}
                            <Link href="/login" className="text-accent-purple hover:underline">
                                Sign in
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}

'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export default function Navbar() {
    const { isAuthenticated, logout } = useAuth();

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-dark/80 backdrop-blur-xl border-b border-white/[0.05]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-14 sm:h-16">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-1 sm:gap-2 group flex-shrink-0">
                        <div className="w-7 sm:w-8 h-7 sm:h-8 rounded-lg bg-gradient-to-br from-accent-purple to-accent-blue flex items-center justify-center">
                            <svg className="w-4 sm:w-5 h-4 sm:h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </div>
                        <span className="text-base sm:text-lg font-bold gradient-text group-hover:opacity-80 transition-opacity hidden sm:inline">
                            SnapFind AI
                        </span>
                    </Link>

                    {/* Nav Links */}
                    <div className="hidden md:flex items-center gap-6 lg:gap-8">
                        <Link href="/pricing" className="text-sm text-gray-400 hover:text-white transition-colors">
                            Pricing
                        </Link>
                        {isAuthenticated ? (
                            <>
                                <Link href="/dashboard" className="text-sm text-gray-400 hover:text-white transition-colors">
                                    Dashboard
                                </Link>
                                <button
                                    onClick={logout}
                                    className="text-sm text-gray-400 hover:text-white transition-colors"
                                >
                                    Sign Out
                                </button>
                            </>
                        ) : (
                            <>
                                <Link href="/login" className="text-sm text-gray-400 hover:text-white transition-colors">
                                    Sign In
                                </Link>
                                <Link href="/signup" className="btn-primary !py-2 !px-4 text-xs sm:text-sm">
                                    Get Started
                                </Link>
                            </>
                        )}
                    </div>

                    {/* Mobile menu button */}
                    <div className="md:hidden">
                        {isAuthenticated ? (
                            <Link href="/dashboard" className="btn-primary !py-1.5 !px-3 text-xs">
                                Dashboard
                            </Link>
                        ) : (
                            <Link href="/login" className="btn-primary !py-1.5 !px-3 text-xs">
                                Sign In
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
}

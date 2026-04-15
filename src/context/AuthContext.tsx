'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    plan: string;
    avatar?: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    signup: (name: string, email: string, password: string) => Promise<void>;
    googleLogin: (googleToken: string) => Promise<void>;
    logout: () => void;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE = '/api/auth';

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const saveToken = useCallback((t: string) => {
        setToken(t);
        localStorage.setItem('snapfind_token', t);
    }, []);

    const clearAuth = useCallback(() => {
        setUser(null);
        setToken(null);
        localStorage.removeItem('snapfind_token');
    }, []);

    // Check existing token on mount
    useEffect(() => {
        const stored = localStorage.getItem('snapfind_token');
        if (stored) {
            setToken(stored);
            fetch(`${API_BASE}/me`, {
                headers: { Authorization: `Bearer ${stored}` },
            })
                .then((res) => {
                    if (res.ok) return res.json();
                    throw new Error('Invalid token');
                })
                .then((data) => setUser(data.user))
                .catch(() => clearAuth())
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, [clearAuth]);

    const login = async (email: string, password: string) => {
        const res = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Login failed');

        saveToken(data.token);
        setUser(data.user);
    };

    const signup = async (name: string, email: string, password: string) => {
        const res = await fetch(`${API_BASE}/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Signup failed');

        saveToken(data.token);
        setUser(data.user);
    };

    // Google OAuth login — sends Google ID token to our backend for verification
    const googleLogin = async (googleToken: string) => {
        const res = await fetch(`${API_BASE}/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: googleToken }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Google login failed');

        saveToken(data.token);
        setUser(data.user);
    };

    const logout = () => {
        clearAuth();
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                token,
                loading,
                login,
                signup,
                googleLogin,
                logout,
                isAuthenticated: !!user,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
}

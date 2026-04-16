'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import Sidebar from '@/components/ui/Sidebar';
import { ReactNode } from 'react';

export default function DashboardLayout({ children }: { children: ReactNode }) {
    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-dark">
                <div className="hidden md:block">
                    <Sidebar />
                </div>
                <main className="md:ml-64 min-h-screen pt-16 md:pt-0">
                    <div className="p-4 sm:p-6 md:p-8">
                        {children}
                    </div>
                </main>
            </div>
        </ProtectedRoute>
    );
}

'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import Sidebar from '@/components/ui/Sidebar';
import { ReactNode } from 'react';

export default function DashboardLayout({ children }: { children: ReactNode }) {
    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-dark">
                <Sidebar />
                <main className="ml-64 min-h-screen">
                    <div className="p-8">
                        {children}
                    </div>
                </main>
            </div>
        </ProtectedRoute>
    );
}

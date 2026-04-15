'use client';

import { ReactNode } from 'react';

interface GlassCardProps {
    children: ReactNode;
    className?: string;
    hover?: boolean;
    onClick?: () => void;
}

export default function GlassCard({ children, className = '', hover = false, onClick }: GlassCardProps) {
    return (
        <div
            onClick={onClick}
            className={`
        bg-white/[0.05] border border-white/[0.1] rounded-2xl backdrop-blur-xl shadow-glass
        ${hover ? 'transition-all duration-300 hover:bg-white/[0.08] hover:shadow-glass-lg hover:border-accent-purple/20 cursor-pointer' : ''}
        ${className}
      `}
        >
            {children}
        </div>
    );
}

'use client';

import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    icon?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ label, error, icon, className = '', ...props }, ref) => {
        return (
            <div className="space-y-1.5">
                {label && (
                    <label className="block text-sm font-medium text-gray-300">
                        {label}
                    </label>
                )}
                <div className="relative">
                    {icon && (
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                            {icon}
                        </div>
                    )}
                    <input
                        ref={ref}
                        className={`
              w-full px-4 py-3 bg-dark-50/50 border border-white/[0.1] rounded-xl
              text-white placeholder-gray-500 outline-none
              transition-all duration-300
              focus:border-accent-purple/50 focus:ring-2 focus:ring-accent-purple/20 focus:bg-dark-50
              ${icon ? 'pl-10' : ''}
              ${error ? 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20' : ''}
              ${className}
            `}
                        {...props}
                    />
                </div>
                {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
            </div>
        );
    }
);

Input.displayName = 'Input';
export default Input;

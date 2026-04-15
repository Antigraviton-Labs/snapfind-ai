'use client';

import Link from 'next/link';
import Navbar from '@/components/ui/Navbar';
import GlassCard from '@/components/ui/GlassCard';

const plans = [
    {
        name: 'Free',
        price: '$0',
        period: '/forever',
        description: 'Perfect for trying out SnapFind AI',
        features: [
            'Up to 3 events',
            '50 photos per event',
            '500MB storage',
            'Watermarked downloads',
            '5 face scans/minute',
            '20 downloads/day',
            'Basic analytics',
        ],
        cta: 'Get Started',
        href: '/signup',
        popular: false,
    },
    {
        name: 'Pro',
        price: '$29',
        period: '/month',
        description: 'For professional photographers',
        features: [
            'Unlimited events',
            '5,000 photos per event',
            '10GB storage',
            'No watermark',
            'Priority processing',
            'Unlimited downloads',
            'Advanced analytics',
            'Priority support',
        ],
        cta: 'Upgrade to Pro',
        href: '/signup',
        popular: true,
    },
];

export default function PricingPage() {
    return (
        <div className="page-container">
            <Navbar />

            <section className="pt-32 pb-24">
                <div className="section-container">
                    <div className="text-center mb-16 animate-fade-in">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">
                            Simple, Transparent <span className="gradient-text">Pricing</span>
                        </h1>
                        <p className="text-gray-400 max-w-xl mx-auto">
                            Start free and upgrade when you need more. No hidden fees.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                        {plans.map((plan) => (
                            <GlassCard
                                key={plan.name}
                                className={`p-8 relative animate-slide-up ${plan.popular ? 'border-accent-purple/30 shadow-glow' : ''
                                    }`}
                            >
                                {plan.popular && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-primary rounded-full text-xs font-semibold text-white">
                                        Most Popular
                                    </div>
                                )}

                                <div className="mb-6">
                                    <h3 className="text-xl font-semibold text-white mb-1">{plan.name}</h3>
                                    <p className="text-sm text-gray-500">{plan.description}</p>
                                </div>

                                <div className="mb-8">
                                    <span className="text-4xl font-bold text-white">{plan.price}</span>
                                    <span className="text-gray-500">{plan.period}</span>
                                </div>

                                <ul className="space-y-3 mb-8">
                                    {plan.features.map((f) => (
                                        <li key={f} className="flex items-center gap-3 text-sm text-gray-300">
                                            <svg className="w-4 h-4 text-accent-purple flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                            {f}
                                        </li>
                                    ))}
                                </ul>

                                <Link
                                    href={plan.href}
                                    className={`block text-center py-3 rounded-xl font-semibold transition-all duration-300 ${plan.popular
                                        ? 'bg-gradient-primary text-white hover:shadow-glow'
                                        : 'bg-white/[0.05] text-white hover:bg-white/[0.1] border border-white/[0.1]'
                                        }`}
                                >
                                    {plan.cta}
                                </Link>
                            </GlassCard>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
}

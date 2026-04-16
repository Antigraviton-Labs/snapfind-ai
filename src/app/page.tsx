'use client';

import Link from 'next/link';
import Navbar from '@/components/ui/Navbar';

const features = [
  {
    icon: '📸',
    title: 'Bulk Upload',
    description: 'Upload hundreds of event photos with drag & drop. Our system handles processing automatically.',
  },
  {
    icon: '🤖',
    title: 'AI Face Detection',
    description: 'DeepFace-powered recognition extracts and indexes every face in your photos instantly.',
  },
  {
    icon: '🔍',
    title: 'Instant Face Search',
    description: 'Guests scan their face via webcam and find all their photos in seconds.',
  },
  {
    icon: '⚡',
    title: 'Lightning Fast',
    description: 'Optimized matching engine with cosine similarity delivers results in milliseconds.',
  },
  {
    icon: '🔒',
    title: 'Secure & Private',
    description: 'Signed download URLs, rate limiting, and optional face data auto-deletion.',
  },
  {
    icon: '📊',
    title: 'Analytics Dashboard',
    description: 'Track uploads, downloads, storage usage, and popular events in real-time.',
  },
];

const steps = [
  { num: '01', title: 'Create Event', desc: 'Set up your event with a shareable link in seconds.' },
  { num: '02', title: 'Upload Photos', desc: 'Drag & drop your event photos for AI processing.' },
  { num: '03', title: 'Share Link', desc: 'Send the event link to attendees.' },
  { num: '04', title: 'Find Photos', desc: 'Guests scan face and instantly get their photos.' },
];

export default function LandingPage() {
  return (
    <div className="page-container">
      <Navbar />

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
        {/* Background effects */}
        <div className="absolute inset-0 bg-gradient-radial" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent-purple/10 rounded-full blur-[128px] animate-pulse_slow" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-blue/10 rounded-full blur-[128px] animate-pulse_slow animate-delay-500" />

        <div className="relative section-container text-center py-12 sm:py-16 md:py-20 px-4 sm:px-0">
          <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full bg-white/[0.05] border border-white/[0.1] mb-6 sm:mb-8 animate-fade-in text-xs sm:text-sm">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-gray-400">AI-Powered Photo Discovery</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-bold mb-6 animate-slide-up leading-tight">
            Find Your Event Photos{' '}
            <span className="gradient-text">With AI</span>
          </h1>

          <p className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-400 max-w-2xl mx-auto mb-10 animate-slide-up animate-delay-100 px-2">
            Photographers upload event photos. Guests scan their face.
            AI finds their photos instantly. It&apos;s that simple.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 animate-slide-up animate-delay-200">
            <Link href="/signup" className="btn-primary text-base sm:text-lg !px-6 sm:!px-8 !py-3 sm:!py-4 w-full sm:w-auto">
              Get Started Free
            </Link>
            <Link href="/pricing" className="btn-secondary text-base sm:text-lg !px-6 sm:!px-8 !py-3 sm:!py-4 w-full sm:w-auto">
              View Pricing
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-8 max-w-lg mx-auto mt-16 animate-fade-in animate-delay-300 px-4 sm:px-0">
            {[
              { label: 'Face Matches', value: '99.2%' },
              { label: 'Avg Response', value: '<2s' },
              { label: 'Photos Processed', value: '1M+' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-xl sm:text-2xl md:text-3xl font-bold gradient-text">{stat.value}</p>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 sm:py-24 relative px-4 sm:px-0">
        <div className="section-container">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">
              Everything You Need for{' '}
              <span className="gradient-text">Event Photos</span>
            </h2>
            <p className="text-sm sm:text-base text-gray-400 max-w-xl mx-auto px-2 sm:px-0">
              A complete platform connecting photographers and event attendees through AI.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {features.map((feature, i) => (
              <div
                key={feature.title}
                className="glass-card-hover p-4 sm:p-6 animate-slide-up"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="text-2xl sm:text-3xl mb-4">{feature.icon}</div>
                <h3 className="text-base sm:text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 sm:py-24 relative px-4 sm:px-0">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-accent-purple/[0.03] to-transparent" />
        <div className="section-container relative">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">
              How It <span className="gradient-text">Works</span>
            </h2>
            <p className="text-sm sm:text-base text-gray-400">Four simple steps to event photo magic.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {steps.map((step, i) => (
              <div key={step.num} className="relative text-center animate-slide-up" style={{ animationDelay: `${i * 150}ms` }}>
                <div className="inline-flex items-center justify-center w-14 sm:w-16 h-14 sm:h-16 rounded-2xl bg-gradient-to-br from-accent-purple/20 to-accent-blue/20 mb-4 border border-accent-purple/10">
                  <span className="text-lg sm:text-xl font-bold gradient-text">{step.num}</span>
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-white mb-2">{step.title}</h3>
                <p className="text-xs sm:text-sm text-gray-400">{step.desc}</p>
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-[calc(50%+40px)] w-[calc(100%-80px)] h-px bg-gradient-to-r from-accent-purple/30 to-transparent" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-24 px-4 sm:px-0">
        <div className="section-container">
          <div className="glass-card p-8 sm:p-12 md:p-16 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-accent-purple/10 to-accent-blue/10" />
            <div className="relative">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">
                Ready to Transform Your Event Photography?
              </h2>
              <p className="text-sm sm:text-base text-gray-400 max-w-xl mx-auto mb-6 sm:mb-8 px-2 sm:px-0">
                Join photographers who use AI to deliver a magical photo experience.
              </p>
              <Link href="/signup" className="btn-primary text-base sm:text-lg !px-8 sm:!px-10 !py-3 sm:!py-4 inline-block">
                Start Free Today
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 sm:py-12 border-t border-white/[0.05] px-4 sm:px-0">
        <div className="section-container text-center">
          <p className="text-xs sm:text-sm text-gray-500">
            © {new Date().getFullYear()} SnapFind AI. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

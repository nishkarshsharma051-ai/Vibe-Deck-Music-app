import React from 'react';

/**
 * Premium VibeDeck Official Soundwave Brand Logo
 */
export default function Logo({ size = 'md', className = '', animated = false }) {
  const dimensions = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-20 h-20',
    xl: 'w-32 h-32'
  };

  return (
    <div className={`flex items-center justify-center select-none ${dimensions[size]} ${className}`}>
      <svg 
        viewBox="0 0 100 100" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full transition-transform duration-300 hover:scale-[1.05]"
      >
        <defs>
          <linearGradient id="vibedeck-logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="50%" stopColor="#0ea5e9" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
          <filter id="logo-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        
        {/* Outer Deck Ring */}
        <circle 
          cx="50" 
          cy="50" 
          r="42" 
          stroke="url(#vibedeck-logo-grad)" 
          strokeWidth="3.5" 
          strokeLinecap="round"
          className={animated ? "animate-pulseGlow" : ""}
          style={{ transformOrigin: 'center' }}
        />

        {/* Vinyl Groove Ring */}
        <circle 
          cx="50" 
          cy="50" 
          r="33" 
          stroke="white" 
          strokeWidth="1.2" 
          strokeOpacity="0.15"
          strokeDasharray="4 8"
          className={animated ? "animate-orbitSpin" : ""}
          style={{ transformOrigin: 'center', animationDuration: '24s' }}
        />

        {/* Center Vinyl Label Core */}
        <circle 
          cx="50" 
          cy="50" 
          r="18" 
          fill="url(#vibedeck-logo-grad)" 
          fillOpacity="0.08"
          stroke="url(#vibedeck-logo-grad)"
          strokeWidth="1.5"
        />

        {/* Premium Bouncing Equalizer Waveform */}
        <g filter="url(#logo-glow)">
          {/* Bar 1 */}
          <rect x="36" y="42" width="4.2" height="16" rx="2.1" fill="url(#vibedeck-logo-grad)"
            className={animated ? "animate-soundwave-1" : ""}
            style={{ transformOrigin: '38.1px 50px' }}
          />
          {/* Bar 2 */}
          <rect x="43" y="34" width="4.2" height="32" rx="2.1" fill="url(#vibedeck-logo-grad)"
            className={animated ? "animate-soundwave-2" : ""}
            style={{ transformOrigin: '45.1px 50px' }}
          />
          {/* Bar 3 (Center) */}
          <rect x="50" y="26" width="4.2" height="48" rx="2.1" fill="url(#vibedeck-logo-grad)"
            className={animated ? "animate-soundwave-3" : ""}
            style={{ transformOrigin: '52.1px 50px' }}
          />
          {/* Bar 4 */}
          <rect x="57" y="34" width="4.2" height="32" rx="2.1" fill="url(#vibedeck-logo-grad)"
            className={animated ? "animate-soundwave-4" : ""}
            style={{ transformOrigin: '59.1px 50px' }}
          />
          {/* Bar 5 */}
          <rect x="64" y="42" width="4.2" height="16" rx="2.1" fill="url(#vibedeck-logo-grad)"
            className={animated ? "animate-soundwave-5" : ""}
            style={{ transformOrigin: '66.1px 50px' }}
          />
        </g>
      </svg>
    </div>
  );
}

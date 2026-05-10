'use client';

import * as React from 'react';

interface LungScanAnimationProps {
    label?: string;
    sublabel?: string;
    className?: string;
    /** Optional X-ray URL rendered behind the scanner so the sweep visibly
     *  traverses the actual image while inference runs. */
    imageUrl?: string;
}

/**
 * Lung-shaped x-ray scanner visual. A glowing horizontal scan line sweeps
 * top-to-bottom across a stylised pair of lungs while a soft pulse highlights
 * the currently-scanned region. Used as the placeholder shown on the case
 * page while AI inference is still running.
 */
export function LungScanAnimation({
    label = 'Analyzing X-ray',
    sublabel = 'Lung segmentation, detection, and classification in progress…',
    className = '',
    imageUrl,
}: LungScanAnimationProps) {
    return (
        <div className={`absolute inset-0 flex flex-col items-center justify-center bg-black overflow-hidden ${className}`}>
            {/* Real X-ray fading in behind the scanner so the sweep looks like
                it's reading the actual image. */}
            {imageUrl && (
                <>
                    <img
                        src={imageUrl}
                        alt=""
                        aria-hidden="true"
                        className="absolute inset-0 w-full h-full object-contain opacity-60 lung-scan-image"
                    />
                    {/* Subtle vignette + cyan tint to keep the medical-imaging vibe */}
                    <div className="absolute inset-0 bg-gradient-to-b from-cyan-950/30 via-transparent to-cyan-950/30 pointer-events-none" />
                    {/* Full-width scan line traversing the actual image */}
                    <div className="absolute inset-x-0 h-[3px] bg-gradient-to-r from-transparent via-cyan-300 to-transparent shadow-[0_0_24px_4px_rgba(103,232,249,0.65)] lung-scan-full-line pointer-events-none" />
                </>
            )}

            <div className="relative w-[380px] h-[440px] sm:w-[460px] sm:h-[520px] flex items-center justify-center translate-y-8 sm:translate-y-12">
                {/* Soft ambient glow */}
                <div className="absolute inset-0 rounded-full bg-cyan-500/10 blur-3xl" />

                <svg
                    viewBox="0 0 400 460"
                    className="absolute inset-0 w-full h-full"
                    aria-hidden="true"
                >
                    <defs>
                        <linearGradient id="lung-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.85" />
                            <stop offset="100%" stopColor="#0891b2" stopOpacity="0.4" />
                        </linearGradient>

                        <linearGradient id="scan-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="rgba(34, 211, 238, 0)" />
                            <stop offset="50%" stopColor="rgba(125, 252, 244, 0.95)" />
                            <stop offset="100%" stopColor="rgba(34, 211, 238, 0)" />
                        </linearGradient>

                        {/* Glow filter applied to lung outline */}
                        <filter id="lung-glow" x="-20%" y="-20%" width="140%" height="140%">
                            <feGaussianBlur stdDeviation="3" result="blur" />
                            <feMerge>
                                <feMergeNode in="blur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>

                        {/* Clip path: scan line + region only render inside the lungs */}
                        <clipPath id="lung-clip">
                            <path d="M178,80
                                C178,60 168,52 152,52
                                C108,52 60,108 60,200
                                C60,288 88,360 130,396
                                C160,420 188,408 188,372
                                L188,108
                                Z" />
                            <path d="M222,80
                                C222,60 232,52 248,52
                                C292,52 340,108 340,200
                                C340,288 312,360 270,396
                                C240,420 212,408 212,372
                                L212,108
                                Z" />
                        </clipPath>
                    </defs>

                    {/* Lung silhouettes — outlined and softly filled */}
                    <g filter="url(#lung-glow)">
                        <path
                            d="M178,80
                               C178,60 168,52 152,52
                               C108,52 60,108 60,200
                               C60,288 88,360 130,396
                               C160,420 188,408 188,372
                               L188,108
                               Z"
                            fill="url(#lung-gradient)"
                            fillOpacity="0.18"
                            stroke="#67e8f9"
                            strokeWidth="2"
                        />
                        <path
                            d="M222,80
                               C222,60 232,52 248,52
                               C292,52 340,108 340,200
                               C340,288 312,360 270,396
                               C240,420 212,408 212,372
                               L212,108
                               Z"
                            fill="url(#lung-gradient)"
                            fillOpacity="0.18"
                            stroke="#67e8f9"
                            strokeWidth="2"
                        />

                        {/* Trachea + bronchi sketch */}
                        <path
                            d="M200,30 L200,110
                               M200,110 L168,138
                               M200,110 L232,138"
                            stroke="#a5f3fc"
                            strokeWidth="3"
                            strokeLinecap="round"
                            fill="none"
                            opacity="0.7"
                        />
                    </g>

                    {/* Scanning band (clipped to the lung shape) */}
                    <g clipPath="url(#lung-clip)">
                        <rect
                            x="40"
                            y="40"
                            width="320"
                            height="80"
                            fill="url(#scan-gradient)"
                            opacity="0.85"
                            className="lung-scan-band"
                        />
                        {/* Crisp scan line on top of the band */}
                        <line
                            x1="40"
                            x2="360"
                            stroke="#5eead4"
                            strokeWidth="1.5"
                            className="lung-scan-line"
                            opacity="0.9"
                        />
                    </g>
                </svg>

                {/* Corner brackets for a hi-tech scanner frame */}
                <div className="absolute inset-0 pointer-events-none">
                    <span className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-cyan-400/70" />
                    <span className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-cyan-400/70" />
                    <span className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-cyan-400/70" />
                    <span className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-cyan-400/70" />
                </div>
            </div>

            <div className="mt-6 text-center max-w-xs px-4">
                <div className="text-sm font-semibold text-cyan-300 tracking-wide uppercase">
                    {label}
                </div>
                <div className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                    {sublabel}
                </div>
            </div>

            <style jsx>{`
                :global(.lung-scan-band) {
                    animation: lungScanSweep 2.4s ease-in-out infinite;
                    transform-origin: center;
                }
                :global(.lung-scan-line) {
                    animation: lungScanLine 2.4s ease-in-out infinite;
                }
                :global(.lung-scan-full-line) {
                    top: 0;
                    animation: lungScanFullLine 3.2s ease-in-out infinite;
                    will-change: top, opacity;
                }
                :global(.lung-scan-image) {
                    animation: lungScanImageFade 0.6s ease-out both;
                }
                @keyframes lungScanSweep {
                    0% { transform: translateY(0px); }
                    50% { transform: translateY(340px); }
                    100% { transform: translateY(0px); }
                }
                @keyframes lungScanLine {
                    0% { transform: translateY(60px); }
                    50% { transform: translateY(400px); }
                    100% { transform: translateY(60px); }
                }
                @keyframes lungScanFullLine {
                    0%   { top: 0%;   opacity: 0; }
                    8%   { opacity: 1; }
                    50%  { top: 100%; opacity: 1; }
                    52%  { opacity: 0; }
                    100% { top: 0%;   opacity: 0; }
                }
                @keyframes lungScanImageFade {
                    from { opacity: 0; }
                    to   { opacity: 0.6; }
                }
            `}</style>
        </div>
    );
}

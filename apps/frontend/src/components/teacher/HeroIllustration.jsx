"use client";

export default function HeroIllustration() {
  return (
    <svg viewBox="0 0 360 260" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="180" cy="130" r="108" fill="white" fillOpacity="0.06" />
      <circle cx="180" cy="130" r="78" fill="white" fillOpacity="0.08" />
      {/* progress ring */}
      <circle cx="180" cy="130" r="60" stroke="white" strokeOpacity="0.25" strokeWidth="10" fill="none" />
      <circle
        cx="180" cy="130" r="60" stroke="#F5A524" strokeWidth="10" fill="none"
        strokeDasharray="377" strokeDashoffset="94" strokeLinecap="round" transform="rotate(-90 180 130)"
      />
      <text x="180" y="122" textAnchor="middle" fontFamily="JetBrains Mono" fontWeight="700" fontSize="30" fill="white">87%</text>
      <text x="180" y="144" textAnchor="middle" fontFamily="Inter" fontSize="11" fill="white" fillOpacity="0.7">CLASS AVG</text>

      {/* floating stat chips */}
      <g transform="translate(18,26)">
        <rect width="88" height="40" rx="12" fill="white" fillOpacity="0.12" />
        <text x="12" y="17" fontFamily="Inter" fontSize="9" fill="white" fillOpacity="0.7">TOP SCORE</text>
        <text x="12" y="32" fontFamily="JetBrains Mono" fontWeight="700" fontSize="15" fill="#F5A524">98%</text>
      </g>
      <g transform="translate(254,20)">
        <rect width="90" height="40" rx="12" fill="white" fillOpacity="0.12" />
        <text x="12" y="17" fontFamily="Inter" fontSize="9" fill="white" fillOpacity="0.7">STREAK</text>
        <text x="12" y="32" fontFamily="JetBrains Mono" fontWeight="700" fontSize="15" fill="white">12 days</text>
      </g>
      <g transform="translate(24,196)">
        <rect width="100" height="40" rx="12" fill="white" fillOpacity="0.12" />
        <text x="12" y="17" fontFamily="Inter" fontSize="9" fill="white" fillOpacity="0.7">BADGES EARNED</text>
        <text x="12" y="32" fontFamily="JetBrains Mono" fontWeight="700" fontSize="15" fill="#12B76A">241</text>
      </g>
      <g transform="translate(246,198)">
        <rect width="96" height="40" rx="12" fill="white" fillOpacity="0.12" />
        <text x="12" y="17" fontFamily="Inter" fontSize="9" fill="white" fillOpacity="0.7">ACTIVE NOW</text>
        <text x="12" y="32" fontFamily="JetBrains Mono" fontWeight="700" fontSize="15" fill="white">34 students</text>
      </g>

      {/* stars */}
      <path d="M296 92l3.6 7.3 8 1.2-5.8 5.7 1.4 8-7.2-3.8-7.2 3.8 1.4-8-5.8-5.7 8-1.2z" fill="#F5A524" opacity="0.9" />
      <path d="M52 150l2.5 5 5.5.8-4 3.9 1 5.5-5-2.6-5 2.6 1-5.5-4-3.9 5.5-.8z" fill="white" opacity="0.7" />
    </svg>
  );
}

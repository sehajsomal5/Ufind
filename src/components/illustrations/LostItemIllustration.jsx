// src/components/illustrations/LostItemIllustration.jsx
import React from 'react'

export default function LostItemIllustration({ className = '', ...props }) {
  return (
    <svg
      viewBox="0 0 220 220"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <defs>
        {/* Soft shadow */}
        <filter id="lost-shadow" x="-10%" y="-10%" width="120%" height="130%" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="4" stdDeviation="4" floodOpacity="0.08" />
        </filter>
        {/* Clip for sweater stripes */}
        <clipPath id="torso-clip">
          <path d="M50 170 C50 148, 65 140, 95 138 L125 138 C155 140, 170 148, 170 170 L172 215 L48 215 Z" />
        </clipPath>
        <clipPath id="left-arm-clip">
          <path d="M50 170 C48 152, 60 142, 70 140 L88 178 C80 188, 56 182, 50 170 Z" />
        </clipPath>
        <clipPath id="right-arm-clip">
          <path d="M170 170 C172 152, 160 142, 150 140 L132 178 C140 188, 164 182, 170 170 Z" />
        </clipPath>
      </defs>

      {/* Background soft glow / halo */}
      <circle cx="110" cy="115" r="85" fill="rgba(255, 230, 222, 0.45)" />

      {/* Behind-head hair back volume */}
      <path
        d="M68 95 C55 80, 58 50, 85 38 C105 28, 135 28, 152 42 C172 58, 170 85, 158 105 C148 120, 142 128, 140 134 C132 126, 120 132, 110 132 C95 132, 82 126, 75 130 C72 120, 68 108, 68 95 Z"
        fill="#1f2421"
      />

      {/* Neck */}
      <path d="M96 115 L96 142 C104 145, 116 145, 124 142 L124 115 Z" fill="#fcd5c2" />
      <path d="M96 118 C105 125, 115 125, 124 118 L124 126 C115 131, 105 131, 96 126 Z" fill="#f4beaa" opacity="0.6" />

      {/* Torso / Body Base */}
      <path
        d="M50 170 C50 148, 65 140, 95 138 L125 138 C155 140, 170 148, 170 170 L172 215 L48 215 Z"
        fill="#ffffff"
        stroke="#2c332e"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />

      {/* Stripes on sweater body */}
      <g clipPath="url(#torso-clip)">
        <rect x="40" y="146" width="140" height="9" fill="#f48b7d" />
        <rect x="40" y="163" width="140" height="9" fill="#f48b7d" />
        <rect x="40" y="180" width="140" height="9" fill="#f48b7d" />
        <rect x="40" y="197" width="140" height="9" fill="#f48b7d" />
      </g>

      {/* Collar */}
      <path
        d="M93 138 C93 147, 127 147, 127 138"
        fill="none"
        stroke="#2c332e"
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {/* Left arm (holding face) */}
      <path
        d="M50 170 C46 148, 58 138, 72 136 L86 158 L68 185 Z"
        fill="#ffffff"
        stroke="#2c332e"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {/* Left sleeve stripes */}
      <path d="M52 153 L74 145" stroke="#f48b7d" strokeWidth="8" strokeLinecap="round" />
      <path d="M56 168 L80 157" stroke="#f48b7d" strokeWidth="8" strokeLinecap="round" />

      {/* Right arm (holding phone) */}
      <path
        d="M170 170 C174 148, 162 138, 148 136 L134 158 L152 185 Z"
        fill="#ffffff"
        stroke="#2c332e"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {/* Right sleeve stripes */}
      <path d="M168 153 L146 145" stroke="#f48b7d" strokeWidth="8" strokeLinecap="round" />
      <path d="M164 168 L140 157" stroke="#f48b7d" strokeWidth="8" strokeLinecap="round" />

      {/* Face */}
      <path
        d="M84 76 C84 56, 136 56, 136 76 C136 102, 126 122, 110 122 C94 122, 84 102, 84 76 Z"
        fill="#fedbc7"
        stroke="#2c332e"
        strokeWidth="2.5"
      />

      {/* Ears */}
      <path d="M84 82 C79 82, 79 93, 84 94" fill="#fedbc7" stroke="#2c332e" strokeWidth="2.5" />
      <path d="M136 82 C141 82, 141 93, 136 94" fill="#fedbc7" stroke="#2c332e" strokeWidth="2.5" />

      {/* Facial Features - Worried expression */}
      {/* Eyebrows angled up in distress */}
      <path d="M92 73 C97 70, 102 72, 104 75" stroke="#1f2421" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      <path d="M128 73 C123 70, 118 72, 116 75" stroke="#1f2421" strokeWidth="2.2" strokeLinecap="round" fill="none" />

      {/* Eyes looking anxious */}
      <ellipse cx="98" cy="81" rx="3.5" ry="4" fill="#1f2421" />
      <ellipse cx="122" cy="81" rx="3.5" ry="4" fill="#1f2421" />
      <circle cx="97" cy="80" r="1.2" fill="#ffffff" />
      <circle cx="121" cy="80" r="1.2" fill="#ffffff" />

      {/* Nose */}
      <path d="M110 81 L108 90 L113 90" stroke="#d4927b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />

      {/* Worried / wavy mouth */}
      <path d="M103 103 C106 100, 110 104, 113 100 C115 99, 117 101, 118 101" stroke="#2c332e" strokeWidth="2.2" strokeLinecap="round" fill="none" />

      {/* Blush spots */}
      <ellipse cx="92" cy="89" rx="5" ry="3" fill="#fca898" opacity="0.6" />
      <ellipse cx="128" cy="89" rx="5" ry="3" fill="#fca898" opacity="0.6" />

      {/* Hair front / waves and bangs */}
      <path
        d="M80 62 C74 48, 95 36, 110 36 C132 36, 146 45, 142 62 C135 52, 122 50, 112 55 C102 48, 88 52, 80 62 Z"
        fill="#1f2421"
      />
      {/* Side wavy curls framing cheeks */}
      <path d="M84 62 C78 72, 74 85, 78 96 C80 92, 82 82, 85 75 Z" fill="#1f2421" />
      <path d="M136 62 C142 72, 146 85, 142 96 C140 92, 138 82, 135 75 Z" fill="#1f2421" />

      {/* Left hand on cheek in distress */}
      <g>
        <path
          d="M78 116 C76 104, 82 92, 88 90 C92 88, 95 91, 93 96 C90 102, 88 110, 89 118 Z"
          fill="#fedbc7"
          stroke="#2c332e"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
        <path d="M87 95 C86 100, 86 105, 87 110" stroke="#e09e88" strokeWidth="1.5" strokeLinecap="round" />
      </g>

      {/* Smartphone (Right hand) */}
      <g filter="url(#lost-shadow)">
        <rect
          x="137"
          y="72"
          width="20"
          height="38"
          rx="5"
          transform="rotate(12 137 72)"
          fill="#e63946"
          stroke="#2c332e"
          strokeWidth="2.2"
        />
        {/* Phone screen */}
        <rect
          x="140"
          y="77"
          width="14"
          height="28"
          rx="2"
          transform="rotate(12 140 77)"
          fill="#1d3557"
        />
        {/* Screen light glow */}
        <line x1="144" y1="83" x2="152" y2="85" stroke="#a8dadc" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="143" y1="88" x2="149" y2="89" stroke="#a8dadc" strokeWidth="1.5" strokeLinecap="round" />
        {/* Speaker notch */}
        <circle cx="145" cy="76" r="1" fill="#f1faee" />
      </g>

      {/* Right hand fingers gripping phone */}
      <path
        d="M133 92 C131 87, 137 83, 142 86 L143 96 C138 97, 134 96, 133 92 Z"
        fill="#fedbc7"
        stroke="#2c332e"
        strokeWidth="2"
      />
      <path
        d="M132 100 C130 96, 135 93, 140 95 L141 103 C137 104, 133 103, 132 100 Z"
        fill="#fedbc7"
        stroke="#2c332e"
        strokeWidth="2"
      />

      {/* Accent little floating panic / question sparks */}
      <path d="M62 60 L57 53" stroke="#f48b7d" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M53 68 L45 69" stroke="#f48b7d" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M168 55 L175 48" stroke="#f48b7d" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

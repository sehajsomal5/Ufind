// src/components/illustrations/FoundItemIllustration.jsx
import React from 'react'

export default function FoundItemIllustration({ className = '', ...props }) {
  return (
    <svg
      viewBox="0 0 250 210"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <defs>
        {/* Soft shadow filter */}
        <filter id="found-shadow" x="-10%" y="-10%" width="120%" height="130%" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="3" stdDeviation="3" floodOpacity="0.1" />
        </filter>
      </defs>

      {/* Warm background subtle glow */}
      <ellipse cx="125" cy="115" rx="100" ry="80" fill="rgba(254, 243, 199, 0.45)" />

      {/* Bench / Seat for the seated person */}
      <rect x="25" y="152" width="65" height="42" rx="4" fill="#ede8d5" stroke="#4a554d" strokeWidth="2" />
      <line x1="25" y1="152" x2="90" y2="152" stroke="#4a554d" strokeWidth="2.5" />

      {/* Backpack on/behind seated person */}
      <g>
        <rect x="20" y="125" width="22" height="35" rx="8" fill="#58705c" stroke="#2c3830" strokeWidth="2" />
        {/* Backpack flap and pocket */}
        <path d="M20 135 C20 130, 42 130, 42 135 L42 144 L20 144 Z" fill="#465c4a" stroke="#2c3830" strokeWidth="1.5" />
        <rect x="23" y="148" width="16" height="10" rx="3" fill="#6d8772" stroke="#2c3830" strokeWidth="1.2" />
        {/* Strap */}
        <path d="M30 125 C34 118, 42 120, 48 126" stroke="#2c3830" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      </g>

      {/* ========================================================
          SEATED PERSON (LEFT - OWNER RECEIVING ITEM)
          ======================================================== */}
      {/* Seated Person Legs */}
      {/* Thigh (horizontal) */}
      <path
        d="M48 140 C52 135, 75 136, 80 142 L78 158 C72 158, 54 158, 46 154 Z"
        fill="#263228"
        stroke="#2c3830"
        strokeWidth="2.2"
      />
      {/* Lower legs (vertical down from bench) */}
      <path
        d="M74 145 L70 190 C70 192, 64 192, 64 190 L67 150 Z"
        fill="#1e2820"
        stroke="#2c3830"
        strokeWidth="2"
      />
      <path
        d="M80 144 L82 188 C82 192, 76 192, 75 188 L74 148 Z"
        fill="#2c3830"
        stroke="#2c3830"
        strokeWidth="2"
      />
      {/* Shoes */}
      <ellipse cx="65" cy="192" rx="7" ry="4" fill="#3b3b3b" />
      <ellipse cx="80" cy="191" rx="7" ry="4" fill="#3b3b3b" />

      {/* Seated Person Torso - Ochre / Warm Mustard Yellow */}
      <path
        d="M46 108 C48 98, 62 96, 70 102 L68 142 C60 144, 48 142, 45 138 Z"
        fill="#d49b29"
        stroke="#2c3830"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />

      {/* Seated Person Neck & Head */}
      <rect x="53" y="93" width="7" height="10" fill="#fcd5c2" />
      <path
        d="M48 76 C48 68, 62 68, 62 76 C62 87, 56 94, 52 94 C48 94, 48 84, 48 76 Z"
        fill="#fedbc7"
        stroke="#2c3830"
        strokeWidth="2"
      />
      {/* Hair */}
      <path
        d="M46 76 C44 64, 56 60, 64 64 C68 66, 68 74, 62 76 C60 70, 50 70, 48 76 Z"
        fill="#42281d"
      />
      {/* Seated Person Face profile */}
      <circle cx="56" cy="80" r="1.5" fill="#2c3830" /> {/* Eye */}
      <path d="M57 85 C58 87, 61 86, 61 85" stroke="#2c3830" strokeWidth="1.2" strokeLinecap="round" fill="none" /> {/* Smile */}

      {/* Seated Person Arms outstretched in gratitude */}
      {/* Back arm */}
      <path
        d="M58 106 L82 108 L98 102"
        stroke="#fedbc7"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Front arm with yellow sleeve */}
      <path
        d="M62 106 L74 116"
        stroke="#d49b29"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <path
        d="M74 116 L94 114 L106 108"
        stroke="#fedbc7"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Hand open palm */}
      <path
        d="M106 108 C109 106, 113 107, 114 109 C111 112, 107 113, 104 112"
        fill="#fedbc7"
        stroke="#2c3830"
        strokeWidth="1.2"
      />


      {/* ========================================================
          STANDING PERSON (RIGHT - FINDER RETURNING ITEM)
          ======================================================== */}
      {/* Standing Person Legs */}
      {/* Left leg (forward) */}
      <path
        d="M142 128 L138 185 L144 186 L150 130 Z"
        fill="#45544c"
        stroke="#2c3830"
        strokeWidth="2"
      />
      {/* Right leg */}
      <path
        d="M152 128 L154 185 L160 186 L160 130 Z"
        fill="#394740"
        stroke="#2c3830"
        strokeWidth="2"
      />
      {/* Shoes */}
      <path d="M132 188 C132 184, 144 184, 146 188 Z" fill="#2c3830" />
      <path d="M150 188 C150 184, 162 184, 164 188 Z" fill="#2c3830" />

      {/* Standing Person Torso - White t-shirt with dark raglan sleeves */}
      <path
        d="M134 76 C134 68, 162 68, 162 76 L160 128 C152 130, 140 130, 136 128 Z"
        fill="#ffffff"
        stroke="#2c3830"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      {/* Dark collar & sleeve caps */}
      <path d="M142 69 C144 73, 152 73, 154 69" stroke="#2c3830" strokeWidth="2" fill="none" />
      <path d="M134 76 L139 90 L134 94 Z" fill="#2c3830" />
      <path d="M162 76 L157 90 L162 94 Z" fill="#2c3830" />

      {/* Standing Person Neck & Head */}
      <rect x="145" y="60" width="7" height="10" fill="#fcd5c2" />
      <path
        d="M140 46 C140 38, 154 38, 154 46 C154 56, 148 62, 144 62 C140 62, 140 54, 140 46 Z"
        fill="#fedbc7"
        stroke="#2c3830"
        strokeWidth="2"
      />
      {/* Hair */}
      <path
        d="M138 45 C138 34, 152 30, 157 37 C159 42, 156 46, 152 46 C150 40, 142 41, 138 45 Z"
        fill="#2a2e2b"
      />
      {/* Face features */}
      <circle cx="144" cy="50" r="1.5" fill="#2c3830" /> {/* Eye */}
      <path d="M142 55 C144 56, 146 56, 147 54" stroke="#2c3830" strokeWidth="1.2" strokeLinecap="round" fill="none" /> {/* Kind Smile */}

      {/* Standing Person Arms extended forward holding item */}
      {/* Upper arm */}
      <path
        d="M140 84 L128 100"
        stroke="#2c3830"
        strokeWidth="6"
        strokeLinecap="round"
      />
      {/* Forearm extending down to hand over wallet */}
      <path
        d="M128 100 L112 102"
        stroke="#fedbc7"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Second arm assisting */}
      <path
        d="M150 86 L134 102 L116 104"
        stroke="#fedbc7"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* ========================================================
          HANDED-OVER ITEM (WALLET / RECOVERED OBJECT)
          ======================================================== */}
      <g filter="url(#found-shadow)">
        {/* Wallet body */}
        <rect
          x="105"
          y="95"
          width="16"
          height="12"
          rx="2.5"
          transform="rotate(-8 105 95)"
          fill="#8d5b4c"
          stroke="#42251a"
          strokeWidth="1.5"
        />
        {/* Wallet clasp / strap */}
        <line x1="112" y1="94" x2="112" y2="106" stroke="#c48e78" strokeWidth="1.5" />
        {/* Small card / cash edge peeking out */}
        <rect
          x="108"
          y="93"
          width="8"
          height="3"
          rx="1"
          transform="rotate(-8 108 93)"
          fill="#4ade80"
        />
      </g>

      {/* Floating Sparkles of joy / connection */}
      <path d="M110 78 L110 84 M107 81 L113 81" stroke="#eab308" strokeWidth="2" strokeLinecap="round" />
      <path d="M96 88 L96 92 M94 90 L98 90" stroke="#84cc16" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M126 82 L126 86 M124 84 L128 84" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

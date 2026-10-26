import React from 'react';

/**
 * FarmBackground: Continuous ambient animated background featuring:
 * - A traditional red, white & brown warehouse/barn.
 * - A slow-rotating small brown farm windmill.
 * - Long pasture grass and farm trees swaying in a continuous gentle breeze.
 * - Small cartoon animals (cow, sheep, bunny) standing in the meadow with animated blinking eyes.
 * - Floating continuous breeze streamlines drifting across the landscape.
 */
export const FarmBackground: React.FC = () => {
  return (
    <div
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none opacity-40 transition-opacity duration-1000"
      aria-hidden="true"
    >
      {/* 1. SKY BREEZE PARTICLES & STREAMLINES */}
      <div className="absolute inset-0">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          {/* Breeze Stream 1 */}
          <g className="animate-farm-breeze-1">
            <path
              d="M -100 90 Q 200 70, 500 95 T 1100 80"
              fill="none"
              stroke="#3A0F34"
              strokeWidth="1.5"
              strokeDasharray="12 8"
              opacity="0.3"
            />
            <circle cx="280" cy="85" r="2.5" fill="#EAAA00" opacity="0.6" />
            <circle cx="620" cy="90" r="1.8" fill="#3A0F34" opacity="0.4" />
          </g>

          {/* Breeze Stream 2 */}
          <g className="animate-farm-breeze-2">
            <path
              d="M -150 240 Q 250 210, 600 235 T 1300 220"
              fill="none"
              stroke="#3A0F34"
              strokeWidth="1.5"
              strokeDasharray="18 10"
              opacity="0.25"
            />
            <circle cx="340" cy="225" r="2" fill="#EAAA00" opacity="0.5" />
          </g>

          {/* Breeze Stream 3 */}
          <g className="animate-farm-breeze-3">
            <path
              d="M -80 420 Q 300 390, 750 415 T 1400 400"
              fill="none"
              stroke="#3A0F34"
              strokeWidth="2"
              strokeDasharray="15 12"
              opacity="0.3"
            />
            <circle cx="450" cy="405" r="2.2" fill="#3A0F34" opacity="0.4" />
          </g>
        </svg>
      </div>

      {/* 2. ROLLING HILLS & PASTURE LANDSCAPE */}
      <svg
        viewBox="0 0 1440 450"
        preserveAspectRatio="none"
        className="absolute bottom-0 left-0 right-0 w-full h-[380px] sm:h-[440px]"
      >
        <defs>
          {/* Pasture grass clip */}
          <linearGradient id="hillGrad1" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#CBD5E1" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#94A3B8" stopOpacity="0.6" />
          </linearGradient>
          <linearGradient id="hillGrad2" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#94A3B8" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#64748B" stopOpacity="0.7" />
          </linearGradient>
        </defs>

        {/* Distant Rolling Hills */}
        <path
          d="M 0 220 Q 320 160, 680 200 T 1440 180 L 1440 450 L 0 450 Z"
          fill="url(#hillGrad1)"
        />

        {/* Foreground Meadow Hill */}
        <path
          d="M 0 280 Q 420 230, 880 260 T 1440 250 L 1440 450 L 0 450 Z"
          fill="url(#hillGrad2)"
        />

        {/* Pasture Fence Posts & Rails */}
        <g stroke="#78350F" strokeWidth="2" opacity="0.5">
          <line x1="40" y1="260" x2="40" y2="300" strokeWidth="3" />
          <line x1="90" y1="265" x2="90" y2="305" strokeWidth="3" />
          <line x1="140" y1="270" x2="140" y2="310" strokeWidth="3" />
          <line x1="190" y1="275" x2="190" y2="315" strokeWidth="3" />
          <line x1="30" y1="275" x2="200" y2="290" />
          <line x1="30" y1="288" x2="200" y2="303" />
        </g>

        {/* ---------------------------------------------------- */}
        {/* A. RED, WHITE & BROWN WAREHOUSE / BARN */}
        {/* ---------------------------------------------------- */}
        <g transform="translate(180, 160)">
          {/* Main Red Walls */}
          <rect x="0" y="45" width="110" height="75" fill="#991B1B" stroke="#3A0F34" strokeWidth="2.5" />

          {/* White Corner Trim */}
          <rect x="0" y="45" width="8" height="75" fill="#FFFFFF" stroke="#3A0F34" strokeWidth="1.5" />
          <rect x="102" y="45" width="8" height="75" fill="#FFFFFF" stroke="#3A0F34" strokeWidth="1.5" />

          {/* Brown Gambrel Roof */}
          <polygon
            points="-8,45 22,12 88,12 118,45"
            fill="#78350F"
            stroke="#3A0F34"
            strokeWidth="2.5"
          />
          {/* Roof Ridge & Weathervane */}
          <line x1="22" y1="12" x2="88" y2="12" stroke="#5C2605" strokeWidth="3" />
          <line x1="55" y1="12" x2="55" y2="0" stroke="#3A0F34" strokeWidth="2" />
          <polygon points="55,0 65,4 55,8" fill="#EAAA00" stroke="#3A0F34" strokeWidth="1" />

          {/* White Barn Attic Window */}
          <path
            d="M 45 42 Q 55 30 65 42 Z"
            fill="#FFFFFF"
            stroke="#3A0F34"
            strokeWidth="1.5"
          />
          <line x1="55" y1="34" x2="55" y2="42" stroke="#3A0F34" strokeWidth="1.5" />

          {/* Brown Double Barn Doors with White 'X' Bracing */}
          <rect x="34" y="68" width="42" height="52" fill="#5C2605" stroke="#3A0F34" strokeWidth="2" />
          <line x1="55" y1="68" x2="55" y2="120" stroke="#FFFFFF" strokeWidth="2" />
          {/* Left Door X */}
          <line x1="34" y1="68" x2="55" y2="120" stroke="#FFFFFF" strokeWidth="1.5" />
          <line x1="34" y1="120" x2="55" y2="68" stroke="#FFFFFF" strokeWidth="1.5" />
          {/* Right Door X */}
          <line x1="55" y1="68" x2="76" y2="120" stroke="#FFFFFF" strokeWidth="1.5" />
          <line x1="55" y1="120" x2="76" y2="68" stroke="#FFFFFF" strokeWidth="1.5" />

          {/* Side Lean-to Shed (Brown) */}
          <polygon
            points="110,70 142,85 142,120 110,120"
            fill="#854D0E"
            stroke="#3A0F34"
            strokeWidth="2"
          />
          <line x1="110" y1="70" x2="142" y2="85" stroke="#78350F" strokeWidth="3" />
        </g>

        {/* ---------------------------------------------------- */}
        {/* B. SMALL BROWN TRADITIONAL FARM WINDMILL */}
        {/* ---------------------------------------------------- */}
        <g transform="translate(370, 140)">
          {/* Brown Wooden Lattice Tower */}
          <polygon
            points="38,60 46,60 55,140 29,140"
            fill="#78350F"
            stroke="#3A0F34"
            strokeWidth="2"
          />
          {/* Lattice Cross Braces */}
          <line x1="36" y1="80" x2="48" y2="80" stroke="#5C2605" strokeWidth="2" />
          <line x1="33" y1="105" x2="51" y2="105" stroke="#5C2605" strokeWidth="2" />
          <line x1="31" y1="125" x2="53" y2="125" stroke="#5C2605" strokeWidth="2" />
          <line x1="36" y1="80" x2="51" y2="105" stroke="#5C2605" strokeWidth="1.5" />
          <line x1="48" y1="80" x2="33" y2="105" stroke="#5C2605" strokeWidth="1.5" />
          <line x1="33" y1="105" x2="53" y2="125" stroke="#5C2605" strokeWidth="1.5" />
          <line x1="51" y1="105" x2="31" y2="125" stroke="#5C2605" strokeWidth="1.5" />

          {/* Windmill Hub Cap & Tail Vane */}
          <rect x="36" y="52" width="12" height="12" rx="2" fill="#5C2605" stroke="#3A0F34" strokeWidth="1.5" />
          {/* Tail Vane pointing right */}
          <polygon points="48,56 70,52 70,64 48,60" fill="#92400E" stroke="#3A0F34" strokeWidth="1.5" />

          {/* Slow Continuous Rotating Blades Group (Hub at 42, 58) */}
          <g className="animate-farm-windmill" style={{ transformOrigin: '42px 58px' }}>
            {/* Blade 1 (North) */}
            <polygon points="40,58 36,15 48,15 44,58" fill="#854D0E" stroke="#3A0F34" strokeWidth="1.5" />
            <line x1="42" y1="58" x2="42" y2="15" stroke="#5C2605" strokeWidth="1.5" />
            {/* Blade 2 (East) */}
            <polygon
              points="40,58 36,15 48,15 44,58"
              fill="#854D0E"
              stroke="#3A0F34"
              strokeWidth="1.5"
              transform="rotate(90 42 58)"
            />
            {/* Blade 3 (South) */}
            <polygon
              points="40,58 36,15 48,15 44,58"
              fill="#854D0E"
              stroke="#3A0F34"
              strokeWidth="1.5"
              transform="rotate(180 42 58)"
            />
            {/* Blade 4 (West) */}
            <polygon
              points="40,58 36,15 48,15 44,58"
              fill="#854D0E"
              stroke="#3A0F34"
              strokeWidth="1.5"
              transform="rotate(270 42 58)"
            />
            {/* Center Boss */}
            <circle cx="42" cy="58" r="4" fill="#EAAA00" stroke="#3A0F34" strokeWidth="1.5" />
          </g>
        </g>

        {/* ---------------------------------------------------- */}
        {/* C. FARM TREES SWAYING IN BREEZE */}
        {/* ---------------------------------------------------- */}
        {/* Tree 1: Near Barn */}
        <g transform="translate(130, 160)" className="animate-tree-sway">
          {/* Trunk */}
          <path d="M 22 120 Q 20 80, 24 55 Q 28 80, 26 120 Z" fill="#78350F" stroke="#3A0F34" strokeWidth="2" />
          {/* Foliage Canopy */}
          <circle cx="23" cy="50" r="26" fill="#15803D" stroke="#3A0F34" strokeWidth="2" />
          <circle cx="12" cy="42" r="18" fill="#16A34A" stroke="#3A0F34" strokeWidth="1.5" />
          <circle cx="34" cy="40" r="19" fill="#16A34A" stroke="#3A0F34" strokeWidth="1.5" />
          <circle cx="23" cy="28" r="16" fill="#22C55E" stroke="#3A0F34" strokeWidth="1.5" />
        </g>

        {/* Tree 2: Far Right Pasture */}
        <g transform="translate(1320, 180)" className="animate-tree-sway">
          <path d="M 28 110 Q 25 75, 30 50 Q 35 75, 32 110 Z" fill="#78350F" stroke="#3A0F34" strokeWidth="2" />
          <circle cx="30" cy="45" r="30" fill="#15803D" stroke="#3A0F34" strokeWidth="2" />
          <circle cx="16" cy="36" r="20" fill="#16A34A" stroke="#3A0F34" strokeWidth="1.5" />
          <circle cx="44" cy="34" r="21" fill="#22C55E" stroke="#3A0F34" strokeWidth="1.5" />
        </g>

        {/* ---------------------------------------------------- */}
        {/* D. CARTOON ANIMALS WITH BLINKING EYES */}
        {/* ---------------------------------------------------- */}

        {/* 1. CARTOON COW ("Daisy") */}
        <g transform="translate(490, 240)" className="animate-animal-bob">
          {/* Cow Legs */}
          <rect x="18" y="55" width="8" height="26" rx="2" fill="#FFFFFF" stroke="#3A0F34" strokeWidth="2" />
          <rect x="32" y="55" width="8" height="26" rx="2" fill="#FFFFFF" stroke="#3A0F34" strokeWidth="2" />
          <rect x="62" y="55" width="8" height="26" rx="2" fill="#FFFFFF" stroke="#3A0F34" strokeWidth="2" />
          <rect x="76" y="55" width="8" height="26" rx="2" fill="#FFFFFF" stroke="#3A0F34" strokeWidth="2" />
          {/* Hooves */}
          <rect x="18" y="75" width="8" height="6" fill="#3A0F34" />
          <rect x="32" y="75" width="8" height="6" fill="#3A0F34" />
          <rect x="62" y="75" width="8" height="6" fill="#3A0F34" />
          <rect x="76" y="75" width="8" height="6" fill="#3A0F34" />

          {/* Tail with tuft */}
          <path d="M 88 32 Q 98 42, 94 56" fill="none" stroke="#3A0F34" strokeWidth="2" />
          <circle cx="94" cy="58" r="3" fill="#3A0F34" />

          {/* Cow Body */}
          <ellipse cx="55" cy="40" rx="36" ry="24" fill="#FFFFFF" stroke="#3A0F34" strokeWidth="2.5" />
          {/* Black Spots on Body */}
          <path d="M 38 22 Q 48 28, 42 42 Q 32 38, 38 22 Z" fill="#3A0F34" />
          <path d="M 68 28 Q 78 35, 74 48 Q 62 44, 68 28 Z" fill="#3A0F34" />

          {/* Cow Head */}
          <ellipse cx="22" cy="24" rx="16" ry="14" fill="#FFFFFF" stroke="#3A0F34" strokeWidth="2" />
          {/* Patch over one eye */}
          <path d="M 14 14 Q 22 14, 20 25 Q 12 25, 14 14 Z" fill="#3A0F34" />

          {/* Little Horns */}
          <path d="M 14 12 Q 12 4, 18 8" fill="none" stroke="#EAAA00" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M 28 12 Q 32 4, 26 8" fill="none" stroke="#EAAA00" strokeWidth="2.5" strokeLinecap="round" />
          {/* Ears */}
          <ellipse cx="7" cy="18" rx="6" ry="3" fill="#FFFFFF" stroke="#3A0F34" strokeWidth="1.5" />
          <ellipse cx="37" cy="18" rx="6" ry="3" fill="#FFFFFF" stroke="#3A0F34" strokeWidth="1.5" />

          {/* Pink Snout */}
          <ellipse cx="18" cy="31" rx="10" ry="6" fill="#F472B6" stroke="#3A0F34" strokeWidth="1.5" />
          <circle cx="15" cy="31" r="1.5" fill="#3A0F34" />
          <circle cx="21" cy="31" r="1.5" fill="#3A0F34" />

          {/* BLINKING EYES (Left & Right) */}
          <g className="animate-animal-blink">
            {/* Left Eye */}
            <circle cx="16" cy="20" r="3.2" fill="#FFFFFF" stroke="#3A0F34" strokeWidth="1" />
            <circle cx="16" cy="20" r="1.8" fill="#3A0F34" />
            <circle cx="15.2" cy="19.2" r="0.7" fill="#FFFFFF" />

            {/* Right Eye */}
            <circle cx="25" cy="20" r="3.2" fill="#FFFFFF" stroke="#3A0F34" strokeWidth="1" />
            <circle cx="25" cy="20" r="1.8" fill="#3A0F34" />
            <circle cx="24.2" cy="19.2" r="0.7" fill="#FFFFFF" />
          </g>
        </g>

        {/* 2. CARTOON SHEEP ("Barnaby") */}
        <g transform="translate(630, 260)" className="animate-animal-bob-alt">
          {/* Dark Little Legs */}
          <rect x="14" y="38" width="5" height="18" rx="1.5" fill="#3A0F34" />
          <rect x="25" y="38" width="5" height="18" rx="1.5" fill="#3A0F34" />
          <rect x="44" y="38" width="5" height="18" rx="1.5" fill="#3A0F34" />
          <rect x="54" y="38" width="5" height="18" rx="1.5" fill="#3A0F34" />

          {/* Fluffy Cloud Body */}
          <g fill="#F1F5F9" stroke="#3A0F34" strokeWidth="2">
            <circle cx="24" cy="28" r="14" />
            <circle cx="38" cy="22" r="15" />
            <circle cx="52" cy="28" r="14" />
            <circle cx="38" cy="34" r="14" />
          </g>

          {/* Dark Face */}
          <ellipse cx="14" cy="22" rx="10" ry="9" fill="#1E293B" stroke="#3A0F34" strokeWidth="2" />
          {/* Floppy Ears */}
          <ellipse cx="7" cy="16" rx="4" ry="2.5" fill="#1E293B" stroke="#3A0F34" strokeWidth="1.5" />
          <ellipse cx="21" cy="16" rx="4" ry="2.5" fill="#1E293B" stroke="#3A0F34" strokeWidth="1.5" />
          {/* Fluffy Wool Tuft on Forehead */}
          <circle cx="14" cy="13" r="5" fill="#F1F5F9" stroke="#3A0F34" strokeWidth="1.5" />

          {/* SHEEP BLINKING EYES */}
          <g className="animate-animal-blink-delay">
            <circle cx="11" cy="21" r="2.8" fill="#FFFFFF" />
            <circle cx="11" cy="21" r="1.5" fill="#3A0F34" />
            <circle cx="10.5" cy="20.5" r="0.6" fill="#FFFFFF" />

            <circle cx="17" cy="21" r="2.8" fill="#FFFFFF" />
            <circle cx="17" cy="21" r="1.5" fill="#3A0F34" />
            <circle cx="16.5" cy="20.5" r="0.6" fill="#FFFFFF" />
          </g>
        </g>

        {/* 3. CARTOON BUNNY ("Pippin") NESTLED IN GRASS */}
        <g transform="translate(740, 300)" className="animate-animal-bob">
          {/* Bunny Ears */}
          <ellipse cx="8" cy="4" rx="3.5" ry="10" fill="#E2E8F0" stroke="#3A0F34" strokeWidth="1.5" />
          <ellipse cx="8" cy="4" rx="1.8" ry="7" fill="#F472B6" />
          <ellipse cx="16" cy="4" rx="3.5" ry="10" fill="#E2E8F0" stroke="#3A0F34" strokeWidth="1.5" />
          <ellipse cx="16" cy="4" rx="1.8" ry="7" fill="#F472B6" />

          {/* Bunny Head & Body */}
          <ellipse cx="12" cy="24" rx="12" ry="10" fill="#E2E8F0" stroke="#3A0F34" strokeWidth="2" />
          <circle cx="12" cy="14" r="8" fill="#E2E8F0" stroke="#3A0F34" strokeWidth="2" />

          {/* Pink Nose */}
          <polygon points="12,17 10.5,15 13.5,15" fill="#F472B6" />

          {/* BUNNY BLINKING EYES */}
          <g className="animate-animal-blink-bunny">
            <circle cx="9" cy="13" r="2" fill="#3A0F34" />
            <circle cx="8.5" cy="12.5" r="0.6" fill="#FFFFFF" />

            <circle cx="15" cy="13" r="2" fill="#3A0F34" />
            <circle cx="14.5" cy="12.5" r="0.6" fill="#FFFFFF" />
          </g>
        </g>

        {/* ---------------------------------------------------- */}
        {/* E. LONG SWAYING MEADOW GRASS TUFTS */}
        {/* ---------------------------------------------------- */}
        {/* Grass Tuft 1 (Left) */}
        <g transform="translate(80, 310)" className="animate-grass-1" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round">
          <line x1="0" y1="20" x2="-4" y2="0" />
          <line x1="6" y1="20" x2="3" y2="-6" strokeWidth="3" />
          <line x1="12" y1="20" x2="16" y2="2" />
        </g>

        {/* Grass Tuft 2 (Under Barn) */}
        <g transform="translate(290, 275)" className="animate-grass-2" stroke="#15803D" strokeWidth="3" strokeLinecap="round">
          <line x1="0" y1="25" x2="-6" y2="0" />
          <line x1="8" y1="25" x2="2" y2="-10" />
          <line x1="16" y1="25" x2="12" y2="-4" />
          <line x1="24" y1="25" x2="28" y2="2" />
        </g>

        {/* Grass Tuft 3 (Around Cow) */}
        <g transform="translate(470, 315)" className="animate-grass-1" stroke="#16A34A" strokeWidth="3" strokeLinecap="round">
          <line x1="0" y1="24" x2="-5" y2="-4" />
          <line x1="7" y1="24" x2="3" y2="-12" strokeWidth="3.5" />
          <line x1="15" y1="24" x2="18" y2="-2" />
        </g>

        {/* Grass Tuft 4 (Around Bunny) */}
        <g transform="translate(720, 320)" className="animate-grass-2" stroke="#22C55E" strokeWidth="3" strokeLinecap="round">
          <line x1="0" y1="25" x2="-8" y2="-8" />
          <line x1="8" y1="25" x2="2" y2="-15" strokeWidth="3.5" />
          <line x1="16" y1="25" x2="14" y2="-5" />
          <line x1="24" y1="25" x2="28" y2="0" />
        </g>

        {/* Grass Tuft 5 (Far Right) */}
        <g transform="translate(1080, 290)" className="animate-grass-1" stroke="#15803D" strokeWidth="3" strokeLinecap="round">
          <line x1="0" y1="25" x2="-6" y2="-2" />
          <line x1="8" y1="25" x2="4" y2="-14" />
          <line x1="16" y1="25" x2="20" y2="2" />
        </g>

        {/* Grass Tuft 6 */}
        <g transform="translate(1240, 280)" className="animate-grass-2" stroke="#16A34A" strokeWidth="3" strokeLinecap="round">
          <line x1="0" y1="25" x2="-5" y2="-5" />
          <line x1="8" y1="25" x2="2" y2="-12" />
          <line x1="16" y1="25" x2="18" y2="-2" />
        </g>
      </svg>
    </div>
  );
};

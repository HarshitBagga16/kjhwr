import React from 'react';

/**
 * FarmBackground: Full-viewport, bright, lush-green animated farm landscape.
 *
 * Visual Perspective: Camera positioned above, angled at 60 degrees (top-down 2.5D farm view).
 * Elements:
 * - Bright, vibrant rolling green pastures, clover fields, and winding dirt road.
 * - Clusters of long, lush pasture grass swaying gently in the wind.
 * - Traditional red, white & brown farm warehouse / barn seen from 60° above.
 * - Traditional small brown farm windmill with rotating blades.
 * - Swaying orchard & farm shade trees with 60° depth shadows.
 * - Cartoon animals with animated blinking eyes (Daisy the cow, Barnaby the sheep, Pippin the bunny, little chicks).
 * - Continuous gentle breeze streamlines drifting across the landscape.
 */
export const FarmBackground: React.FC = () => {
  return (
    <div
      className="fixed inset-0 w-screen h-screen pointer-events-none z-0 overflow-hidden select-none"
      aria-hidden="true"
    >
      {/* FULL-VIEWPORT 60-DEGREE TOP-DOWN FARM SVG */}
      <svg
        viewBox="0 0 1920 1080"
        preserveAspectRatio="xMidYMid slice"
        className="w-full h-full object-cover"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* 1. Lush Green Pasture Gradients */}
          <linearGradient id="pastureBase" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4ADE80" />   {/* Vibrant Spring Green */}
            <stop offset="45%" stopColor="#22C55E" />  {/* Rich Pasture Green */}
            <stop offset="100%" stopColor="#16A34A" /> {/* Deep Meadow Green */}
          </linearGradient>

          <linearGradient id="pastureHigh" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#86EFAC" />   {/* Bright Sunny Lime */}
            <stop offset="100%" stopColor="#4ADE80" />
          </linearGradient>

          {/* 2. Earthy Dirt Road Gradient */}
          <linearGradient id="dirtRoad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#D97706" />
            <stop offset="100%" stopColor="#B45309" />
          </linearGradient>

          {/* 3. Pond Water Gradient */}
          <linearGradient id="pondWater" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38BDF8" />
            <stop offset="100%" stopColor="#0284C7" />
          </linearGradient>

          {/* 4. Roof Texture Gradient (Warm Brown) */}
          <linearGradient id="barnRoof" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#92400E" />
            <stop offset="100%" stopColor="#78350F" />
          </linearGradient>

          {/* 5. 60-degree Ground Shadow Filter */}
          <filter id="farmShadow" x="-10%" y="-10%" width="130%" height="130%">
            <feDropShadow dx="12" dy="16" stdDeviation="6" floodColor="#14532D" floodOpacity="0.35" />
          </filter>
        </defs>

        {/* ======================================================== */}
        {/* BASE GROUND: VIBRANT BRIGHT GREEN PASTURES & HILLS */}
        {/* ======================================================== */}
        <rect width="1920" height="1080" fill="url(#pastureBase)" />

        {/* Upper Sunlit Meadow (Top Layer at 60° tilt) */}
        <path
          d="M 0 0 L 1920 0 L 1920 480 Q 1400 420, 960 460 T 0 380 Z"
          fill="url(#pastureHigh)"
          opacity="0.85"
        />

        {/* Lower Left Meadow Hillock */}
        <path
          d="M 0 620 Q 420 540, 850 680 T 1920 720 L 1920 1080 L 0 1080 Z"
          fill="#16A34A"
          opacity="0.4"
        />

        {/* Soft Pasture Clover Patches (Bright Light Green Fields) */}
        <ellipse cx="450" cy="180" rx="220" ry="85" fill="#86EFAC" opacity="0.45" />
        <ellipse cx="1480" cy="220" rx="260" ry="95" fill="#86EFAC" opacity="0.4" />
        <ellipse cx="880" cy="850" rx="340" ry="120" fill="#86EFAC" opacity="0.35" />

        {/* ======================================================== */}
        {/* WINDING COUNTRY DIRT TRACTOR TRAIL (60° ANGLE) */}
        {/* ======================================================== */}
        <g opacity="0.85">
          <path
            d="M -50 280 Q 380 340, 680 480 T 1200 680 Q 1550 820, 2000 880"
            fill="none"
            stroke="url(#dirtRoad)"
            strokeWidth="54"
            strokeLinecap="round"
          />
          {/* Wheel Ruts */}
          <path
            d="M -50 270 Q 380 330, 680 470 T 1200 670 Q 1550 810, 2000 870"
            fill="none"
            stroke="#78350F"
            strokeWidth="4"
            strokeDasharray="24 16"
            opacity="0.6"
          />
          <path
            d="M -50 290 Q 380 350, 680 490 T 1200 690 Q 1550 830, 2000 890"
            fill="none"
            stroke="#78350F"
            strokeWidth="4"
            strokeDasharray="20 14"
            opacity="0.6"
          />
        </g>

        {/* Small Duck Pond in Meadow (with reflective blue water) */}
        <g transform="translate(1420, 780)" filter="url(#farmShadow)">
          <ellipse cx="90" cy="60" rx="110" ry="60" fill="#0284C7" stroke="#38BDF8" strokeWidth="4" />
          <ellipse cx="85" cy="55" rx="90" ry="45" fill="url(#pondWater)" />
          {/* Water ripples */}
          <path d="M 50 48 Q 75 42, 100 48" fill="none" stroke="#FFFFFF" strokeWidth="2" opacity="0.6" />
          <path d="M 80 65 Q 110 58, 135 65" fill="none" stroke="#FFFFFF" strokeWidth="2" opacity="0.5" />
          {/* Cute Little Yellow Duck */}
          <ellipse cx="85" cy="55" rx="8" ry="6" fill="#FACC15" />
          <circle cx="80" cy="51" r="5" fill="#FACC15" />
          <polygon points="76,51 70,53 76,55" fill="#EA580C" />
          <circle cx="79" cy="50" r="1" fill="#000000" />
        </g>

        {/* ======================================================== */}
        {/* CONTINUOUS GENTLE BREEZE STREAMLINES */}
        {/* ======================================================== */}
        <g opacity="0.7">
          <g className="animate-farm-breeze-1">
            <path
              d="M -120 160 Q 400 110, 950 180 T 2100 150"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="3.5"
              strokeDasharray="24 16"
              opacity="0.75"
            />
            <circle cx="520" cy="140" r="3.5" fill="#FEF08A" opacity="0.8" />
            <circle cx="1120" cy="165" r="3" fill="#FFFFFF" opacity="0.9" />
          </g>

          <g className="animate-farm-breeze-2">
            <path
              d="M -180 420 Q 450 360, 1100 440 T 2200 400"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="3"
              strokeDasharray="30 18"
              opacity="0.65"
            />
            <circle cx="680" cy="390" r="3" fill="#FEF08A" opacity="0.8" />
          </g>

          <g className="animate-farm-breeze-3">
            <path
              d="M -100 760 Q 550 710, 1300 790 T 2150 750"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="4"
              strokeDasharray="22 14"
              opacity="0.7"
            />
            <circle cx="850" cy="740" r="3.5" fill="#FFFFFF" opacity="0.85" />
          </g>
        </g>

        {/* ======================================================== */}
        {/* A. RED, WHITE & BROWN WAREHOUSE / BARN (60° ANGLE VIEW) */}
        {/* ======================================================== */}
        <g transform="translate(240, 150)" filter="url(#farmShadow)">
          {/* Barn Ground Shadow */}
          <polygon points="-15,185 240,185 285,145 30,145" fill="#14532D" opacity="0.4" />

          {/* 1. Side Red Wall (Angled 60°) */}
          <polygon
            points="180,60 250,90 250,185 180,155"
            fill="#991B1B"
            stroke="#3A0F34"
            strokeWidth="3"
          />
          {/* White Wall Trim */}
          <line x1="250" y1="90" x2="250" y2="185" stroke="#FFFFFF" strokeWidth="4" />
          <line x1="180" y1="60" x2="180" y2="155" stroke="#FFFFFF" strokeWidth="4" />

          {/* 2. Front Red Facade */}
          <polygon
            points="20,60 180,60 180,155 20,155"
            fill="#DC2626"
            stroke="#3A0F34"
            strokeWidth="3.5"
          />
          {/* White Trim around Facade */}
          <rect x="20" y="60" width="160" height="95" fill="none" stroke="#FFFFFF" strokeWidth="4" />

          {/* 3. Brown Pitched Gambrel Roof (Viewed from 60° above) */}
          {/* Main Front Roof Slope */}
          <polygon
            points="0,60 30,10 190,10 180,60"
            fill="url(#barnRoof)"
            stroke="#3A0F34"
            strokeWidth="3.5"
          />
          {/* Right Roof Slope (Depth) */}
          <polygon
            points="180,60 190,10 260,40 250,90"
            fill="#78350F"
            stroke="#3A0F34"
            strokeWidth="3"
          />
          {/* White Roof Trim */}
          <line x1="0" y1="60" x2="30" y2="10" stroke="#FFFFFF" strokeWidth="4" />
          <line x1="30" y1="10" x2="190" y2="10" stroke="#FFFFFF" strokeWidth="4" />
          <line x1="190" y1="10" x2="260" y2="40" stroke="#FFFFFF" strokeWidth="4" />

          {/* Roof Weathervane */}
          <line x1="110" y1="10" x2="110" y2="-12" stroke="#3A0F34" strokeWidth="3" />
          <polygon points="110,-12 124,-7 110,-2" fill="#EAAA00" stroke="#3A0F34" strokeWidth="1.5" />

          {/* White Arched Loft Window */}
          <path
            d="M 85 55 Q 100 38, 115 55 Z"
            fill="#FFFFFF"
            stroke="#3A0F34"
            strokeWidth="2.5"
          />
          <line x1="100" y1="44" x2="100" y2="55" stroke="#3A0F34" strokeWidth="2" />

          {/* 4. Brown Barn Double Doors with Crisp White 'X' Bracing */}
          <rect x="65" y="88" width="70" height="67" fill="#5C2605" stroke="#3A0F34" strokeWidth="3" />
          <line x1="100" y1="88" x2="100" y2="155" stroke="#FFFFFF" strokeWidth="3" />
          {/* Left Door X */}
          <line x1="65" y1="88" x2="100" y2="155" stroke="#FFFFFF" strokeWidth="3" />
          <line x1="65" y1="155" x2="100" y2="88" stroke="#FFFFFF" strokeWidth="3" />
          {/* Right Door X */}
          <line x1="100" y1="88" x2="135" y2="155" stroke="#FFFFFF" strokeWidth="3" />
          <line x1="100" y1="155" x2="135" y2="88" stroke="#FFFFFF" strokeWidth="3" />

          {/* Hay Bale outside barn */}
          <ellipse cx="195" cy="155" rx="16" ry="10" fill="#FACC15" stroke="#78350F" strokeWidth="2" />
        </g>

        {/* ======================================================== */}
        {/* B. SMALL BROWN TRADITIONAL WINDMILL (60° ANGLE VIEW) */}
        {/* ======================================================== */}
        <g transform="translate(1540, 180)" filter="url(#farmShadow)">
          {/* Windmill Shadow */}
          <ellipse cx="60" cy="205" rx="45" ry="18" fill="#14532D" opacity="0.4" />

          {/* Brown 4-Legged Timber Lattice Tower */}
          <polygon
            points="48,70 68,70 82,195 34,195"
            fill="#78350F"
            stroke="#3A0F34"
            strokeWidth="3.5"
          />
          {/* Cross Bracing */}
          <line x1="45" y1="100" x2="71" y2="100" stroke="#5C2605" strokeWidth="3" />
          <line x1="41" y1="135" x2="75" y2="135" stroke="#5C2605" strokeWidth="3" />
          <line x1="37" y1="170" x2="79" y2="170" stroke="#5C2605" strokeWidth="3" />
          <line x1="45" y1="100" x2="75" y2="135" stroke="#5C2605" strokeWidth="2" />
          <line x1="71" y1="100" x2="41" y2="135" stroke="#5C2605" strokeWidth="2" />
          <line x1="41" y1="135" x2="79" y2="170" stroke="#5C2605" strokeWidth="2" />
          <line x1="75" y1="135" x2="37" y2="170" stroke="#5C2605" strokeWidth="2" />

          {/* Cap & Tail Vane */}
          <rect x="46" y="58" width="24" height="15" rx="3" fill="#5C2605" stroke="#3A0F34" strokeWidth="2.5" />
          {/* Tail Vane pointing right */}
          <polygon points="68,62 105,55 105,75 68,68" fill="#92400E" stroke="#3A0F34" strokeWidth="2" />

          {/* SLOW ROTATING 4-BLADE ROTOR (Center Hub at 58, 65) */}
          <g className="animate-farm-windmill" style={{ transformOrigin: '58px 65px' }}>
            {/* Blade 1 (North) */}
            <polygon points="55,65 48,10 68,10 61,65" fill="#854D0E" stroke="#3A0F34" strokeWidth="2" />
            <line x1="58" y1="65" x2="58" y2="10" stroke="#5C2605" strokeWidth="2.5" />
            {/* Blade 2 (East) */}
            <polygon
              points="55,65 48,10 68,10 61,65"
              fill="#854D0E"
              stroke="#3A0F34"
              strokeWidth="2"
              transform="rotate(90 58 65)"
            />
            {/* Blade 3 (South) */}
            <polygon
              points="55,65 48,10 68,10 61,65"
              fill="#854D0E"
              stroke="#3A0F34"
              strokeWidth="2"
              transform="rotate(180 58 65)"
            />
            {/* Blade 4 (West) */}
            <polygon
              points="55,65 48,10 68,10 61,65"
              fill="#854D0E"
              stroke="#3A0F34"
              strokeWidth="2"
              transform="rotate(270 58 65)"
            />
            {/* Windmill Hub Cap */}
            <circle cx="58" cy="65" r="6" fill="#EAAA00" stroke="#3A0F34" strokeWidth="2" />
          </g>
        </g>

        {/* ======================================================== */}
        {/* C. FARM TREES SWAYING IN BREEZE (60° ANGLE CANOPIES) */}
        {/* ======================================================== */}
        {/* Tree 1: Near Barn (Left) */}
        <g transform="translate(140, 180)" filter="url(#farmShadow)" className="animate-tree-sway">
          <ellipse cx="50" cy="170" rx="35" ry="14" fill="#14532D" opacity="0.35" />
          {/* Trunk */}
          <path d="M 44 170 Q 42 110, 48 70 Q 58 110, 54 170 Z" fill="#78350F" stroke="#3A0F34" strokeWidth="3" />
          {/* Lush Green Canopy Seen From Above */}
          <circle cx="48" cy="65" r="46" fill="#15803D" stroke="#3A0F34" strokeWidth="3.5" />
          <circle cx="28" cy="52" r="32" fill="#16A34A" stroke="#3A0F34" strokeWidth="2.5" />
          <circle cx="68" cy="50" r="34" fill="#22C55E" stroke="#3A0F34" strokeWidth="2.5" />
          <circle cx="48" cy="32" r="28" fill="#4ADE80" stroke="#3A0F34" strokeWidth="2" />
          {/* Cute red apples */}
          <circle cx="36" cy="48" r="4" fill="#EF4444" />
          <circle cx="58" cy="42" r="4" fill="#EF4444" />
          <circle cx="48" cy="68" r="4" fill="#EF4444" />
        </g>

        {/* Tree 2: Center Orchard */}
        <g transform="translate(1080, 120)" filter="url(#farmShadow)" className="animate-tree-sway">
          <ellipse cx="60" cy="180" rx="40" ry="16" fill="#14532D" opacity="0.35" />
          <path d="M 54 180 Q 52 115, 58 75 Q 68 115, 64 180 Z" fill="#78350F" stroke="#3A0F34" strokeWidth="3" />
          <circle cx="58" cy="70" r="50" fill="#15803D" stroke="#3A0F34" strokeWidth="3.5" />
          <circle cx="38" cy="55" r="35" fill="#16A34A" stroke="#3A0F34" strokeWidth="2.5" />
          <circle cx="78" cy="52" r="36" fill="#22C55E" stroke="#3A0F34" strokeWidth="2.5" />
          <circle cx="58" cy="34" r="30" fill="#4ADE80" stroke="#3A0F34" strokeWidth="2" />
        </g>

        {/* Tree 3: Bottom Right Meadow */}
        <g transform="translate(1720, 680)" filter="url(#farmShadow)" className="animate-tree-sway">
          <ellipse cx="60" cy="175" rx="45" ry="18" fill="#14532D" opacity="0.35" />
          <path d="M 52 175 Q 50 110, 56 65 Q 66 110, 62 175 Z" fill="#78350F" stroke="#3A0F34" strokeWidth="3" />
          <circle cx="58" cy="65" r="52" fill="#15803D" stroke="#3A0F34" strokeWidth="3.5" />
          <circle cx="36" cy="50" r="36" fill="#16A34A" stroke="#3A0F34" strokeWidth="2.5" />
          <circle cx="80" cy="48" r="38" fill="#22C55E" stroke="#3A0F34" strokeWidth="2.5" />
        </g>

        {/* ======================================================== */}
        {/* D. CARTOON ANIMALS GRAZING WITH BLINKING EYES (60° ANGLE) */}
        {/* ======================================================== */}

        {/* 1. CARTOON COW ("Daisy") - Grazing in center meadow */}
        <g transform="translate(680, 520)" filter="url(#farmShadow)" className="animate-animal-bob">
          {/* Ground Shadow at 60° */}
          <ellipse cx="65" cy="92" rx="48" ry="18" fill="#14532D" opacity="0.4" />

          {/* White Legs with Black Hooves */}
          <rect x="24" y="65" width="10" height="30" rx="3" fill="#FFFFFF" stroke="#3A0F34" strokeWidth="2.5" />
          <rect x="42" y="65" width="10" height="30" rx="3" fill="#FFFFFF" stroke="#3A0F34" strokeWidth="2.5" />
          <rect x="78" y="65" width="10" height="30" rx="3" fill="#FFFFFF" stroke="#3A0F34" strokeWidth="2.5" />
          <rect x="96" y="65" width="10" height="30" rx="3" fill="#FFFFFF" stroke="#3A0F34" strokeWidth="2.5" />
          <rect x="24" y="88" width="10" height="7" fill="#3A0F34" />
          <rect x="42" y="88" width="10" height="7" fill="#3A0F34" />
          <rect x="78" y="88" width="10" height="7" fill="#3A0F34" />
          <rect x="96" y="88" width="10" height="7" fill="#3A0F34" />

          {/* Tail with tuft */}
          <path d="M 112 40 Q 126 55, 120 74" fill="none" stroke="#3A0F34" strokeWidth="2.5" />
          <circle cx="120" cy="76" r="4" fill="#3A0F34" />

          {/* Chubby Cow Body */}
          <ellipse cx="68" cy="48" rx="46" ry="30" fill="#FFFFFF" stroke="#3A0F34" strokeWidth="3" />
          {/* Big Black Spots */}
          <path d="M 44 26 Q 58 34, 52 50 Q 38 46, 44 26 Z" fill="#3A0F34" />
          <path d="M 85 34 Q 98 44, 92 60 Q 78 54, 85 34 Z" fill="#3A0F34" />

          {/* Cow Head (Seen from 60° above, looking at viewer) */}
          <ellipse cx="26" cy="30" rx="20" ry="18" fill="#FFFFFF" stroke="#3A0F34" strokeWidth="3" />
          <path d="M 16 16 Q 26 16, 24 30 Q 14 30, 16 16 Z" fill="#3A0F34" />

          {/* Little Yellow Horns */}
          <path d="M 16 14 Q 13 4, 21 9" fill="none" stroke="#EAAA00" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M 34 14 Q 39 4, 31 9" fill="none" stroke="#EAAA00" strokeWidth="3.5" strokeLinecap="round" />
          {/* Ears */}
          <ellipse cx="8" cy="22" rx="7" ry="4" fill="#FFFFFF" stroke="#3A0F34" strokeWidth="2" />
          <ellipse cx="44" cy="22" rx="7" ry="4" fill="#FFFFFF" stroke="#3A0F34" strokeWidth="2" />

          {/* Cute Pink Snout */}
          <ellipse cx="22" cy="38" rx="13" ry="8" fill="#F472B6" stroke="#3A0F34" strokeWidth="2" />
          <circle cx="18" cy="38" r="2" fill="#3A0F34" />
          <circle cx="26" cy="38" r="2" fill="#3A0F34" />

          {/* CARTOON BLINKING EYES (Daisy) */}
          <g className="animate-animal-blink">
            {/* Left Eye */}
            <circle cx="18" cy="24" r="4.2" fill="#FFFFFF" stroke="#3A0F34" strokeWidth="1.5" />
            <circle cx="18" cy="24" r="2.4" fill="#3A0F34" />
            <circle cx="17" cy="23" r="1" fill="#FFFFFF" />

            {/* Right Eye */}
            <circle cx="30" cy="24" r="4.2" fill="#FFFFFF" stroke="#3A0F34" strokeWidth="1.5" />
            <circle cx="30" cy="24" r="2.4" fill="#3A0F34" />
            <circle cx="29" cy="23" r="1" fill="#FFFFFF" />
          </g>
        </g>

        {/* 2. CARTOON SHEEP ("Barnaby") - Right meadow */}
        <g transform="translate(1260, 480)" filter="url(#farmShadow)" className="animate-animal-bob-alt">
          {/* Sheep Ground Shadow */}
          <ellipse cx="45" cy="65" rx="38" ry="14" fill="#14532D" opacity="0.4" />

          {/* Little Dark Legs */}
          <rect x="18" y="44" width="7" height="22" rx="2" fill="#3A0F34" />
          <rect x="32" y="44" width="7" height="22" rx="2" fill="#3A0F34" />
          <rect x="56" y="44" width="7" height="22" rx="2" fill="#3A0F34" />
          <rect x="68" y="44" width="7" height="22" rx="2" fill="#3A0F34" />

          {/* Puffy Cloud Wool Body */}
          <g fill="#F8FAFC" stroke="#3A0F34" strokeWidth="2.5">
            <circle cx="30" cy="32" r="18" />
            <circle cx="48" cy="25" r="19" />
            <circle cx="66" cy="32" r="18" />
            <circle cx="48" cy="40" r="18" />
          </g>

          {/* Dark Charcoal Sheep Head */}
          <ellipse cx="18" cy="25" rx="13" ry="12" fill="#1E293B" stroke="#3A0F34" strokeWidth="2.5" />
          {/* Floppy Ears */}
          <ellipse cx="9" cy="18" rx="6" ry="3.5" fill="#1E293B" stroke="#3A0F34" strokeWidth="1.8" />
          <ellipse cx="27" cy="18" rx="6" ry="3.5" fill="#1E293B" stroke="#3A0F34" strokeWidth="1.8" />
          {/* White Forehead Wool Puff */}
          <circle cx="18" cy="14" r="6" fill="#F8FAFC" stroke="#3A0F34" strokeWidth="2" />

          {/* SHEEP BLINKING EYES (Barnaby) */}
          <g className="animate-animal-blink-delay">
            <circle cx="14" cy="24" r="3.6" fill="#FFFFFF" />
            <circle cx="14" cy="24" r="2" fill="#3A0F34" />
            <circle cx="13" cy="23.2" r="0.8" fill="#FFFFFF" />

            <circle cx="22" cy="24" r="3.6" fill="#FFFFFF" />
            <circle cx="22" cy="24" r="2" fill="#3A0F34" />
            <circle cx="21" cy="23.2" r="0.8" fill="#FFFFFF" />
          </g>
        </g>

        {/* 3. CARTOON BUNNY ("Pippin") - Sitting by long grass */}
        <g transform="translate(980, 640)" filter="url(#farmShadow)" className="animate-animal-bob">
          <ellipse cx="18" cy="38" rx="16" ry="8" fill="#14532D" opacity="0.35" />

          {/* Long Bunny Ears with Pink Inner */}
          <ellipse cx="12" cy="6" rx="4.5" ry="14" fill="#F1F5F9" stroke="#3A0F34" strokeWidth="2" />
          <ellipse cx="12" cy="6" rx="2.5" ry="10" fill="#F472B6" />
          <ellipse cx="24" cy="6" rx="4.5" ry="14" fill="#F1F5F9" stroke="#3A0F34" strokeWidth="2" />
          <ellipse cx="24" cy="6" rx="2.5" ry="10" fill="#F472B6" />

          {/* Bunny Body & Head */}
          <ellipse cx="18" cy="32" rx="15" ry="13" fill="#F1F5F9" stroke="#3A0F34" strokeWidth="2.5" />
          <circle cx="18" cy="19" r="11" fill="#F1F5F9" stroke="#3A0F34" strokeWidth="2.5" />
          <polygon points="18,23 16,20 20,20" fill="#F472B6" />

          {/* BUNNY BLINKING EYES */}
          <g className="animate-animal-blink-bunny">
            <circle cx="14" cy="18" r="2.8" fill="#3A0F34" />
            <circle cx="13.2" cy="17.2" r="0.8" fill="#FFFFFF" />

            <circle cx="22" cy="18" r="2.8" fill="#3A0F34" />
            <circle cx="21.2" cy="17.2" r="0.8" fill="#FFFFFF" />
          </g>
        </g>

        {/* 4. LITTLE YELLOW CHICKS BY BARNYARD */}
        <g transform="translate(480, 260)">
          <ellipse cx="12" cy="16" rx="9" ry="7" fill="#FACC15" stroke="#3A0F34" strokeWidth="1.5" />
          <circle cx="8" cy="11" r="5" fill="#FACC15" stroke="#3A0F34" strokeWidth="1.5" />
          <polygon points="4,11 0,13 4,14" fill="#EA580C" />
          <circle cx="7" cy="10" r="1" fill="#000000" />
          <line x1="10" y1="22" x2="10" y2="28" stroke="#EA580C" strokeWidth="1.5" />
          <line x1="15" y1="22" x2="15" y2="28" stroke="#EA580C" strokeWidth="1.5" />
        </g>

        {/* ======================================================== */}
        {/* E. LONG, LUSH PASTURE GRASS SWAYING IN BREEZE (60° ANGLE) */}
        {/* ======================================================== */}

        {/* Grass Cluster 1: Barnyard Path */}
        <g transform="translate(180, 240)" className="animate-grass-1" stroke="#15803D" strokeLinecap="round">
          <line x1="0" y1="35" x2="-8" y2="0" strokeWidth="4.5" />
          <line x1="10" y1="35" x2="4" y2="-12" strokeWidth="5" />
          <line x1="20" y1="35" x2="22" y2="4" strokeWidth="4" />
          <line x1="30" y1="35" x2="38" y2="-8" strokeWidth="4.5" />
        </g>

        {/* Grass Cluster 2: Center Meadow */}
        <g transform="translate(580, 480)" className="animate-grass-2" stroke="#16A34A" strokeLinecap="round">
          <line x1="0" y1="40" x2="-12" y2="-5" strokeWidth="5" />
          <line x1="12" y1="40" x2="2" y2="-18" strokeWidth="5.5" />
          <line x1="24" y1="40" x2="20" y2="-6" strokeWidth="4.5" />
          <line x1="36" y1="40" x2="44" y2="2" strokeWidth="5" />
        </g>

        {/* Grass Cluster 3: Around Daisy the Cow */}
        <g transform="translate(820, 560)" className="animate-grass-1" stroke="#15803D" strokeLinecap="round">
          <line x1="0" y1="38" x2="-10" y2="-8" strokeWidth="5" />
          <line x1="14" y1="38" x2="4" y2="-20" strokeWidth="6" />
          <line x1="28" y1="38" x2="32" y2="-4" strokeWidth="4.5" />
        </g>

        {/* Grass Cluster 4: Surrounding Pippin the Bunny */}
        <g transform="translate(940, 680)" className="animate-grass-2" stroke="#22C55E" strokeLinecap="round">
          <line x1="0" y1="42" x2="-14" y2="-10" strokeWidth="5.5" />
          <line x1="14" y1="42" x2="2" y2="-22" strokeWidth="6" />
          <line x1="26" y1="42" x2="22" y2="-10" strokeWidth="5" />
          <line x1="38" y1="42" x2="46" y2="0" strokeWidth="5" />
          <line x1="50" y1="42" x2="62" y2="-12" strokeWidth="4.5" />
        </g>

        {/* Grass Cluster 5: By the Sheep Meadow */}
        <g transform="translate(1180, 520)" className="animate-grass-1" stroke="#16A34A" strokeLinecap="round">
          <line x1="0" y1="40" x2="-10" y2="-8" strokeWidth="5" />
          <line x1="12" y1="40" x2="4" y2="-18" strokeWidth="5.5" />
          <line x1="24" y1="40" x2="26" y2="-4" strokeWidth="4.5" />
        </g>

        {/* Grass Cluster 6: Around Windmill */}
        <g transform="translate(1480, 260)" className="animate-grass-2" stroke="#15803D" strokeLinecap="round">
          <line x1="0" y1="36" x2="-8" y2="-6" strokeWidth="4.5" />
          <line x1="12" y1="36" x2="6" y2="-16" strokeWidth="5" />
          <line x1="24" y1="36" x2="28" y2="0" strokeWidth="4" />
        </g>

        {/* Grass Cluster 7: Near Pond Edge */}
        <g transform="translate(1360, 820)" className="animate-grass-1" stroke="#22C55E" strokeLinecap="round">
          <line x1="0" y1="44" x2="-14" y2="-12" strokeWidth="6" />
          <line x1="15" y1="44" x2="4" y2="-24" strokeWidth="6.5" />
          <line x1="30" y1="44" x2="34" y2="-8" strokeWidth="5" />
          <line x1="45" y1="44" x2="55" y2="-16" strokeWidth="5.5" />
        </g>

        {/* Grass Cluster 8: Bottom Left Meadow */}
        <g transform="translate(120, 840)" className="animate-grass-2" stroke="#15803D" strokeLinecap="round">
          <line x1="0" y1="42" x2="-12" y2="-10" strokeWidth="5.5" />
          <line x1="14" y1="42" x2="3" y2="-20" strokeWidth="6" />
          <line x1="28" y1="42" x2="32" y2="-4" strokeWidth="5" />
        </g>

        {/* Grass Cluster 9: Bottom Right Meadow */}
        <g transform="translate(1620, 920)" className="animate-grass-1" stroke="#16A34A" strokeLinecap="round">
          <line x1="0" y1="40" x2="-10" y2="-8" strokeWidth="5" />
          <line x1="12" y1="40" x2="5" y2="-18" strokeWidth="5.5" />
          <line x1="24" y1="40" x2="28" y2="-4" strokeWidth="4.5" />
        </g>
      </svg>
    </div>
  );
};

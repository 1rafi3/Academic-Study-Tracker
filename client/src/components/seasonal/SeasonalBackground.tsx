import React, { useEffect, useState, useMemo } from 'react';
import { useSeasonal } from '../../context/SeasonalContext.js';
import { useTheme } from '../../context/ThemeContext.js';

export const SeasonalBackground: React.FC = () => {
  const { isEnabled, activeSeason, isMinimalMotion } = useSeasonal();
  const { actualTheme } = useTheme();
  const [isTabInactive, setIsTabInactive] = useState(false);

  // Pause animations automatically when the browser tab is not active
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabInactive(document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const gradients = useMemo(() => {
    return actualTheme === 'dark'
      ? activeSeason.theme.darkGradients
      : activeSeason.theme.lightGradients;
  }, [actualTheme, activeSeason]);

  if (!isEnabled) {
    return null;
  }

  const baseClasses = isTabInactive ? 'seasonal-paused' : '';

  return (
    <>
      {/* 1. Underlying Atmospheric Glow & Gradients (Layered at z-0 behind cards) */}
      <div
        className={`fixed inset-0 pointer-events-none overflow-hidden z-0 print:hidden select-none transition-opacity duration-1000 ${baseClasses}`}
        aria-hidden="true"
      >
        {gradients.map((gradient, index) => (
          <div
            key={`seasonal-gradient-${index}`}
            className="absolute inset-0 transition-all duration-1000"
            style={{ backgroundImage: gradient }}
          />
        ))}
      </div>

      {/* 2. Floating Visual Particles Layer (Snowfall, Rain, Petals, Leaves, Kash fluff)
             Positioned at z-25 with pointer-events-none so they glide gracefully
             OVER the cards and calendar across the entire screen without blocking clicks! */}
      {!isMinimalMotion && (
        <div
          className={`fixed inset-0 pointer-events-none overflow-hidden z-25 print:hidden select-none ${baseClasses}`}
          aria-hidden="true"
        >
          {/* Sheet (Winter): Gentle Beautiful Snowfall (সুষম তুষারপাত) */}
          {activeSeason.id === 'sheet' && <SheetAtmosphere />}

          {/* Barsha (Monsoon): Slanted Continuous Rainfall (বৃষ্টিপাত) */}
          {activeSeason.id === 'barsha' && <BarshaAtmosphere />}

          {/* Basanta (Spring): Fluttering Colorful Flower Petals (পলাশ ও কৃষ্ণচূড়া) */}
          {activeSeason.id === 'basanta' && <BasantaAtmosphere />}

          {/* Grishma (Summer): Warm Sunlight, Rotating Sunrays & Solar Shimmer */}
          {activeSeason.id === 'grishma' && <GrishmaAtmosphere />}

          {/* Sharat (Autumn): Kash Flower Fluff (কাশফুলের রেণু) & Clouds */}
          {activeSeason.id === 'sharat' && <SharatAtmosphere />}

          {/* Hemanta (Late Autumn): Falling Golden Leaves, Ripe Grain & Pollen */}
          {activeSeason.id === 'hemanta' && <HemantaAtmosphere />}
        </div>
      )}
    </>
  );
};

/* ========================================================================= */
/* 1. Sheet (শীত / Winter) Atmosphere - Snowfall (সুষম তুষারপাত)              */
/* ========================================================================= */
interface SnowflakeItem {
  id: number;
  left: string;
  delay: string;
  duration: string;
  size: number;
  type: 'dot' | 'crystal';
}

const SheetAtmosphere: React.FC = () => {
  // 36 diverse snowflakes across the screen with negative delays so they are already falling immediately
  const snowflakes = useMemo<SnowflakeItem[]>(
    () => [
      { id: 1, left: '2%', delay: '-1.5s', duration: '6.5s', size: 10, type: 'dot' },
      { id: 2, left: '6%', delay: '-5.2s', duration: '8.2s', size: 18, type: 'crystal' },
      { id: 3, left: '11%', delay: '-3.1s', duration: '7.1s', size: 8, type: 'dot' },
      { id: 4, left: '16%', delay: '-6.8s', duration: '8.8s', size: 20, type: 'crystal' },
      { id: 5, left: '21%', delay: '-0.8s', duration: '6.9s', size: 12, type: 'dot' },
      { id: 6, left: '26%', delay: '-4.4s', duration: '7.8s', size: 16, type: 'crystal' },
      { id: 7, left: '31%', delay: '-2.2s', duration: '6.4s', size: 9, type: 'dot' },
      { id: 8, left: '36%', delay: '-5.9s', duration: '8.5s', size: 22, type: 'crystal' },
      { id: 9, left: '41%', delay: '-1.1s', duration: '7.3s', size: 11, type: 'dot' },
      { id: 10, left: '46%', delay: '-4.7s', duration: '8.0s', size: 17, type: 'crystal' },
      { id: 11, left: '51%', delay: '-3.5s', duration: '6.7s', size: 10, type: 'dot' },
      { id: 12, left: '56%', delay: '-6.2s', duration: '8.9s', size: 19, type: 'crystal' },
      { id: 13, left: '61%', delay: '-0.5s', duration: '7.0s', size: 8, type: 'dot' },
      { id: 14, left: '66%', delay: '-4.9s', duration: '8.3s', size: 21, type: 'crystal' },
      { id: 15, left: '71%', delay: '-2.7s', duration: '6.6s', size: 12, type: 'dot' },
      { id: 16, left: '76%', delay: '-5.5s', duration: '8.7s', size: 16, type: 'crystal' },
      { id: 17, left: '81%', delay: '-1.8s', duration: '7.4s', size: 9, type: 'dot' },
      { id: 18, left: '86%', delay: '-6.5s', duration: '9.0s', size: 18, type: 'crystal' },
      { id: 19, left: '91%', delay: '-3.8s', duration: '6.8s', size: 11, type: 'dot' },
      { id: 20, left: '96%', delay: '-5.1s', duration: '8.4s', size: 20, type: 'crystal' },
      // Second layer of snowflakes for rich density
      { id: 21, left: '4%', delay: '-7.2s', duration: '9.2s', size: 14, type: 'dot' },
      { id: 22, left: '14%', delay: '-8.0s', duration: '7.5s', size: 15, type: 'crystal' },
      { id: 23, left: '24%', delay: '-6.1s', duration: '8.6s', size: 10, type: 'dot' },
      { id: 24, left: '34%', delay: '-7.8s', duration: '9.4s', size: 17, type: 'crystal' },
      { id: 25, left: '44%', delay: '-8.4s', duration: '7.2s', size: 12, type: 'dot' },
      { id: 26, left: '54%', delay: '-7.0s', duration: '8.8s', size: 16, type: 'crystal' },
      { id: 27, left: '64%', delay: '-8.6s', duration: '9.1s', size: 9, type: 'dot' },
      { id: 28, left: '74%', delay: '-6.7s', duration: '7.7s', size: 19, type: 'crystal' },
      { id: 29, left: '84%', delay: '-8.2s', duration: '8.5s', size: 11, type: 'dot' },
      { id: 30, left: '94%', delay: '-7.4s', duration: '9.3s', size: 18, type: 'crystal' },
    ],
    []
  );

  return (
    <div className="absolute inset-0 seasonal-animated-element pointer-events-none">
      {/* Soft Winter Frost Dawn Horizon */}
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[750px] h-[350px] rounded-full bg-cyan-100/20 dark:bg-cyan-900/15 blur-3xl" />

      {/* Falling Snowflakes */}
      {snowflakes.map((flake) => (
        <div
          key={`snow-${flake.id}`}
          className="absolute top-0 animate-seasonal-snow pointer-events-none"
          style={{
            left: flake.left,
            animationDelay: flake.delay,
            animationDuration: flake.duration,
          }}
        >
          {flake.type === 'crystal' ? (
            <svg
              width={flake.size}
              height={flake.size}
              viewBox="0 0 24 24"
              fill="none"
              stroke="#ffffff"
              strokeWidth="2.2"
              strokeLinecap="round"
              className="drop-shadow-[0_0_8px_rgba(255,255,255,0.95)]"
            >
              <line x1="12" y1="2" x2="12" y2="22" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <line x1="5" y1="5" x2="19" y2="19" />
              <line x1="5" y1="19" x2="19" y2="5" />
              <circle cx="12" cy="12" r="2" fill="white" />
            </svg>
          ) : (
            <div
              className="rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.95)]"
              style={{
                width: flake.size,
                height: flake.size,
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
};

/* ========================================================================= */
/* 2. Barsha (বর্ষা / Monsoon) Atmosphere - Continuous Rainfall (বৃষ্টিপাত)     */
/* ========================================================================= */
const BarshaAtmosphere: React.FC = () => {
  const rainDrops = useMemo(
    () => [
      { id: 1, left: '3%', delay: '-0.2s', duration: '0.85s', height: '65px', width: '2.5px' },
      { id: 2, left: '7%', delay: '-0.7s', duration: '0.95s', height: '55px', width: '2px' },
      { id: 3, left: '12%', delay: '-0.4s', duration: '0.8s', height: '70px', width: '2.5px' },
      { id: 4, left: '17%', delay: '-0.85s', duration: '1.0s', height: '58px', width: '2px' },
      { id: 5, left: '22%', delay: '-0.15s', duration: '0.9s', height: '68px', width: '2.5px' },
      { id: 6, left: '27%', delay: '-0.6s', duration: '0.85s', height: '52px', width: '2px' },
      { id: 7, left: '32%', delay: '-0.35s', duration: '0.78s', height: '75px', width: '2.5px' },
      { id: 8, left: '37%', delay: '-0.9s', duration: '0.95s', height: '60px', width: '2px' },
      { id: 9, left: '42%', delay: '-0.25s', duration: '0.88s', height: '72px', width: '2.5px' },
      { id: 10, left: '47%', delay: '-0.75s', duration: '1.02s', height: '54px', width: '2px' },
      { id: 11, left: '52%', delay: '-0.45s', duration: '0.82s', height: '70px', width: '2.5px' },
      { id: 12, left: '57%', delay: '-0.1s', duration: '0.92s', height: '62px', width: '2px' },
      { id: 13, left: '62%', delay: '-0.65s', duration: '0.86s', height: '68px', width: '2.5px' },
      { id: 14, left: '67%', delay: '-0.3s', duration: '0.98s', height: '56px', width: '2px' },
      { id: 15, left: '72%', delay: '-0.8s', duration: '0.84s', height: '74px', width: '2.5px' },
      { id: 16, left: '77%', delay: '-0.5s', duration: '0.94s', height: '64px', width: '2px' },
      { id: 17, left: '82%', delay: '-0.18s', duration: '0.87s', height: '70px', width: '2.5px' },
      { id: 18, left: '87%', delay: '-0.72s', duration: '1.0s', height: '55px', width: '2px' },
      { id: 19, left: '92%', delay: '-0.38s', duration: '0.83s', height: '72px', width: '2.5px' },
      { id: 20, left: '97%', delay: '-0.88s', duration: '0.96s', height: '60px', width: '2px' },
      // Secondary density layer
      { id: 21, left: '5%', delay: '-1.1s', duration: '0.9s', height: '62px', width: '2px' },
      { id: 22, left: '19%', delay: '-1.3s', duration: '0.82s', height: '70px', width: '2.5px' },
      { id: 23, left: '34%', delay: '-1.15s', duration: '0.95s', height: '58px', width: '2px' },
      { id: 24, left: '49%', delay: '-1.4s', duration: '0.85s', height: '74px', width: '2.5px' },
      { id: 25, left: '64%', delay: '-1.2s', duration: '0.92s', height: '60px', width: '2px' },
      { id: 26, left: '79%', delay: '-1.35s', duration: '0.88s', height: '68px', width: '2.5px' },
      { id: 27, left: '94%', delay: '-1.25s', duration: '0.98s', height: '64px', width: '2px' },
    ],
    []
  );

  return (
    <div className="absolute inset-0 seasonal-animated-element pointer-events-none">
      {/* Monsoon Dark Lush Sky Glow */}
      <div className="absolute -top-40 left-1/3 w-[650px] h-[500px] rounded-full bg-emerald-600/15 dark:bg-emerald-800/20 blur-3xl" />
      <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-cyan-700/15 dark:bg-cyan-900/15 blur-3xl" />

      {/* Distant soft atmospheric lightning */}
      <div className="absolute inset-0 bg-sky-200/15 pointer-events-none animate-seasonal-lightning" />

      {/* Falling Raindrops */}
      {rainDrops.map((drop) => (
        <div
          key={`drop-${drop.id}`}
          className="absolute top-0 rounded-full animate-seasonal-rain pointer-events-none"
          style={{
            left: drop.left,
            width: drop.width,
            height: drop.height,
            background: 'linear-gradient(to bottom, rgba(56, 189, 248, 0.1), #38bdf8, #0ea5e9)',
            boxShadow: '0 0 8px rgba(56, 189, 248, 0.9)',
            animationDelay: drop.delay,
            animationDuration: drop.duration,
          }}
        />
      ))}
    </div>
  );
};

/* ========================================================================= */
/* 3. Basanta (বসন্ত / Spring) Atmosphere - Flower Petal Shower (পুষ্পবৃষ্টি)  */
/* ========================================================================= */
interface PetalItem {
  id: number;
  left: string;
  delay: string;
  duration: string;
  color: string;
  size: number;
}

const BasantaAtmosphere: React.FC = () => {
  const petals = useMemo<PetalItem[]>(
    () => [
      { id: 1, left: '4%', delay: '-1.2s', duration: '8.5s', color: '#f43f5e', size: 22 },
      { id: 2, left: '11%', delay: '-4.5s', duration: '10.2s', color: '#fb7185', size: 18 },
      { id: 3, left: '18%', delay: '-2.8s', duration: '9.0s', color: '#e11d48', size: 24 },
      { id: 4, left: '26%', delay: '-6.2s', duration: '11.0s', color: '#f43f5e', size: 20 },
      { id: 5, left: '33%', delay: '-0.5s', duration: '8.8s', color: '#fda4af', size: 21 },
      { id: 6, left: '41%', delay: '-5.0s', duration: '9.8s', color: '#fb7185', size: 19 },
      { id: 7, left: '48%', delay: '-2.0s', duration: '8.2s', color: '#e11d48', size: 25 },
      { id: 8, left: '56%', delay: '-6.8s', duration: '10.5s', color: '#f43f5e', size: 20 },
      { id: 9, left: '63%', delay: '-3.5s', duration: '9.5s', color: '#fb7185', size: 23 },
      { id: 10, left: '71%', delay: '-5.8s', duration: '9.0s', color: '#fda4af', size: 18 },
      { id: 11, left: '78%', delay: '-1.5s', duration: '10.2s', color: '#e11d48', size: 24 },
      { id: 12, left: '86%', delay: '-6.5s', duration: '9.8s', color: '#f43f5e', size: 20 },
      { id: 13, left: '93%', delay: '-4.0s', duration: '8.5s', color: '#fb7185', size: 22 },
      // Secondary layer
      { id: 14, left: '8%', delay: '-7.5s', duration: '10.0s', color: '#e11d48', size: 22 },
      { id: 15, left: '22%', delay: '-8.2s', duration: '9.2s', color: '#f43f5e', size: 19 },
      { id: 16, left: '37%', delay: '-7.8s', duration: '10.5s', color: '#fda4af', size: 20 },
      { id: 17, left: '52%', delay: '-8.5s', duration: '9.5s', color: '#fb7185', size: 21 },
      { id: 18, left: '67%', delay: '-9.1s', duration: '8.8s', color: '#e11d48', size: 24 },
      { id: 19, left: '82%', delay: '-8.8s', duration: '10.8s', color: '#f43f5e', size: 20 },
      { id: 20, left: '95%', delay: '-9.6s', duration: '9.6s', color: '#fb7185', size: 19 },
    ],
    []
  );

  return (
    <div className="absolute inset-0 seasonal-animated-element pointer-events-none">
      {/* Fresh Green & Blossoming Radiance */}
      <div className="absolute -top-32 left-1/4 w-[550px] h-[500px] rounded-full bg-rose-500/15 dark:bg-rose-600/15 blur-3xl" />
      <div className="absolute bottom-10 right-20 w-80 h-80 rounded-full bg-emerald-500/15 dark:bg-emerald-600/15 blur-3xl" />

      {/* Tumbling flower petals (Palash & Krishnachura) */}
      {petals.map((petal) => (
        <div
          key={`petal-${petal.id}`}
          className="absolute top-0 animate-seasonal-petal pointer-events-none"
          style={{
            left: petal.left,
            animationDelay: petal.delay,
            animationDuration: petal.duration,
          }}
        >
          <svg
            width={petal.size}
            height={petal.size * 1.3}
            viewBox="0 0 24 32"
            fill="none"
            className="drop-shadow-[0_2px_8px_rgba(244,63,94,0.7)]"
          >
            <path
              d="M12 0 C19 7 24 18 12 32 C0 18 5 7 12 0 Z"
              fill={petal.color}
              opacity="0.9"
            />
          </svg>
        </div>
      ))}
    </div>
  );
};

/* ========================================================================= */
/* 4. Grishma (গ্রীষ্ম / Summer) Atmosphere - Radiant Sun & Rays (তপ্ত সূর্য)   */
/* ========================================================================= */
const GrishmaAtmosphere: React.FC = () => {
  const solarMotes = useMemo(
    () => [
      { id: 1, left: '15%', delay: '-2s', duration: '11s', size: 8 },
      { id: 2, left: '32%', delay: '-6s', duration: '14s', size: 6 },
      { id: 3, left: '48%', delay: '-3s', duration: '13s', size: 9 },
      { id: 4, left: '65%', delay: '-8s', duration: '12s', size: 7 },
      { id: 5, left: '80%', delay: '-4s', duration: '15s', size: 8 },
      { id: 6, left: '92%', delay: '-9s', duration: '13s', size: 7 },
    ],
    []
  );

  return (
    <div className="absolute inset-0 seasonal-animated-element pointer-events-none">
      {/* Top Right Radiant Golden Sun */}
      <div className="absolute -top-32 -right-32 w-[400px] h-[400px] rounded-full bg-amber-400/25 dark:bg-amber-500/20 blur-2xl animate-seasonal-sun" />

      {/* Rotating Sunbeams */}
      <div className="absolute -top-20 -right-20 w-[480px] h-[480px] animate-seasonal-sun-spin opacity-30 dark:opacity-20 pointer-events-none">
        <svg viewBox="0 0 200 200" className="w-full h-full text-amber-400 fill-current">
          <circle cx="100" cy="100" r="32" />
          {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
            <path
              key={`beam-${deg}`}
              d="M100 45 L96 0 L104 0 Z"
              transform={`rotate(${deg} 100 100)`}
            />
          ))}
        </svg>
      </div>

      {/* Floating Solar Bokeh / Dust motes */}
      {solarMotes.map((mote) => (
        <div
          key={`mote-${mote.id}`}
          className="absolute rounded-full animate-seasonal-pollen pointer-events-none"
          style={{
            left: mote.left,
            width: mote.size,
            height: mote.size,
            backgroundColor: '#fbbf24',
            boxShadow: '0 0 12px #f59e0b',
            animationDelay: mote.delay,
            animationDuration: mote.duration,
          }}
        />
      ))}
    </div>
  );
};

/* ========================================================================= */
/* 5. Sharat (শরৎ / Autumn) Atmosphere - Kash Flower Fluff & Clouds (কাশফুল)  */
/* ========================================================================= */
const SharatAtmosphere: React.FC = () => {
  const kashSeeds = useMemo(
    () => [
      { id: 1, delay: '-2s', duration: '16s', top: '15%' },
      { id: 2, delay: '-7s', duration: '20s', top: '28%' },
      { id: 3, delay: '-12s', duration: '17s', top: '42%' },
      { id: 4, delay: '-4s', duration: '21s', top: '56%' },
      { id: 5, delay: '-9s', duration: '18s', top: '70%' },
      { id: 6, delay: '-14s', duration: '19s', top: '82%' },
    ],
    []
  );

  return (
    <div className="absolute inset-0 seasonal-animated-element pointer-events-none">
      {/* Pure Azure Sky Atmosphere */}
      <div className="absolute -top-32 left-1/3 w-[600px] h-[400px] rounded-full bg-sky-400/20 dark:bg-sky-500/18 blur-3xl" />

      {/* Drifting White Clouds */}
      <div
        className="absolute top-10 left-0 w-80 h-24 rounded-full bg-white/30 dark:bg-white/15 blur-2xl animate-seasonal-cloud"
        style={{ animationDuration: '55s', animationDelay: '-10s' }}
      />
      <div
        className="absolute top-24 left-0 w-[420px] h-28 rounded-full bg-sky-100/25 dark:bg-white/10 blur-3xl animate-seasonal-cloud"
        style={{ animationDuration: '75s', animationDelay: '-35s' }}
      />

      {/* Drifting Kash Flower Fluff / White Feathery Seeds */}
      {kashSeeds.map((seed) => (
        <div
          key={`kash-seed-${seed.id}`}
          className="absolute left-0 animate-seasonal-kash-seed pointer-events-none"
          style={{
            top: seed.top,
            animationDelay: seed.delay,
            animationDuration: seed.duration,
          }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.95)]">
            <circle cx="12" cy="12" r="3" fill="white" opacity="0.95" />
            <line x1="12" y1="12" x2="6" y2="4" stroke="white" strokeWidth="1.6" opacity="0.85" />
            <line x1="12" y1="12" x2="18" y2="4" stroke="white" strokeWidth="1.6" opacity="0.85" />
            <line x1="12" y1="12" x2="2" y2="12" stroke="white" strokeWidth="1.6" opacity="0.85" />
            <line x1="12" y1="12" x2="22" y2="12" stroke="white" strokeWidth="1.6" opacity="0.85" />
            <line x1="12" y1="12" x2="7" y2="19" stroke="white" strokeWidth="1.6" opacity="0.85" />
            <line x1="12" y1="12" x2="17" y2="19" stroke="white" strokeWidth="1.6" opacity="0.85" />
          </svg>
        </div>
      ))}

      {/* Swaying Kash Flower Bush at Bottom-Right */}
      <div className="absolute -bottom-4 right-6 w-48 h-64 pointer-events-none opacity-40 dark:opacity-30 animate-kash-sway">
        <svg viewBox="0 0 100 150" fill="none" className="w-full h-full text-white dark:text-sky-100">
          <path d="M50 150 Q48 90 40 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M40 10 Q28 16 18 22" stroke="currentColor" strokeWidth="1.8" strokeDasharray="3,2" />
          <path d="M41 18 Q55 24 64 30" stroke="currentColor" strokeWidth="1.8" strokeDasharray="3,2" />
          <path d="M42 30 Q24 38 16 48" stroke="currentColor" strokeWidth="1.8" strokeDasharray="3,2" />
          <path d="M44 42 Q60 50 70 58" stroke="currentColor" strokeWidth="1.8" strokeDasharray="3,2" />
          <path d="M45 56 Q28 66 22 78" stroke="currentColor" strokeWidth="1.8" strokeDasharray="3,2" />
          <path d="M46 72 Q64 80 72 94" stroke="currentColor" strokeWidth="1.8" strokeDasharray="3,2" />
        </svg>
      </div>
    </div>
  );
};

/* ========================================================================= */
/* 6. Hemanta (হেমন্ত / Late Autumn) Atmosphere - Falling Golden Leaves & Grain */
/* ========================================================================= */
interface LeafItem {
  id: number;
  left: string;
  delay: string;
  duration: string;
  size: number;
  color: string;
}

const HemantaAtmosphere: React.FC = () => {
  const leaves = useMemo<LeafItem[]>(
    () => [
      { id: 1, left: '6%', delay: '-1.5s', duration: '9.0s', size: 24, color: '#f59e0b' },
      { id: 2, left: '16%', delay: '-5.2s', duration: '10.5s', size: 20, color: '#d97706' },
      { id: 3, left: '28%', delay: '-2.8s', duration: '9.5s', size: 22, color: '#fbbf24' },
      { id: 4, left: '42%', delay: '-6.8s', duration: '11.2s', size: 22, color: '#d97706' },
      { id: 5, left: '55%', delay: '-3.6s', duration: '9.2s', size: 25, color: '#f59e0b' },
      { id: 6, left: '68%', delay: '-7.4s', duration: '10.8s', size: 21, color: '#fbbf24' },
      { id: 7, left: '81%', delay: '-1.9s', duration: '8.8s', size: 24, color: '#d97706' },
      { id: 8, left: '92%', delay: '-6.0s', duration: '11.0s', size: 22, color: '#f59e0b' },
      { id: 9, left: '10%', delay: '-8.5s', duration: '10.0s', size: 21, color: '#fbbf24' },
      { id: 10, left: '25%', delay: '-9.0s', duration: '9.2s', size: 24, color: '#f59e0b' },
      { id: 11, left: '50%', delay: '-8.0s', duration: '10.5s', size: 20, color: '#d97706' },
      { id: 12, left: '75%', delay: '-9.5s', duration: '9.6s', size: 23, color: '#fbbf24' },
    ],
    []
  );

  return (
    <div className="absolute inset-0 seasonal-animated-element pointer-events-none">
      {/* Golden Harvest Radiance */}
      <div className="absolute -top-32 right-1/4 w-[600px] h-[500px] rounded-full bg-amber-500/18 dark:bg-amber-600/18 blur-3xl" />
      <div className="absolute bottom-0 left-10 w-96 h-96 rounded-full bg-yellow-600/15 dark:bg-yellow-700/15 blur-3xl" />

      {/* Falling Golden Leaves (সোনালী পাতা ও ধানের শিষ) */}
      {leaves.map((leaf) => (
        <div
          key={`leaf-${leaf.id}`}
          className="absolute top-0 animate-seasonal-leaf pointer-events-none"
          style={{
            left: leaf.left,
            animationDelay: leaf.delay,
            animationDuration: leaf.duration,
          }}
        >
          <svg
            width={leaf.size}
            height={leaf.size * 1.4}
            viewBox="0 0 24 32"
            fill="none"
            className="drop-shadow-[0_2px_8px_rgba(217,119,6,0.6)]"
          >
            <path
              d="M12 0 C18 6 22 16 12 32 C2 16 6 6 12 0 Z"
              fill={leaf.color}
              opacity="0.9"
            />
            <path d="M12 4 L12 28" stroke="#78350f" strokeWidth="1.5" opacity="0.7" />
          </svg>
        </div>
      ))}
    </div>
  );
};

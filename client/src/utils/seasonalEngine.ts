/**
 * Bangladesh Six Seasons (ষড়ঋতু) Calculation Engine
 * 
 * Accurately determines the current traditional seasonal atmosphere of Bangladesh
 * using the Asia/Dhaka timezone (GMT+6), completely independent of the client's
 * local device timezone.
 * 
 * The Six Traditional Seasons of Bangladesh:
 * 1. Grishma (গ্রীষ্ম)     - Summer:        April (4) – May (5)       [Boishakh – Jaishtha]
 * 2. Barsha (বর্ষা)       - Monsoon:       June (6) – July (7)       [Asharh – Srabon]
 * 3. Sharat (শরৎ)         - Autumn:        August (8) – September (9)[Bhadro – Ashwin]
 * 4. Hemanta (হেমন্ত)     - Late Autumn:   October (10) – November (11) [Kartik – Ogrohayon]
 * 5. Sheet (শীত)         - Winter:        December (12) – January (1) [Poush – Magh]
 * 6. Basanta (বসন্ত)     - Spring:        February (2) – March (3)  [Falgun – Choitro]
 */

export type SeasonId = 'grishma' | 'barsha' | 'sharat' | 'hemanta' | 'sheet' | 'basanta';

export interface SeasonThemeColors {
  primary: string;
  accent: string;
  glow: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  darkGradients: string[];
  lightGradients: string[];
}

export interface SeasonMetadata {
  id: SeasonId;
  nameBangla: string;
  nameEnglish: string;
  poeticTitleBangla: string;
  poeticTitleEnglish: string;
  bengaliMonthsBangla: string;
  bengaliMonthsEnglish: string;
  gregorianMonths: string;
  months: number[]; // 1-12
  descriptionBangla: string;
  descriptionEnglish: string;
  iconName: string;
  theme: SeasonThemeColors;
}

export const BANGLADESH_SEASONS: Record<SeasonId, SeasonMetadata> = {
  grishma: {
    id: 'grishma',
    nameBangla: 'গ্রীষ্ম',
    nameEnglish: 'Grishma',
    poeticTitleBangla: 'তপ্ত রোদ ও সোনালী দুপুর',
    poeticTitleEnglish: 'Golden Sunlight & Summer Warmth',
    bengaliMonthsBangla: 'বৈশাখ – জ্যৈষ্ঠ',
    bengaliMonthsEnglish: 'Boishakh – Jaishtha',
    gregorianMonths: 'April – May',
    months: [4, 5],
    descriptionBangla: 'খররোদ, আম-কাঁঠালের মিষ্টি সুবাস ও সোনালী কিরণ।',
    descriptionEnglish: 'Warm sunbeams, ripe summer fruits, and shimmering golden horizons.',
    iconName: 'Sun',
    theme: {
      primary: '#f59e0b',
      accent: '#fbbf24',
      glow: 'rgba(245, 158, 11, 0.16)',
      badgeBg: 'bg-amber-500/10 dark:bg-amber-500/15',
      badgeBorder: 'border-amber-500/30',
      badgeText: 'text-amber-600 dark:text-amber-400',
      darkGradients: [
        'radial-gradient(ellipse at 80% 0%, rgba(245, 158, 11, 0.14) 0%, transparent 60%)',
        'radial-gradient(circle at 10% 40%, rgba(217, 119, 6, 0.08) 0%, transparent 50%)',
      ],
      lightGradients: [
        'radial-gradient(ellipse at 80% 0%, rgba(251, 191, 36, 0.18) 0%, transparent 60%)',
        'radial-gradient(circle at 10% 40%, rgba(245, 158, 11, 0.09) 0%, transparent 50%)',
      ],
    },
  },
  barsha: {
    id: 'barsha',
    nameBangla: 'বর্ষা',
    nameEnglish: 'Barsha',
    poeticTitleBangla: 'মেঘমল্লার ও সবুজ প্রকৃতি',
    poeticTitleEnglish: 'Monsoon Rhythms & Lush Greenery',
    bengaliMonthsBangla: 'আষাঢ় – শ্রাবণ',
    bengaliMonthsEnglish: 'Asharh – Srabon',
    gregorianMonths: 'June – July',
    months: [6, 7],
    descriptionBangla: 'ঝুম বৃষ্টি, কদম ফুলের শোভা ও স্নিগ্ধ শ্যামল বাংলা।',
    descriptionEnglish: 'Gentle monsoon rain, blooming kodom blossoms, and deep revitalized greenery.',
    iconName: 'CloudRain',
    theme: {
      primary: '#059669',
      accent: '#10b981',
      glow: 'rgba(16, 185, 129, 0.18)',
      badgeBg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
      badgeBorder: 'border-emerald-500/30',
      badgeText: 'text-emerald-600 dark:text-emerald-400',
      darkGradients: [
        'radial-gradient(ellipse at 30% 0%, rgba(16, 185, 129, 0.12) 0%, transparent 60%)',
        'radial-gradient(circle at 80% 60%, rgba(6, 182, 212, 0.08) 0%, transparent 50%)',
      ],
      lightGradients: [
        'radial-gradient(ellipse at 30% 0%, rgba(52, 211, 153, 0.18) 0%, transparent 60%)',
        'radial-gradient(circle at 80% 60%, rgba(6, 182, 212, 0.10) 0%, transparent 50%)',
      ],
    },
  },
  sharat: {
    id: 'sharat',
    nameBangla: 'শরৎ',
    nameEnglish: 'Sharat',
    poeticTitleBangla: 'নীল আকাশ ও শুভ্র কাশফুল',
    poeticTitleEnglish: 'Azure Skies & Feathery Kash Blossoms',
    bengaliMonthsBangla: 'ভাদ্র – আশ্বিন',
    bengaliMonthsEnglish: 'Bhadro – Ashwin',
    gregorianMonths: 'August – September',
    months: [8, 9],
    descriptionBangla: 'নীল আকাশে সাদা তুলোর মেঘ ও নদীর পাড়ে কাশফুলের দোলা।',
    descriptionEnglish: 'Pristine blue skies, drifting cotton clouds, and swaying white Kash blossoms.',
    iconName: 'CloudSun',
    theme: {
      primary: '#0284c7',
      accent: '#38bdf8',
      glow: 'rgba(56, 189, 248, 0.18)',
      badgeBg: 'bg-sky-500/10 dark:bg-sky-500/15',
      badgeBorder: 'border-sky-500/30',
      badgeText: 'text-sky-600 dark:text-sky-400',
      darkGradients: [
        'radial-gradient(ellipse at 50% 0%, rgba(56, 189, 248, 0.14) 0%, transparent 65%)',
        'radial-gradient(circle at 15% 70%, rgba(147, 197, 253, 0.08) 0%, transparent 50%)',
      ],
      lightGradients: [
        'radial-gradient(ellipse at 50% 0%, rgba(125, 211, 252, 0.22) 0%, transparent 65%)',
        'radial-gradient(circle at 15% 70%, rgba(191, 219, 254, 0.15) 0%, transparent 50%)',
      ],
    },
  },
  hemanta: {
    id: 'hemanta',
    nameBangla: 'হেমন্ত',
    nameEnglish: 'Hemanta',
    poeticTitleBangla: 'সোনালী ধান ও নবান্নের ঘ্রাণ',
    poeticTitleEnglish: 'Golden Harvest & Autumn Mist',
    bengaliMonthsBangla: 'কার্তিক – অগ্রহায়ণ',
    bengaliMonthsEnglish: 'Kartik – Ogrohayon',
    gregorianMonths: 'October – November',
    months: [10, 11],
    descriptionBangla: 'সোনার ধানের শিষ, নবান্ন উৎসব আর মিষ্টি ভোরের হালকা কুয়াশা।',
    descriptionEnglish: 'Golden ripe paddy fields, the aroma of Nobanno harvest, and soft dawn mists.',
    iconName: 'Wheat',
    theme: {
      primary: '#d97706',
      accent: '#f59e0b',
      glow: 'rgba(217, 119, 6, 0.16)',
      badgeBg: 'bg-amber-600/10 dark:bg-amber-600/15',
      badgeBorder: 'border-amber-600/30',
      badgeText: 'text-amber-700 dark:text-amber-300',
      darkGradients: [
        'radial-gradient(ellipse at 70% 0%, rgba(217, 119, 6, 0.15) 0%, transparent 60%)',
        'radial-gradient(circle at 20% 50%, rgba(180, 83, 9, 0.08) 0%, transparent 50%)',
      ],
      lightGradients: [
        'radial-gradient(ellipse at 70% 0%, rgba(245, 158, 11, 0.18) 0%, transparent 60%)',
        'radial-gradient(circle at 20% 50%, rgba(217, 119, 6, 0.10) 0%, transparent 50%)',
      ],
    },
  },
  sheet: {
    id: 'sheet',
    nameBangla: 'শীত',
    nameEnglish: 'Sheet',
    poeticTitleBangla: 'সুষম তুষারপাত ও ভোরের কুয়াশা',
    poeticTitleEnglish: 'Gentle Snowfall, Mist & Soft Dawn',
    bengaliMonthsBangla: 'পৌষ – মাঘ',
    bengaliMonthsEnglish: 'Poush – Magh',
    gregorianMonths: 'December – January',
    months: [12, 1], // Cross-year transition
    descriptionBangla: 'মনোরম তুষারপাত, ভোরের কুয়াশা আর মিষ্টি রোদের মায়াবী শীতের সকাল।',
    descriptionEnglish: 'Gentle drifting snowfall, morning mist, and peaceful soft winter dawns.',
    iconName: 'Snowflake',
    theme: {
      primary: '#64748b',
      accent: '#94a3b8',
      glow: 'rgba(148, 163, 184, 0.18)',
      badgeBg: 'bg-slate-500/10 dark:bg-slate-400/15',
      badgeBorder: 'border-slate-500/30',
      badgeText: 'text-slate-700 dark:text-slate-300',
      darkGradients: [
        'radial-gradient(ellipse at 50% 0%, rgba(148, 163, 184, 0.15) 0%, transparent 65%)',
        'radial-gradient(circle at 80% 40%, rgba(203, 213, 225, 0.08) 0%, transparent 50%)',
      ],
      lightGradients: [
        'radial-gradient(ellipse at 50% 0%, rgba(203, 213, 225, 0.28) 0%, transparent 65%)',
        'radial-gradient(circle at 80% 40%, rgba(148, 163, 184, 0.12) 0%, transparent 50%)',
      ],
    },
  },
  basanta: {
    id: 'basanta',
    nameBangla: 'বসন্ত',
    nameEnglish: 'Basanta',
    poeticTitleBangla: 'ফাগুনের রঙ ও পলাশ-শিমুল',
    poeticTitleEnglish: 'Blossoming Petals & Spring Breeze',
    bengaliMonthsBangla: 'ফাল্গুন – চৈত্র',
    bengaliMonthsEnglish: 'Falgun – Choitro',
    gregorianMonths: 'February – March',
    months: [2, 3],
    descriptionBangla: 'কৃষ্ণচূড়া, পলাশ ও শিমুলের রক্তিম শোভা, কোকিলের কুহুতান আর নতুন পাতার আগমন।',
    descriptionEnglish: 'Scarlet Palash & Shimul blooms, melodic cuckoos, and colorful fluttering petals.',
    iconName: 'Flower2',
    theme: {
      primary: '#e11d48',
      accent: '#f43f5e',
      glow: 'rgba(244, 63, 94, 0.18)',
      badgeBg: 'bg-rose-500/10 dark:bg-rose-500/15',
      badgeBorder: 'border-rose-500/30',
      badgeText: 'text-rose-600 dark:text-rose-400',
      darkGradients: [
        'radial-gradient(ellipse at 60% 0%, rgba(244, 63, 94, 0.14) 0%, transparent 60%)',
        'radial-gradient(circle at 15% 45%, rgba(251, 113, 133, 0.08) 0%, transparent 50%)',
      ],
      lightGradients: [
        'radial-gradient(ellipse at 60% 0%, rgba(253, 164, 175, 0.22) 0%, transparent 60%)',
        'radial-gradient(circle at 15% 45%, rgba(244, 63, 94, 0.10) 0%, transparent 50%)',
      ],
    },
  },
};

export const ALL_SEASONS_ORDER: SeasonId[] = [
  'basanta', // Spring (Feb-Mar)
  'grishma', // Summer (Apr-May)
  'barsha',  // Monsoon (Jun-Jul)
  'sharat',  // Autumn (Aug-Sep)
  'hemanta', // Late Autumn (Oct-Nov)
  'sheet',   // Winter (Dec-Jan)
];

/**
 * Extracts current date components in the Asia/Dhaka timezone (GMT+6).
 * This ensures accurate Bangladesh time even if the user is in London, New York, or Tokyo.
 */
export function getDhakaDateComponents(inputDate: Date = new Date()): {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
} {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    hour12: false,
  });

  const parts = formatter.formatToParts(inputDate);
  const partMap: Record<string, number> = {};
  for (const part of parts) {
    if (part.type !== 'literal') {
      partMap[part.type] = parseInt(part.value, 10);
    }
  }

  return {
    year: partMap.year || inputDate.getFullYear(),
    month: partMap.month || inputDate.getMonth() + 1,
    day: partMap.day || inputDate.getDate(),
    hour: partMap.hour !== undefined ? partMap.hour : inputDate.getHours(),
  };
}

/**
 * Calculates Bangladesh season solely based on the month number (1-12).
 * Pure function: deterministic and easy to unit test.
 */
export function calculateSeasonForMonth(month: number): SeasonId {
  // Normalize month into 1-12
  const normalizedMonth = ((month - 1) % 12 + 12) % 12 + 1;

  switch (normalizedMonth) {
    case 4:
    case 5:
      return 'grishma'; // Summer: April - May
    case 6:
    case 7:
      return 'barsha';  // Monsoon: June - July
    case 8:
    case 9:
      return 'sharat';  // Autumn: August - September
    case 10:
    case 11:
      return 'hemanta'; // Late Autumn: October - November
    case 12:
    case 1:
      return 'sheet';   // Winter: December - January
    case 2:
    case 3:
      return 'basanta'; // Spring: February - March
    default:
      return 'hemanta'; // Safe fallback
  }
}

/**
 * Gets the current Bangladesh season based on the current date in Asia/Dhaka timezone.
 */
export function getCurrentBangladeshSeason(date: Date = new Date()): SeasonMetadata {
  const dhaka = getDhakaDateComponents(date);
  const seasonId = calculateSeasonForMonth(dhaka.month);
  return BANGLADESH_SEASONS[seasonId];
}

/**
 * Helper to fetch season metadata by its ID
 */
export function getSeasonById(seasonId: SeasonId): SeasonMetadata {
  return BANGLADESH_SEASONS[seasonId] || BANGLADESH_SEASONS.hemanta;
}


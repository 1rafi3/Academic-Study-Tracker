export interface IBangladeshHoliday {
  dateString: string; // "YYYY-MM-DD"
  name: string;
  nameBangla?: string;
  isPublicHoliday: boolean;
  type: 'national' | 'religious' | 'cultural';
}

// Fixed solar holidays (applies to every year)
const FIXED_HOLIDAYS: Array<{ month: string; day: string; name: string; type: 'national' | 'religious' | 'cultural' }> = [
  { month: '02', day: '21', name: 'Shaheed Day & International Mother Language Day', type: 'national' },
  { month: '03', day: '17', name: "Father of the Nation's Birthday & Children's Day", type: 'national' },
  { month: '03', day: '26', name: 'Independence & National Day', type: 'national' },
  { month: '04', day: '14', name: 'Pohela Boishakh (Bengali New Year)', type: 'cultural' },
  { month: '05', day: '01', name: 'May Day (International Workers\' Day)', type: 'national' },
  { month: '08', day: '15', name: 'National Mourning Day', type: 'national' },
  { month: '12', day: '16', name: 'Victory Day (Bijoy Dibos)', type: 'national' },
  { month: '12', day: '25', name: 'Christmas Day', type: 'religious' },
];

// Variable / Lunar religious holidays for Bangladesh (2025 – 2029)
const VARIABLE_HOLIDAYS: Record<string, string> = {
  // 2025
  '2025-02-14': 'Shab-e-Barat',
  '2025-03-28': 'Shab-e-Qadr & Jumatul Wida',
  '2025-03-31': 'Eid-ul-Fitr (Day 1)',
  '2025-04-01': 'Eid-ul-Fitr (Day 2)',
  '2025-04-02': 'Eid-ul-Fitr (Day 3)',
  '2025-05-11': 'Buddha Purnima',
  '2025-06-06': 'Eid-ul-Azha (Day 1)',
  '2025-06-07': 'Eid-ul-Azha (Day 2)',
  '2025-06-08': 'Eid-ul-Azha (Day 3)',
  '2025-07-06': 'Ashura (Muharram)',
  '2025-09-05': 'Eid-e-Miladunnabi',
  '2025-10-01': 'Durga Puja (Maha Nabami)',
  '2025-10-02': 'Durga Puja (Bijoya Dashami)',

  // 2026
  '2026-02-04': 'Shab-e-Barat',
  '2026-03-17': 'Shab-e-Qadr',
  '2026-03-20': 'Eid-ul-Fitr (Day 1)',
  '2026-03-21': 'Eid-ul-Fitr (Day 2)',
  '2026-03-22': 'Eid-ul-Fitr (Day 3)',
  '2026-05-01': 'Buddha Purnima',
  '2026-05-27': 'Eid-ul-Azha (Day 1)',
  '2026-05-28': 'Eid-ul-Azha (Day 2)',
  '2026-05-29': 'Eid-ul-Azha (Day 3)',
  '2026-06-25': 'Ashura (Muharram)',
  '2026-08-26': 'Eid-e-Miladunnabi',
  '2026-10-20': 'Durga Puja (Maha Nabami)',
  '2026-10-21': 'Durga Puja (Bijoya Dashami)',

  // 2027
  '2027-01-24': 'Shab-e-Barat',
  '2027-03-07': 'Shab-e-Qadr',
  '2027-03-10': 'Eid-ul-Fitr (Day 1)',
  '2027-03-11': 'Eid-ul-Fitr (Day 2)',
  '2027-03-12': 'Eid-ul-Fitr (Day 3)',
  '2027-05-16': 'Eid-ul-Azha (Day 1)',
  '2027-05-17': 'Eid-ul-Azha (Day 2)',
  '2027-05-18': 'Eid-ul-Azha (Day 3)',
  '2027-05-20': 'Buddha Purnima',
  '2027-06-15': 'Ashura (Muharram)',
  '2027-08-15': 'Eid-e-Miladunnabi',
  '2027-10-09': 'Durga Puja (Maha Nabami)',
  '2027-10-10': 'Durga Puja (Bijoya Dashami)',

  // 2028
  '2028-01-13': 'Shab-e-Barat',
  '2028-02-25': 'Shab-e-Qadr',
  '2028-02-28': 'Eid-ul-Fitr (Day 1)',
  '2028-02-29': 'Eid-ul-Fitr (Day 2)',
  '2028-03-01': 'Eid-ul-Fitr (Day 3)',
  '2028-05-05': 'Eid-ul-Azha (Day 1)',
  '2028-05-06': 'Eid-ul-Azha (Day 2)',
  '2028-05-07': 'Eid-ul-Azha (Day 3)',
  '2028-05-09': 'Buddha Purnima',
  '2028-06-03': 'Ashura (Muharram)',
  '2028-08-04': 'Eid-e-Miladunnabi',
  '2028-09-28': 'Durga Puja (Maha Nabami)',
  '2028-09-29': 'Durga Puja (Bijoya Dashami)',

  // 2029
  '2029-01-02': 'Shab-e-Barat',
  '2029-02-14': 'Shab-e-Qadr',
  '2029-02-17': 'Eid-ul-Fitr (Day 1)',
  '2029-02-18': 'Eid-ul-Fitr (Day 2)',
  '2029-02-19': 'Eid-ul-Fitr (Day 3)',
  '2029-04-24': 'Eid-ul-Azha (Day 1)',
  '2029-04-25': 'Eid-ul-Azha (Day 2)',
  '2029-04-26': 'Eid-ul-Azha (Day 3)',
  '2029-04-28': 'Buddha Purnima',
  '2029-05-24': 'Ashura (Muharram)',
  '2029-07-25': 'Eid-e-Miladunnabi',
  '2029-10-17': 'Durga Puja (Maha Nabami)',
  '2029-10-18': 'Durga Puja (Bijoya Dashami)',
};

/**
 * Returns holiday details for a specific YYYY-MM-DD date string if it is a recognized Bangladesh holiday.
 */
export const getBangladeshHoliday = (dateString: string): IBangladeshHoliday | null => {
  if (!dateString || typeof dateString !== 'string') return null;

  const parts = dateString.split('-');
  if (parts.length !== 3) return null;

  const [, month, day] = parts;

  // 1. Check variable/lunar holidays first
  if (VARIABLE_HOLIDAYS[dateString]) {
    return {
      dateString,
      name: VARIABLE_HOLIDAYS[dateString],
      isPublicHoliday: true,
      type: 'religious',
    };
  }

  // 2. Check fixed solar holidays
  const fixed = FIXED_HOLIDAYS.find((h) => h.month === month && h.day === day);
  if (fixed) {
    return {
      dateString,
      name: fixed.name,
      isPublicHoliday: true,
      type: fixed.type,
    };
  }

  return null;
};

/**
 * Retrieves all Bangladesh holidays within a specific year and month (or full year).
 * @param year e.g. 2026
 * @param monthIndex 0-indexed month (0 = Jan, 11 = Dec), optional
 */
export const getHolidaysForPeriod = (year: number, monthIndex?: number): IBangladeshHoliday[] => {
  const holidays: IBangladeshHoliday[] = [];
  const yearStr = String(year);

  // Collect from fixed holidays
  for (const fixed of FIXED_HOLIDAYS) {
    if (monthIndex !== undefined) {
      const fixedMonthIndex = parseInt(fixed.month, 10) - 1;
      if (fixedMonthIndex !== monthIndex) continue;
    }
    const dateString = `${yearStr}-${fixed.month}-${fixed.day}`;
    holidays.push({
      dateString,
      name: fixed.name,
      isPublicHoliday: true,
      type: fixed.type,
    });
  }

  // Collect from variable holidays
  for (const [dateStr, name] of Object.entries(VARIABLE_HOLIDAYS)) {
    if (!dateStr.startsWith(`${yearStr}-`)) continue;
    if (monthIndex !== undefined) {
      const mIndex = parseInt(dateStr.split('-')[1], 10) - 1;
      if (mIndex !== monthIndex) continue;
    }
    // Avoid exact duplicates if name already recorded
    if (!holidays.some((h) => h.dateString === dateStr)) {
      holidays.push({
        dateString: dateStr,
        name,
        isPublicHoliday: true,
        type: 'religious',
      });
    }
  }

  return holidays.sort((a, b) => a.dateString.localeCompare(b.dateString));
};

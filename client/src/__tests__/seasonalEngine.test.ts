import { describe, it, expect } from 'vitest';
import {
  calculateSeasonForMonth,
  getDhakaDateComponents,
  getCurrentBangladeshSeason,
  getSeasonById,
  BANGLADESH_SEASONS,
  ALL_SEASONS_ORDER,
  type SeasonId,
} from '../utils/seasonalEngine.js';

describe('Bangladesh Six Seasons Calculation Engine', () => {
  describe('calculateSeasonForMonth (1-12 mapping)', () => {
    it('maps December (12) and January (1) to Sheet (শীত / Winter)', () => {
      expect(calculateSeasonForMonth(12)).toBe('sheet');
      expect(calculateSeasonForMonth(1)).toBe('sheet');
    });

    it('maps February (2) and March (3) to Basanta (বসন্ত / Spring)', () => {
      expect(calculateSeasonForMonth(2)).toBe('basanta');
      expect(calculateSeasonForMonth(3)).toBe('basanta');
    });

    it('maps April (4) and May (5) to Grishma (গ্রীষ্ম / Summer)', () => {
      expect(calculateSeasonForMonth(4)).toBe('grishma');
      expect(calculateSeasonForMonth(5)).toBe('grishma');
    });

    it('maps June (6) and July (7) to Barsha (বর্ষা / Monsoon)', () => {
      expect(calculateSeasonForMonth(6)).toBe('barsha');
      expect(calculateSeasonForMonth(7)).toBe('barsha');
    });

    it('maps August (8) and September (9) to Sharat (শরৎ / Autumn)', () => {
      expect(calculateSeasonForMonth(8)).toBe('sharat');
      expect(calculateSeasonForMonth(9)).toBe('sharat');
    });

    it('maps October (10) and November (11) to Hemanta (হেমন্ত / Late Autumn)', () => {
      expect(calculateSeasonForMonth(10)).toBe('hemanta');
      expect(calculateSeasonForMonth(11)).toBe('hemanta');
    });

    it('handles cyclic month indices beyond 1-12 safely', () => {
      expect(calculateSeasonForMonth(13)).toBe('sheet'); // Month 13 is January
      expect(calculateSeasonForMonth(0)).toBe('sheet');  // Month 0 is December
      expect(calculateSeasonForMonth(14)).toBe('basanta'); // Month 14 is February
    });
  });

  describe('December-January cross-year transition', () => {
    it('retains Sheet continuously across New Year boundary (Dec 31 -> Jan 1)', () => {
      const dec31 = new Date('2026-12-31T23:59:59Z');
      const jan1 = new Date('2027-01-01T00:00:01Z');

      const seasonDec = getCurrentBangladeshSeason(dec31);
      const seasonJan = getCurrentBangladeshSeason(jan1);

      expect(seasonDec.id).toBe('sheet');
      expect(seasonJan.id).toBe('sheet');
      expect(seasonDec.nameBangla).toBe('শীত');
      expect(seasonJan.nameBangla).toBe('শীত');
    });
  });

  describe('February-March Spring transition', () => {
    it('maintains Basanta across February to March boundary', () => {
      const feb28 = new Date('2026-02-28T12:00:00Z');
      const mar1 = new Date('2026-03-01T12:00:00Z');

      expect(getCurrentBangladeshSeason(feb28).id).toBe('basanta');
      expect(getCurrentBangladeshSeason(mar1).id).toBe('basanta');
    });
  });

  describe('Asia/Dhaka timezone handling', () => {
    it('extracts date in Asia/Dhaka GMT+6 accurately when UTC date has not rolled over yet', () => {
      // 2026-04-30 at 22:30:00 UTC -> in Dhaka (UTC+6) it is 2026-05-01 04:30:00 (May 1st, Grishma)
      const lateUtc = new Date('2026-04-30T22:30:00Z');
      const dhakaDate = getDhakaDateComponents(lateUtc);

      expect(dhakaDate.year).toBe(2026);
      expect(dhakaDate.month).toBe(5); // May in Dhaka
      expect(dhakaDate.day).toBe(1);

      const season = getCurrentBangladeshSeason(lateUtc);
      expect(season.id).toBe('grishma');
    });

    it('extracts date in Asia/Dhaka GMT+6 accurately across New Year boundary', () => {
      // 2026-12-31 20:00:00 UTC -> in Dhaka (UTC+6) it is 2027-01-01 02:00:00 (New Year Jan 1st)
      const newYearEveUtc = new Date('2026-12-31T20:00:00Z');
      const dhakaDate = getDhakaDateComponents(newYearEveUtc);

      expect(dhakaDate.year).toBe(2027);
      expect(dhakaDate.month).toBe(1); // January
      expect(dhakaDate.day).toBe(1);

      const season = getCurrentBangladeshSeason(newYearEveUtc);
      expect(season.id).toBe('sheet');
    });
  });

  describe('Metadata and Season Catalog integrity', () => {
    it('contains all 6 distinct seasons with non-empty localized strings and themes', () => {
      const expectedIds: SeasonId[] = ['grishma', 'barsha', 'sharat', 'hemanta', 'sheet', 'basanta'];

      for (const id of expectedIds) {
        const metadata = BANGLADESH_SEASONS[id];
        expect(metadata).toBeDefined();
        expect(metadata.nameBangla.length).toBeGreaterThan(0);
        expect(metadata.nameEnglish.length).toBeGreaterThan(0);
        expect(metadata.poeticTitleBangla.length).toBeGreaterThan(0);
        expect(metadata.bengaliMonthsBangla.length).toBeGreaterThan(0);
        expect(metadata.gregorianMonths.length).toBeGreaterThan(0);
        expect(metadata.theme.primary).toMatch(/^#[0-9a-fA-F]{6}$/);
        expect(metadata.theme.darkGradients.length).toBeGreaterThan(0);
        expect(metadata.theme.lightGradients.length).toBeGreaterThan(0);
      }
    });

    it('getSeasonById safely returns the requested season or fallback', () => {
      expect(getSeasonById('barsha').nameEnglish).toBe('Barsha');
      // @ts-expect-error test fallback
      expect(getSeasonById('unknown-season').id).toBe('hemanta');
    });

    it('ALL_SEASONS_ORDER contains all 6 seasons in chronological cycle', () => {
      expect(ALL_SEASONS_ORDER).toHaveLength(6);
      expect(new Set(ALL_SEASONS_ORDER).size).toBe(6);
    });
  });
});


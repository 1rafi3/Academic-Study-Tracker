import { Router, Request, Response } from 'express';
import { getHolidaysForPeriod, getBangladeshHoliday } from '../utils/bangladeshHolidays.js';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  try {
    const yearParam = req.query.year ? parseInt(String(req.query.year), 10) : new Date().getFullYear();
    const monthParam = req.query.month !== undefined ? parseInt(String(req.query.month), 10) : undefined;

    const holidays = getHolidaysForPeriod(yearParam, monthParam);

    res.status(200).json({
      success: true,
      count: holidays.length,
      data: holidays,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve holidays';
    res.status(500).json({ success: false, message });
  }
});

router.get('/check', (req: Request, res: Response) => {
  try {
    const dateString = req.query.date as string;
    if (!dateString) {
      res.status(400).json({ success: false, message: 'Date parameter (YYYY-MM-DD) is required' });
      return;
    }

    const holiday = getBangladeshHoliday(dateString);

    res.status(200).json({
      success: true,
      isHoliday: Boolean(holiday),
      data: holiday,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to check holiday';
    res.status(500).json({ success: false, message });
  }
});

export default router;

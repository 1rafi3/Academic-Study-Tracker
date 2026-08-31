export type AttendanceRiskStatus = 'SAFE' | 'WARNING' | 'DANGER' | 'NO_DATA';

/**
 * Calculates attendance percentage safely rounded to 2 decimal places.
 * If attended + missed == 0, returns 0.
 */
export const calculateAttendancePercentage = (attended: number, missed: number): number => {
  const decided = attended + missed;
  if (decided <= 0) return 0;
  return Math.round((attended / decided) * 10000) / 100;
};

/**
 * Classifies attendance status:
 * - NO_DATA: No attended or missed classes yet
 * - SAFE: attendance >= target + 5%
 * - WARNING: target <= attendance < target + 5%
 * - DANGER: attendance < target
 */
export const classifyAttendanceStatus = (
  percentage: number,
  target: number,
  hasData: boolean
): AttendanceRiskStatus => {
  if (!hasData) return 'NO_DATA';
  if (percentage >= target + 5) return 'SAFE';
  if (percentage >= target) return 'WARNING';
  return 'DANGER';
};

/**
 * Bunk Calculator:
 * Determines how many future classes the student can miss while remaining at or above target percentage.
 * Formula: x = floor( A / (target/100) - (A + M) )
 * Returns 0 if already below target or if target is 100% (and attendance < 100%).
 */
export const calculateBunkAllowance = (
  attended: number,
  missed: number,
  targetPercentage: number
): number => {
  const decided = attended + missed;
  if (decided <= 0 || targetPercentage <= 0) return 0;

  const currentRate = (attended / decided) * 100;
  if (currentRate < targetPercentage) return 0;

  if (targetPercentage >= 100) {
    // If target is 100%, any missed class immediately drops percentage below 100%
    return 0;
  }

  const T = targetPercentage / 100;
  const maxCanMiss = Math.floor(attended / T - decided);
  return Math.max(0, maxCanMiss);
};

/**
 * Recovery Calculator:
 * Determines how many consecutive future classes the student must attend to reach or exceed target percentage.
 * Formula: y = ceil( (T * M - A * (1 - T)) / (1 - T) )
 * Returns 0 if already at or above target.
 */
export const calculateRecoveryRequirement = (
  attended: number,
  missed: number,
  targetPercentage: number
): number => {
  const decided = attended + missed;
  if (decided <= 0) return 0;

  const currentRate = (attended / decided) * 100;
  if (currentRate >= targetPercentage) return 0;

  if (targetPercentage >= 100) {
    // If 1 or more classes are already missed, mathematical recovery to 100% is impossible
    return missed > 0 ? -1 : 0;
  }

  const T = targetPercentage / 100;
  const numerator = T * missed - attended * (1 - T);
  const denominator = 1 - T;
  const classesNeeded = Math.ceil(numerator / denominator);
  return Math.max(0, classesNeeded);
};

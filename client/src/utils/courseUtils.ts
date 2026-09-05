import type { ICourse } from '../types/academic.js';

/**
 * Generates a smart short abbreviation/acronym from a course name.
 * Examples:
 * - "Object Oriented Programming" -> "OOP"
 * - "Differenciation Equation and laplace Transform" -> "DE&LT"
 * - "Data Structures and Algorithms" -> "DS&A"
 * - "Computer Networks Lab" -> "CNL"
 */
export function generateCourseAbbreviation(courseName: string): string {
  if (!courseName || typeof courseName !== 'string') return '';
  const trimmed = courseName.trim();
  if (!trimmed) return '';

  // If the user entered something that's already a short code (e.g., "CSE 221" or "OOP" or <= 5 chars)
  if (trimmed.length <= 5 && !trimmed.includes(' ')) {
    return trimmed.toUpperCase();
  }

  // Remove content inside parentheses if present, e.g. "Software Engineering (Theory)" -> "Software Engineering"
  const cleanName = trimmed.replace(/\([^)]*\)/g, '').trim();

  // Split into tokens by spaces, hyphens, or slashes
  const tokens = cleanName.split(/[\s/-]+/).filter(Boolean);
  if (tokens.length === 0) return trimmed.slice(0, 4).toUpperCase();

  // Stop words that can be omitted from acronyms
  const stopWords = new Set(['of', 'in', 'to', 'for', 'the', 'a', 'an', 'on', 'with', 'by']);

  let result = '';

  for (const token of tokens) {
    const lower = token.toLowerCase();

    // Check for conjunctions "and" / "&"
    if (lower === 'and' || token === '&') {
      result += '&';
      continue;
    }

    // Skip minor prepositions/articles if we already have or will have other words
    if (stopWords.has(lower) && tokens.length > 2) {
      continue;
    }

    // If token is all uppercase (like "AI", "DBMS", "OS"), append it
    if (token.length > 1 && token === token.toUpperCase() && !token.includes('&')) {
      result += token;
    } else {
      // Take the first alphabetic character
      const firstChar = token.charAt(0).toUpperCase();
      if (/[A-Z0-9]/.test(firstChar)) {
        result += firstChar;
      }
    }
  }

  // Fallback if abbreviation is empty or just one letter for a long title
  if (!result || result === '&') {
    return cleanName.slice(0, 4).toUpperCase();
  }

  return result;
}

/**
 * Returns the best concise short label for a course across the UI.
 * If a courseCode is provided and meaningful, it can be used; otherwise
 * generates the abbreviation from courseName.
 */
export function getCourseShortName(course: Partial<ICourse> | null | undefined): string {
  if (!course) return '';
  
  // If courseCode exists and is not empty or generic
  if (course.courseCode && course.courseCode.trim().length > 0) {
    return course.courseCode.trim();
  }

  // Otherwise abbreviate courseName
  if (course.courseName) {
    return generateCourseAbbreviation(course.courseName);
  }

  return 'Course';
}

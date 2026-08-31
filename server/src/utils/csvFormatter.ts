/**
 * RFC 4180 compliant CSV string formatter.
 * Handles strings containing commas, quotes, and newlines safely.
 */
export const escapeCsvField = (field: unknown): string => {
  if (field === null || field === undefined) {
    return '';
  }
  const str = String(field);
  // If field contains quotes, commas, or line breaks, enclose in double quotes and escape internal quotes
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

export const toCsv = (
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][]
): string => {
  const headerLine = headers.map(escapeCsvField).join(',');
  const rowLines = rows.map((row) => row.map(escapeCsvField).join(','));
  return [headerLine, ...rowLines].join('\r\n');
};

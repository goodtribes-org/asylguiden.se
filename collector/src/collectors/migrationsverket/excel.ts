import ExcelJS from 'exceljs';

export interface ExcelStatRow {
  label: string;
  value: number | string;
}

export interface ExcelStatsResult {
  period: string;
  sections: Array<{
    title: string;
    rows: ExcelStatRow[];
  }>;
}

/**
 * Parse the Migrationsverket monthly statistics Excel file.
 *
 * The Excel file typically has multiple sheets. The first sheet usually contains
 * a summary of key statistics for the most recent month. We extract the first
 * sheet's data as a key-value table.
 */
export async function parseMonthlyExcel(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  buffer: any,
  filename: string,
): Promise<ExcelStatsResult> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const sections: ExcelStatsResult['sections'] = [];

  // Process all worksheets
  workbook.worksheets.forEach((sheet) => {
    const rows: ExcelStatRow[] = [];
    const sheetTitle = sheet.name ?? 'Statistik';

    sheet.eachRow((row, rowNumber) => {
      const cells = row.values as (string | number | null | undefined)[];
      // cells[0] is undefined (ExcelJS uses 1-based indexing via row.values)
      const label = cells[1];
      const value = cells[2];

      if (label != null && value != null && String(label).trim() !== '') {
        rows.push({
          label: String(label).trim(),
          value: typeof value === 'number' ? value : String(value).trim(),
        });
      }
    });

    if (rows.length > 0) {
      sections.push({ title: sheetTitle, rows: rows.slice(0, 30) }); // cap at 30 rows
    }
  });

  // Try to extract period from filename (e.g., "Statistik-2025-11.xlsx" → "2025-11")
  const periodMatch = filename.match(/(\d{4}-\d{2})/);
  const period = periodMatch ? periodMatch[1] : new Date().toISOString().slice(0, 7);

  return { period, sections };
}

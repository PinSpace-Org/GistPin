import Papa from 'papaparse';

export type CsvValue = string | number | boolean | null | undefined;
export type CsvRow = Record<string, CsvValue>;

interface ExportCsvOptions {
  filenamePrefix: string;
  rows: CsvRow[];
  filters?: Record<string, CsvValue>;
  onProgress?: (progress: number) => void;
}

function toCell(value: CsvValue): string {
  if (value == null) {
    return '';
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  return String(value);
}

function buildFilename(prefix: string): string {
  const timestamp = new Date()
    .toISOString()
    .replace(/\.\d{3}Z$/, 'Z')
    .replace(/[:]/g, '-');

  return `${prefix}-${timestamp}.csv`;
}

function inferColumns(rows: CsvRow[]): string[] {
  const columnSet = new Set<string>();

  for (const row of rows) {
    Object.keys(row).forEach((key) => columnSet.add(key));
  }

  return Array.from(columnSet);
}

function triggerDownload(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}

async function yieldToBrowser() {
  await new Promise((resolve) => window.setTimeout(resolve, 0));
}

export async function exportRowsToCsv({
  filenamePrefix,
  rows,
  filters = {},
  onProgress,
}: ExportCsvOptions) {
  const columns = inferColumns(rows);
  const filterEntries = Object.entries(filters).filter(([, value]) => value !== '' && value != null);
  const output: string[][] = [
    ['Exported At', new Date().toISOString()],
  ];

  if (filterEntries.length > 0) {
    output.push(['Filter', 'Value']);
    filterEntries.forEach(([key, value]) => {
      output.push([key, toCell(value)]);
    });
    output.push([]);
  }

  if (columns.length > 0) {
    output.push(columns);
  }

  const totalRows = Math.max(rows.length, 1);
  const chunkSize = rows.length > 500 ? 100 : rows.length > 200 ? 50 : rows.length;

  if (rows.length === 0) {
    output.push(['No data available']);
    onProgress?.(100);
  } else {
    for (let index = 0; index < rows.length; index += chunkSize) {
      const chunk = rows.slice(index, index + chunkSize);
      chunk.forEach((row) => {
        output.push(columns.map((column) => toCell(row[column])));
      });

      const progress = Math.round((Math.min(index + chunk.length, totalRows) / totalRows) * 100);
      onProgress?.(progress);

      if (index + chunk.length < rows.length) {
        await yieldToBrowser();
      }
    }
  }

  const csv = Papa.unparse(output);
  triggerDownload(csv, buildFilename(filenamePrefix));
}

import type { CohortRow } from '@/components/charts/CohortTable';

export async function exportCohortToCsv(
  rows: CohortRow[],
  filters: Record<string, CsvValue> = {},
) {
  const weeks = Array.from({ length: 13 }, (_, i) => i);
  const csvRows: CsvRow[] = rows.map((row) => {
    const entry: CsvRow = { Cohort: row.cohort, Users: row.size };
    weeks.forEach((w) => {
      entry[`Week ${w}`] = row.retention[w] != null ? `${row.retention[w]}%` : '';
    });
    return entry;
  });
  await exportRowsToCsv({ filenamePrefix: 'cohort-retention', rows: csvRows, filters });
}

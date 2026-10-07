import Papa from 'papaparse';
import { buildDataset } from './profile';
import type { Dataset, Row } from './types';

export const MAX_FILE_BYTES = 30 * 1024 * 1024;
export const MAX_ROWS = 200_000;

export function parseCsvText(name: string, text: string): Dataset {
  const res = Papa.parse<Row>(text, { header: true, skipEmptyLines: 'greedy', transformHeader: (h) => h.trim() });
  const headers = (res.meta.fields || []).filter(Boolean);
  if (!headers.length) throw new Error('No header row found. The first line of the CSV should contain column names.');
  if (!res.data.length) throw new Error('The file has headers but no data rows.');
  const rows = res.data.slice(0, MAX_ROWS);
  return buildDataset(name, headers, rows);
}

export async function loadCsvFile(file: File): Promise<Dataset> {
  if (!/\.(csv|tsv|txt)$/i.test(file.name)) throw new Error('Please upload a .csv file.');
  if (file.size > MAX_FILE_BYTES) throw new Error('File size must be less than 30 MB.');
  return parseCsvText(file.name, await file.text());
}

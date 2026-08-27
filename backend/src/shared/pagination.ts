import { SQL, gt, lt, desc, asc } from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';

export interface CursorPaginationOptions {
  cursor?: string | null;
  limit: number;
  direction?: 'older' | 'newer';
}

export function decodeCursor(cursor: string): Date {
  const decoded = Buffer.from(cursor, 'base64url').toString('utf-8');
  return new Date(decoded);
}

export function encodeCursor(date: Date): string {
  return Buffer.from(date.toISOString()).toString('base64url');
}

export function buildCursorCondition(
  column: PgColumn,
  cursor: string | null | undefined,
  direction: 'older' | 'newer' = 'older',
): SQL | undefined {
  if (!cursor) return undefined;

  const cursorDate = decodeCursor(cursor);
  return direction === 'older'
    ? lt(column, cursorDate)
    : gt(column, cursorDate);
}

export function getCursorOrderBy(
  column: PgColumn,
  direction: 'older' | 'newer' = 'older',
) {
  return direction === 'older' ? desc(column) : asc(column);
}

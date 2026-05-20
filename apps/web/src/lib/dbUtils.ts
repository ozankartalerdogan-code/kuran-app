/* eslint-disable @typescript-eslint/no-explicit-any */
export function dbAll<T>(stmt: { all(...args: any[]): unknown[] }, ...params: any[]): T[] {
  return stmt.all(...params) as unknown as T[];
}

export function dbGet<T>(stmt: { get(...args: any[]): unknown }, ...params: any[]): T | undefined {
  return stmt.get(...params) as unknown as T | undefined;
}

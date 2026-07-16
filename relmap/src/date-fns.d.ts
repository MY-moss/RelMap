declare module 'date-fns' {
  export function format(date: Date | string | number, formatStr: string, options?: Record<string, unknown>): string;
  export function formatDistance(date: Date | string | number, baseDate: Date | string | number, options?: Record<string, unknown>): string;
  export function parseISO(dateStr: string): Date;
}

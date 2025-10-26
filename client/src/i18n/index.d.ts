export function t(key: string, params?: Record<string, any>): string;
export function setLocale(locale: string): void;
export function getLocale(): string;
export function availableLocales(): string[];
declare const _default: { t: typeof t; setLocale: typeof setLocale; getLocale: typeof getLocale; availableLocales: typeof availableLocales };
export default _default;

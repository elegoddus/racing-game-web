import en from './en.js';
import vi from './vi.js';

const locales = { en, vi };
let current = 'en';
const listeners = new Set();

function notify() {
    listeners.forEach(listener => listener(current));
}

export function t(key, params = {}) {
    const dict = locales[current] || locales.en;
    let str = dict[key] || key;
    // simple param replace {name}
    Object.keys(params).forEach(k => {
        str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), params[k]);
    });
    return str;
}

export function setLocale(locale) {
    if (locales[locale] && current !== locale) {
        current = locale;
        notify();
    }
}

export function getLocale() {
    return current;
}

export function subscribe(callback) {
    listeners.add(callback);
    return () => listeners.delete(callback); // Returns an unsubscribe function
}

export function availableLocales() {
    return Object.keys(locales);
}

export default { t, setLocale, getLocale, availableLocales, subscribe };

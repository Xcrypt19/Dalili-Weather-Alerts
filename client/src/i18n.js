// Minimal i18n (FR-34, NFR 4.4 — English + Swahili).
import { createContext, useContext } from 'react';

export const STRINGS = {
  en: {
    dashboard: 'Dashboard', map: 'Map', alerts: 'Alerts', history: 'History',
    settings: 'Settings', logout: 'Log out', login: 'Log in', register: 'Sign up',
    guest: 'Continue as guest', email: 'Email', phone: 'Phone', password: 'Password',
    role: 'I am a…', language: 'Language', farmer: 'Farmer', business: 'Business / Transport',
    pilot: 'Pilot / Outdoor Pro', general: 'General User',
    currentWeather: 'Current Weather', hourly: '24-Hour Forecast', sevenDay: '7-Day Forecast',
    feelsLike: 'Humidity', wind: 'Wind', rainChance: 'Rain chance', uv: 'UV Index',
    storm: 'Storm risk', savedLocations: 'Saved Locations', addLocation: 'Add location',
    useMyLocation: 'Use my location', searchPlace: 'Search a place…',
    recentAlerts: 'Recent Alerts', noAlerts: 'No alerts yet — you are all clear.',
    thresholds: 'Alert Thresholds', channels: 'Notification Channels', quietHours: 'Quiet Hours',
    push: 'Push notifications', sms: 'SMS alerts', emailCh: 'Email alerts',
    smsAlerts: 'SMS Alerts', sendCode: 'Send code', verifyCode: 'Verify',
    enterCode: 'Enter the 6-digit code', verifiedPhone: 'Verified', notVerified: 'Not verified',
    smsExplain: 'Get alerts by text message — enter your Safaricom/Airtel/Telkom number and confirm the code we send you.',
    locating: 'Getting a precise fix…',
    save: 'Save', reset: 'Reset to defaults', export: 'Export CSV', monthlyTrends: 'Monthly Trends',
    profile: 'Profile', deleteAccount: 'Delete account', forgot: 'Forgot password?',
    welcome: 'Hyperlocal weather alerts, with advice that fits what you do.',
    advice: 'Advice', severity: 'Severity', backfill: 'Generate sample history',
    radarLayer: 'Radar layer', evaluateNow: 'Check alerts now',
  },
  sw: {
    dashboard: 'Dashibodi', map: 'Ramani', alerts: 'Tahadhari', history: 'Historia',
    settings: 'Mipangilio', logout: 'Toka', login: 'Ingia', register: 'Jisajili',
    guest: 'Endelea kama mgeni', email: 'Barua pepe', phone: 'Simu', password: 'Nenosiri',
    role: 'Mimi ni…', language: 'Lugha', farmer: 'Mkulima', business: 'Biashara / Usafiri',
    pilot: 'Rubani / Mtaalamu', general: 'Mtumiaji wa Kawaida',
    currentWeather: 'Hali ya Hewa Sasa', hourly: 'Utabiri wa Saa 24', sevenDay: 'Utabiri wa Siku 7',
    feelsLike: 'Unyevu', wind: 'Upepo', rainChance: 'Uwezekano wa mvua', uv: 'Kiwango cha UV',
    storm: 'Hatari ya dhoruba', savedLocations: 'Maeneo Yaliyohifadhiwa', addLocation: 'Ongeza eneo',
    useMyLocation: 'Tumia eneo langu', searchPlace: 'Tafuta eneo…',
    recentAlerts: 'Tahadhari za Hivi Karibuni', noAlerts: 'Hakuna tahadhari bado — uko salama.',
    thresholds: 'Vigezo vya Tahadhari', channels: 'Njia za Arifa', quietHours: 'Saa za Utulivu',
    push: 'Arifa za papo', sms: 'Arifa za SMS', emailCh: 'Arifa za barua pepe',
    smsAlerts: 'Arifa za SMS', sendCode: 'Tuma nambari', verifyCode: 'Thibitisha',
    enterCode: 'Weka nambari ya tarakimu 6', verifiedPhone: 'Imethibitishwa', notVerified: 'Haijathibitishwa',
    smsExplain: 'Pokea tahadhari kwa ujumbe wa simu — weka nambari yako ya Safaricom/Airtel/Telkom kisha uthibitishe nambari tutakayokutumia.',
    locating: 'Inatafuta mahali kamili…',
    save: 'Hifadhi', reset: 'Rudisha chaguo-msingi', export: 'Pakua CSV', monthlyTrends: 'Mwelekeo wa Kila Mwezi',
    profile: 'Wasifu', deleteAccount: 'Futa akaunti', forgot: 'Umesahau nenosiri?',
    welcome: 'Tahadhari za hali ya hewa za eneo lako, na ushauri unaolingana na kazi yako.',
    advice: 'Ushauri', severity: 'Ukali', backfill: 'Tengeneza historia ya mfano',
    radarLayer: 'Safu ya rada', evaluateNow: 'Angalia tahadhari sasa',
  },
};

export const I18nContext = createContext({ lang: 'en', t: (k) => STRINGS.en[k] || k });
export const useI18n = () => useContext(I18nContext);
export const makeT = (lang) => (k) => (STRINGS[lang] && STRINGS[lang][k]) || STRINGS.en[k] || k;

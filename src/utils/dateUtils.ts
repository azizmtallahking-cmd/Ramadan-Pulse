import moment from 'moment-hijri';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

export const getHijriDate = () => {
  return moment().format('iYYYY/iM/iD');
};

export const getGregorianDate = () => {
  return format(new Date(), 'eeee, d MMMM yyyy', { locale: ar });
};

export const getTunisianTime = () => {
  return new Intl.DateTimeFormat('ar-TN', {
    timeZone: 'Africa/Tunis',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(new Date());
};

export const getRamadanCountdown = () => {
  // Approximate Ramadan start dates (this should ideally be fetched from an API or updated)
  // For 2026, Ramadan is expected around Feb 18
  const ramadanStart = new Date('2026-02-18'); 
  const ramadanEnd = new Date('2026-03-20');
  const now = new Date();

  if (now < ramadanStart) {
    const diff = ramadanStart.getTime() - now.getTime();
    return {
      status: 'before',
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    };
  } else if (now < ramadanEnd) {
    const diff = ramadanEnd.getTime() - now.getTime();
    return {
      status: 'during',
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    };
  } else {
    // Next Ramadan (approximate)
    const nextRamadan = new Date('2027-02-08');
    const diff = nextRamadan.getTime() - now.getTime();
    return {
      status: 'after',
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    };
  }
};

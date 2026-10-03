// Audited against JetBrains/phpstorm-stubs e4f5f6c3de39f3bab3e9f3fca4b8cdb8b061e681, calendar/calendar.php.
// Apache-2.0. See THIRD_PARTY_NOTICES.md. Descriptive upstream text is omitted.
import type { SupportedPhpVersion } from './index.js';

export const CALENDAR_FUNCTIONS = [
  'jdtogregorian', 'gregoriantojd', 'jdtojulian', 'juliantojd', 'jdtojewish', 'jewishtojd',
  'jdtofrench', 'frenchtojd', 'jddayofweek', 'jdmonthname', 'easter_date', 'easter_days',
  'unixtojd', 'jdtounix', 'cal_to_jd', 'cal_from_jd', 'cal_days_in_month', 'cal_info',
] as const;

const calendarConstants = `
const CAL_GREGORIAN = 0;
const CAL_JULIAN = 1;
const CAL_JEWISH = 2;
const CAL_FRENCH = 3;
const CAL_NUM_CALS = 4;
const CAL_DOW_DAYNO = 0;
const CAL_DOW_SHORT = 2;
const CAL_DOW_LONG = 1;
const CAL_MONTH_GREGORIAN_SHORT = 0;
const CAL_MONTH_GREGORIAN_LONG = 1;
const CAL_MONTH_JULIAN_SHORT = 2;
const CAL_MONTH_JULIAN_LONG = 3;
const CAL_MONTH_JEWISH = 4;
const CAL_MONTH_FRENCH = 5;
const CAL_EASTER_DEFAULT = 0;
const CAL_EASTER_ROMAN = 1;
const CAL_EASTER_ALWAYS_GREGORIAN = 2;
const CAL_EASTER_ALWAYS_JULIAN = 3;
const CAL_JEWISH_ADD_ALAFIM_GERESH = 2;
const CAL_JEWISH_ADD_ALAFIM = 4;
const CAL_JEWISH_ADD_GERESHAYIM = 8;
`;

export function auditedCalendarStub(version: SupportedPhpVersion): string {
  const php80 = Number(version.replace('.', '')) >= 80;
  if (!php80) return `${calendarConstants}
/** @return string */ function jdtogregorian($juliandaycount) {}
/** @return int */ function gregoriantojd($month, $day, $year) {}
/** @return string */ function jdtojulian($juliandaycount) {}
/** @return int */ function juliantojd($month, $day, $year) {}
/** @return string */ function jdtojewish($juliandaycount, $hebrew = false, $fl = 0) {}
/** @return int */ function jewishtojd($month, $day, $year) {}
/** @return string */ function jdtofrench($juliandaycount) {}
/** @return int */ function frenchtojd($month, $day, $year) {}
/** @return string|int */ function jddayofweek($juliandaycount, $mode = CAL_DOW_DAYNO) {}
/** @return string */ function jdmonthname($juliandaycount, $mode) {}
/** @return int */ function easter_date($year = null) {}
/** @return int */ function easter_days($year = null, $method = CAL_EASTER_DEFAULT) {}
/** @return int|false */ function unixtojd($timestamp = null) {}
/** @return int|false */ function jdtounix($jday) {}
/** @return int */ function cal_to_jd($calendar, $month, $day, $year) {}
/** @return array{date:string,month:int,day:int,year:int,dow:int,abbrevdayname:string,dayname:string,abbrevmonth:string,monthname:string} */ function cal_from_jd($jd, $calendar) {}
/** @return int */ function cal_days_in_month($calendar, $month, $year) {}
/** @return array */ function cal_info($calendar = -1) {}
`;
  return `${calendarConstants}
function jdtogregorian(int $julian_day): string {}
function gregoriantojd(int $month, int $day, int $year): int {}
function jdtojulian(int $julian_day): string {}
function juliantojd(int $month, int $day, int $year): int {}
function jdtojewish(int $julian_day, bool $hebrew = false, int $flags = 0): string {}
function jewishtojd(int $month, int $day, int $year): int {}
function jdtofrench(int $julian_day): string {}
function frenchtojd(int $month, int $day, int $year): int {}
function jddayofweek(int $julian_day, int $mode = CAL_DOW_DAYNO): string|int {}
function jdmonthname(int $julian_day, int $mode): string {}
function easter_date(?int $year = null, int $mode = CAL_EASTER_DEFAULT): int {}
function easter_days(?int $year = null, int $mode = CAL_EASTER_DEFAULT): int {}
function unixtojd(?int $timestamp = null): int|false {}
function jdtounix(int $julian_day): int {}
function cal_to_jd(int $calendar, int $month, int $day, int $year): int {}
/** @return array{date:string,month:int,day:int,year:int,dow:int,abbrevdayname:string,dayname:string,abbrevmonth:string,monthname:string} */ function cal_from_jd(int $julian_day, int $calendar): array {}
function cal_days_in_month(int $calendar, int $month, int $year): int {}
/** @return array */ function cal_info(int $calendar = -1): array {}
`;
}

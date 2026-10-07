import { describe, expect, test } from 'bun:test'
import {
  addDays,
  addMonths,
  barredBy,
  calendarLocale,
  localToday,
  MONTH_CALENDARS,
  monthOf,
  monthOut,
  monthSystem,
  periodCells,
  periodKey,
  periodMove,
  todayIn,
  weekendOf,
  weekStartOf,
  yearOut,
  yearPageOf,
} from './calendar.js'

const day = (iso: string): Date => new Date(`${iso}T00:00:00Z`)
const rules = { disableDates: '', disableDays: '', min: '', step: 1 }

describe('the calendar arithmetic', () => {
  test('a month away is clamped to the end of a short month', () => {
    expect(addMonths(day('2026-01-31'), 1).toISOString().slice(0, 10)).toBe('2026-02-28')
    expect(monthOf(day('2026-08-04'))).toBe('2026-08')
  })

  test('a year below 100 stays that year as days and months are added', () => {
    expect(monthOf(day('0001-08-04'))).toBe('0001-08')
    expect(addDays(day('0001-08-31'), 1).toISOString().slice(0, 10)).toBe('0001-09-01')
    expect(addMonths(day('0001-12-15'), 1).toISOString().slice(0, 10)).toBe('0002-01-15')
  })

  test('today is the local date', () => {
    expect(localToday(new Date(2026, 7, 4, 23, 30))).toBe('2026-08-04')
  })

  test('a locale starts its week where its week starts, or on Sunday', () => {
    expect(weekStartOf('not a tag')).toBe(0)
    expect([0, 1]).toContain(weekStartOf('en-GB'))
  })
})

describe('calendarLocale', () => {
  test('a calendar with months of its own is written as Gregorian', () => {
    expect(calendarLocale('fa-IR')).toBe('fa-IR-u-ca-gregory')
    expect(calendarLocale('en-US-u-ca-islamic-umalqura')).toBe('en-US-u-ca-gregory')
    expect(calendarLocale('he-IL-u-ca-hebrew')).toBe('he-IL-u-ca-gregory')
    expect(calendarLocale('zh-CN-u-ca-chinese')).toBe('zh-CN-u-ca-gregory')
  })

  test('a calendar whose months are the Gregorian months is kept', () => {
    expect(calendarLocale('en-US')).toBe('en-US')
    expect(calendarLocale('th-TH')).toBe('th-TH')
    expect(calendarLocale('ja-JP-u-ca-japanese')).toBe('ja-JP-u-ca-japanese')
    expect(calendarLocale('zh-TW-u-ca-roc')).toBe('zh-TW-u-ca-roc')
  })

  test('a calendar asked for wins, and a name no date family draws is ignored', () => {
    expect(calendarLocale('fa-IR', 'japanese')).toBe('fa-IR-u-ca-japanese')
    expect(calendarLocale('th-TH', 'gregory')).toBe('th-TH-u-ca-gregory')
    expect(calendarLocale('en-US-u-ca-islamic', 'roc')).toBe('en-US-u-ca-roc')
    expect(calendarLocale('en-US', 'persian')).toBe('en-US-u-ca-persian')
    expect(calendarLocale('fa-IR', 'persian')).toBe('fa-IR-u-ca-persian')
    expect(calendarLocale('zh-CN', 'chinese')).toBe('zh-CN-u-ca-chinese')
    expect(calendarLocale('en-US', 'lunar')).toBe('en-US')
  })

  test('the runtime locale takes a calendar too, and a tag Intl refuses throws as a formatter does', () => {
    expect(calendarLocale('', 'buddhist')).toEndWith('-u-ca-buddhist')
    expect(() => calendarLocale('not a tag')).toThrow(RangeError)
  })
})

describe('barredBy', () => {
  test('names a date the rules list, or a rule refuses', () => {
    expect(barredBy(day('2026-08-04'), { ...rules, disableDates: '2026-08-04' })).toBe('listed')
    expect(barredBy(day('2026-08-09'), { ...rules, disableDays: '0' })).toBe('listed')
    expect(
      barredBy(day('2026-08-13'), { ...rules, isDateUnavailable: (date) => date.endsWith('13') }),
    ).toBe('listed')
    expect(barredBy(day('2026-08-14'), rules)).toBeNull()
  })

  test('a date step skips, counted from min', () => {
    const weekly = { ...rules, min: '2026-08-03', step: 7 }
    expect(barredBy(day('2026-08-10'), weekly)).toBeNull()
    expect(barredBy(day('2026-08-11'), weekly)).toBe('step')
  })
})

describe('the months and years', () => {
  test('a page of years starts at a multiple of twelve', () => {
    expect(yearPageOf(2026)).toBe(2016)
    expect(yearPageOf(2028)).toBe(2028)
  })

  test('the keys move along a row, a row, to its ends, and a page', () => {
    expect(periodMove('ArrowRight', 4, 1)).toBe(1)
    expect(periodMove('ArrowLeft', 4, -1)).toBe(-1)
    expect(periodMove('ArrowDown', 4, 0)).toBe(3)
    expect(periodMove('Home', 4, 0)).toBe(-1)
    expect(periodMove('End', 4, 0)).toBe(1)
    expect(periodMove('PageUp', 4, 0)).toBe(-12)
    expect(periodMove('a', 4, 0)).toBeNull()
  })
})

describe('the months and the years', () => {
  test('a day away crosses a month and a year', () => {
    expect(addDays(day('2026-12-31'), 1).toISOString().slice(0, 10)).toBe('2027-01-01')
    expect(addDays(day('2026-03-01'), -1).toISOString().slice(0, 10)).toBe('2026-02-28')
  })

  test('a month or a year is out only when it lies wholly past a bound', () => {
    expect(monthOut(day('2026-03-01'), '2026-03-31', '')).toBe(false)
    expect(monthOut(day('2026-02-01'), '2026-03-31', '')).toBe(true)
    expect(monthOut(day('2026-09-01'), '', '2026-08-01')).toBe(true)
    expect(monthOut(day('2026-09-01'), '', '')).toBe(false)
    expect(yearOut(2025, '2026-06-01', '')).toBe(true)
    expect(yearOut(2026, '2026-06-01', '2026-06-02')).toBe(false)
    expect(yearOut(2027, '', '2026-12-31')).toBe(true)
  })

  test('the months of a year, with the one shown, this month and the ones out of bounds', () => {
    const cells = periodCells({
      max: '2026-10-15',
      min: '',
      page: 2026,
      shown: day('2026-08-01'),
      today: '2026-05-20',
      view: 'month',
    })
    expect(cells.map((one) => one.at)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])
    expect(cells.filter((one) => one.chosen).map((one) => one.at)).toEqual([7])
    expect(cells.filter((one) => one.current).map((one) => one.at)).toEqual([4])
    expect(cells.filter((one) => one.out).map((one) => one.at)).toEqual([10, 11])
    expect(monthOf(cells[3]?.first as Date)).toBe('2026-04')
  })

  test('a page of years, from any year on it', () => {
    const cells = periodCells({
      max: '',
      min: '2019-01-01',
      page: 2021,
      shown: day('2020-08-01'),
      today: '2026-05-20',
      view: 'year',
    })
    expect(cells.map((one) => one.at)).toEqual([
      2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026, 2027,
    ])
    expect(cells.filter((one) => one.chosen).map((one) => one.at)).toEqual([2020])
    expect(cells.filter((one) => one.current).map((one) => one.at)).toEqual([2026])
    expect(cells.filter((one) => one.out).map((one) => one.at)).toEqual([2016, 2017, 2018])
  })

  test('a key moves the stop among the months, into the next year and the last', () => {
    expect(periodKey('month', 4, 2026, 'ArrowDown', 0)).toEqual({ focus: 7, pageYear: 2026 })
    expect(periodKey('month', 11, 2026, 'ArrowRight', 1)).toEqual({ focus: 0, pageYear: 2027 })
    expect(periodKey('month', 1, 2026, 'ArrowUp', 0)).toEqual({ focus: 10, pageYear: 2025 })
    expect(periodKey('month', 4, 2026, 'PageDown', 0)).toEqual({ focus: 4, pageYear: 2027 })
    expect(periodKey('month', 4, 2026, 'Enter', 0)).toBeNull()
  })

  test('and among the years, the page following the stop', () => {
    expect(periodKey('year', 2027, 2026, 'ArrowRight', 1)).toEqual({ focus: 2028, pageYear: 2028 })
    expect(periodKey('year', 2019, 2019, 'End', 0)).toEqual({ focus: 2021, pageYear: 2021 })
    expect(periodKey('year', 2021, 2021, 'PageUp', 0)).toEqual({ focus: 2009, pageYear: 2009 })
  })
})

/* React Aria reads today in a time zone of your choosing, and Zag marks the
   weekend days a locale keeps. */
describe('today in a time zone, and the weekend', () => {
  /* 03:30 UTC on September 2 is still September 1 in New York and already
     September 2 in Tokyo. */
  const late = new Date(Date.UTC(2026, 8, 2, 3, 30))

  test('today is the date in the zone asked for', () => {
    expect(todayIn('America/New_York', late)).toBe('2026-09-01')
    expect(todayIn('Asia/Tokyo', late)).toBe('2026-09-02')
  })

  test("and the reader's own where none is asked for, or the zone is unknown", () => {
    expect(todayIn('', late)).toBe(localToday(late))
    expect(todayIn('Not/AZone', late)).toBe(localToday(late))
  })

  test("the weekend is the locale's", () => {
    expect(weekendOf('en-US').sort()).toEqual([0, 6])
    expect(weekendOf('not a tag')).toEqual([0, 6])
  })
})

/* React Aria draws the Persian, Hebrew, Islamic, Ethiopic, Coptic and Indian
   calendars with their own months; here every grid was a Gregorian month. */
describe('the months of a calendar with months of its own', () => {
  const iso = (date: Date): string => date.toISOString().slice(0, 10)

  test('start on the first of the month as the calendar counts it', () => {
    const persian = monthSystem('persian')
    expect(iso(persian.start(day('2026-10-06')))).toBe('2026-09-23')
    expect(persian.day(day('2026-10-06'))).toBe(14)
    expect(persian.key(day('2026-10-06'))).toBe('2026-09-23')
    expect(persian.same(day('2026-09-23'), day('2026-10-22'))).toBe(true)
    expect(persian.same(day('2026-10-22'), day('2026-10-23'))).toBe(false)
  })

  test('page by whole months of their own length, keeping the day where it fits', () => {
    const persian = monthSystem('persian')
    expect(iso(persian.add(day('2026-10-06'), 1))).toBe('2026-11-05')
    expect(iso(persian.add(day('2026-10-06'), -1))).toBe('2026-09-05')
    const islamic = monthSystem('islamic-umalqura')
    const first = islamic.start(day('2026-10-06'))
    const next = islamic.add(first, 1)
    const span = (next.getTime() - first.getTime()) / 86_400_000
    expect([29, 30]).toContain(span)
    expect(islamic.day(next)).toBe(1)
  })

  test("take the Hebrew leap month and Ethiopia's short thirteenth month in their stride", () => {
    /* 5787 is a leap year, with Adar I and Adar II. */
    const hebrew = monthSystem('hebrew')
    const names = new Intl.DateTimeFormat('en-u-ca-hebrew', { month: 'long', timeZone: 'UTC' })
    let at = hebrew.start(day('2026-09-12'))
    const seen: string[] = []
    for (let month = 0; month < 13; month += 1) {
      seen.push(names.format(at))
      at = hebrew.add(at, 1)
    }
    expect(seen).toContain('Adar I')
    expect(seen).toContain('Adar II')
    const ethiopic = monthSystem('ethiopic')
    const pagume = ethiopic.start(day('2026-09-08'))
    expect(iso(ethiopic.add(pagume, 1))).toBe('2026-09-11')
  })

  test('and every other calendar is the Gregorian months', () => {
    const gregorian = monthSystem('buddhist')
    expect(gregorian.key(day('2026-10-06'))).toBe('2026-10')
    expect(iso(gregorian.start(day('2026-10-06')))).toBe('2026-10-01')
    expect(gregorian.day(day('2026-10-06'))).toBe(6)
  })
})

/* The months and the years views, and Date Input's segments, count in the
   calendar's own years and months: 13 in a Hebrew leap year and in Ethiopia,
   and the Chinese year by its Gregorian number. */
describe('the years of a calendar with months of its own', () => {
  const iso = (date: Date): string => date.toISOString().slice(0, 10)

  test("a date's year, month and day, and back", () => {
    const persian = monthSystem('persian')
    expect(persian.parts(day('2026-10-06'))).toEqual({ day: 14, month: 7, year: 1405 })
    expect(iso(persian.from(1405, 7, 14))).toBe('2026-10-06')
    expect(iso(persian.from(1405, 1, 1))).toBe('2026-03-21')
    const hebrew = monthSystem('hebrew')
    expect(hebrew.parts(day('2026-09-12'))).toEqual({ day: 1, month: 1, year: 5787 })
    const chinese = monthSystem('chinese')
    expect(chinese.parts(day('2026-02-17')).year).toBe(2026)
    expect(chinese.parts(day('2026-02-16')).year).toBe(2025)
    expect(chinese.parts(day('2026-02-17')).month).toBe(1)
  })

  test('a year has the months the calendar gives it', () => {
    expect(monthSystem('hebrew').months(5787)).toBe(13)
    expect(monthSystem('hebrew').months(5786)).toBe(12)
    expect(monthSystem('ethiopic').months(2019)).toBe(13)
    expect(monthSystem('ethiopic').days(2018, 13)).toBe(5)
    expect(monthSystem('persian').months(1405)).toBe(12)
    expect(monthSystem('islamic-civil').months(1448)).toBe(12)
    expect(monthSystem('chinese').months(2025)).toBe(13)
    expect(monthSystem('gregory').months(2026)).toBe(12)
  })

  test('a day and a month beyond their ends are kept inside them', () => {
    const ethiopic = monthSystem('ethiopic')
    expect(ethiopic.parts(ethiopic.from(2018, 13, 30))).toEqual({ day: 5, month: 13, year: 2018 })
    expect(ethiopic.parts(ethiopic.from(2018, 14, 1))).toEqual({ day: 1, month: 13, year: 2018 })
    expect(iso(monthSystem('').from(2026, 2, 31))).toBe('2026-02-28')
  })

  test('a year away keeps the month by its name, across a leap year', () => {
    const hebrew = monthSystem('hebrew')
    const names = new Intl.DateTimeFormat('en-u-ca-hebrew', { month: 'long', timeZone: 'UTC' })
    // Nisan 5786 to Nisan 5787, which is the eighth month in a leap year.
    const nisan = hebrew.from(5786, 7, 10)
    expect(names.format(nisan)).toBe('Nisan')
    expect(names.format(hebrew.addYears(nisan, 1))).toBe('Nisan')
    // Adar 5786 to Adar II 5787, and Adar I back to Adar.
    expect(names.format(hebrew.addYears(hebrew.from(5786, 6, 10), 1))).toBe('Adar II')
    expect(names.format(hebrew.addYears(hebrew.from(5787, 6, 10), -1))).toBe('Adar')
    expect(iso(monthSystem('').addYears(day('2024-02-29'), 1))).toBe('2025-02-28')
  })

  test('the months view and the years view count in the calendar', () => {
    const hebrew = monthSystem('hebrew')
    const cells = periodCells({
      max: '',
      min: '',
      page: 5787,
      shown: hebrew.from(5787, 8, 1),
      system: hebrew,
      today: '2026-10-06',
      view: 'month',
    })
    expect(cells).toHaveLength(13)
    expect(cells.filter((one) => one.chosen).map((one) => one.at)).toEqual([7])
    expect(cells.filter((one) => one.current).map((one) => one.at)).toEqual([0])
    const years = periodCells({
      max: '2027-12-31',
      min: '',
      page: 1405,
      shown: day('2026-10-01'),
      system: monthSystem('persian'),
      today: '2026-10-06',
      view: 'year',
    })
    expect(years.map((one) => one.at)).toEqual([
      1404, 1405, 1406, 1407, 1408, 1409, 1410, 1411, 1412, 1413, 1414, 1415,
    ])
    expect(years.filter((one) => one.chosen).map((one) => one.at)).toEqual([1405])
    expect(years.filter((one) => one.out).map((one) => one.at)).toEqual([
      1407, 1408, 1409, 1410, 1411, 1412, 1413, 1414, 1415,
    ])
  })

  test('a key moves across a year of thirteen months', () => {
    const months = (year: number): number => monthSystem('hebrew').months(year)
    expect(periodKey('month', 12, 5787, 'ArrowRight', 1, months)).toEqual({
      focus: 0,
      pageYear: 5788,
    })
    expect(periodKey('month', 0, 5788, 'ArrowLeft', -1, months)).toEqual({
      focus: 12,
      pageYear: 5787,
    })
    expect(periodKey('month', 12, 5787, 'PageDown', 0, months)).toEqual({
      focus: 11,
      pageYear: 5788,
    })
  })

  test('every calendar Intl knows reads back the dates it writes', () => {
    for (const name of MONTH_CALENDARS) {
      const system = monthSystem(name)
      for (const value of ['1990-01-01', '2026-10-06', '2027-03-20', '2061-12-31']) {
        const { day: dayOf, month, year } = system.parts(day(value))
        expect([name, iso(system.from(year, month, dayOf))]).toEqual([name, value])
      }
    }
  })
})

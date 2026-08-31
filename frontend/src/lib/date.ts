// Date-only (no time-of-day) conversion, defensive against Mantine's
// DateInput emitting either a Date object or an already-formatted
// "YYYY-MM-DD" string depending on how the value was entered (typed vs.
// picked from the calendar — see @mantine/dates' `DateValue` type).
// When formatting a real Date, this uses LOCAL date components — never
// Date#toISOString(), which emits UTC and silently shifts the calendar day
// near midnight in timezones behind UTC.
export function toDateOnlyString(value: Date | string): string {
  if (typeof value === 'string') return value

  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Display-only: "YYYY-MM-DD" (as stored/returned by the API) -> "DD.MM.YYYY"
// (the app's chosen display format everywhere a date is shown as text).
export function formatDateDisplay(isoDate: string): string {
  const [year, month, day] = isoDate.split('-')
  return `${day}.${month}.${year}`
}

import dayjs from 'dayjs'

export function newDateFromParis() {
  const timezone = dayjs.tz.guess()
  const inParis = dayjs.tz(dayjs().startOf('day'), 'Europe/Paris').startOf('day')

  return inParis.tz(timezone)
}

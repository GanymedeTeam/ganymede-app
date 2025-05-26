export function errorToObject(error: object): Record<string, unknown> {
  return Object.getOwnPropertyNames(error).reduce(
    (acc, p) => ({
      ...acc,
      [p]: error[p as keyof typeof error],
    }),
    {} as Record<string, unknown>,
  )
}

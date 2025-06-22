export function paginate<T>({ page, itemsPerPage, items }: { page: number; itemsPerPage: number; items: T[] }): T[] {
  const start = (page - 1) * itemsPerPage
  const end = page * itemsPerPage

  return page === -1 ? items : items.slice(start, end)
}

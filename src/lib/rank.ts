import { rankItem } from '@tanstack/match-sorter-utils'

// biome-ignore lint/suspicious/noExplicitAny: needed any
type RankListParams<T extends Record<any, unknown>> = {
  list: T[]
  keys: ((item: T) => string)[]
  sortKeys?: ((item: T) => number | null)[]
  term: string
}

/**
 * Rank a list of items based on a term and sort them by rank
 */
// biome-ignore lint/suspicious/noExplicitAny: needed any
export function rankList<T extends Record<any, unknown>>({ list, keys, sortKeys, term }: RankListParams<T>): T[] {
  return [...list]
    .map(
      (item) =>
        [
          item,
          rankItem(item, term, {
            accessors: keys,
          }),
        ] as const,
    )
    .filter(([, rank]) => rank.passed)
    .sort(([itemA, rankA], [itemB, rankB]) => {
      const rankComparison = rankB.rank - rankA.rank

      if (sortKeys) {
        for (const key of sortKeys) {
          const [aValue, bValue] = [key(itemA) || Number.MAX_SAFE_INTEGER, key(itemB) || Number.MAX_SAFE_INTEGER]

          if (aValue === 0 && bValue !== 0) return -1
          if (bValue === 0 && aValue !== 0) return 1

          const keyComparison = bValue - aValue
          if (keyComparison !== 0) return keyComparison
        }
      }

      return rankComparison
    })
    .map(([item]) => {
      return item
    })
}

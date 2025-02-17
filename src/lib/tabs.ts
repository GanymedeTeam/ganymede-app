import { z } from 'zod'

export const OpenedGuideZod = z.coerce.number()

export type OpenedGuide = z.infer<typeof OpenedGuideZod>

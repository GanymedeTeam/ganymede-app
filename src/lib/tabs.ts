import { z } from 'zod'

export const OpenedGuideZod = z.object({
  id: z.coerce.number(),
  step: z.coerce.number(),
})

export type OpenedGuide = z.infer<typeof OpenedGuideZod>

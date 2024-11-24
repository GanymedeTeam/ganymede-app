import { ProfileZod } from '@/types/profile.ts'
import { z } from 'zod'

export const ConfZod = z.object({
  autoTravelCopy: z.boolean().default(true),
  showDoneGuides: z.boolean().default(true),
  lang: z.enum(['En', 'Fr', 'Es', 'Pt']).default('Fr'),
  fontSize: z.enum(['ExtraSmall', 'Small', 'Normal', 'Large', 'ExtraLarge']).default('Normal'),
  profiles: z.array(ProfileZod),
  profileInUse: z.string(),
  autoPilots: z.array(
    z.object({
      name: z.string(),
      position: z.string(),
    }),
  ),
  notes: z.array(
    z.object({
      name: z.string(),
      text: z.string(),
    }),
  ),
  opacity: z.number().max(0.94).min(0).default(0.94),
  shortcuts: z.object({
    goToNextGuideStep: z.string().default('CommandOrControl+Shift+D'),
    goToPreviousGuideStep: z.string().default('CommandOrControl+Shift+F'),
  }),
})

export type Conf = z.infer<typeof ConfZod>

export type Lang = Conf['lang']

export type FontSize = Conf['fontSize']

export type AutoPilot = Conf['autoPilots'][number]

export type Note = Conf['notes'][number]

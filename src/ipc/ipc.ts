import { GuideWithSteps, createTauRPCProxy } from '@/ipc/bindings.ts'

export const taurpc = await createTauRPCProxy()

// specta-rs doesn't seem to resolve fields with "skip_deserializing" attribute,
// so we need to manually define the folder field here.
export type GuideWithStepsWithFolder = GuideWithSteps & { folder?: string }

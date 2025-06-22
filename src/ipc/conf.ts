import { fromPromise } from 'neverthrow'
import { Conf } from '@/ipc/bindings.ts'
import { taurpc } from '@/ipc/ipc.ts'

export class GetConfError extends Error {
  static from(error: unknown) {
    return new GetConfError('Failed to get conf', { cause: error })
  }
}

export function getConf() {
  return fromPromise(taurpc.conf.get(), GetConfError.from)
}

export class SetConfError extends Error {
  static from(error: unknown) {
    return new SetConfError('Failed to set conf', { cause: error })
  }
}

export async function setConf(conf: Conf) {
  return fromPromise(taurpc.conf.set(conf), SetConfError.from)
}

export class ResetConfError extends Error {
  static from(error: unknown) {
    return new ResetConfError('Failed to reset conf', { cause: error })
  }
}

export async function resetConf() {
  return fromPromise(taurpc.conf.reset(), ResetConfError.from)
}

export class ToggleGuideCheckboxError extends Error {
  static from(error: unknown) {
    return new ToggleGuideCheckboxError('Failed to toggle checkbox guide', { cause: error })
  }
}

export function toggleGuideCheckbox(guideId: number, checkboxIndex: number, stepIndex: number) {
  return fromPromise(taurpc.conf.toggleGuideCheckbox(guideId, stepIndex, checkboxIndex), ToggleGuideCheckboxError.from)
}

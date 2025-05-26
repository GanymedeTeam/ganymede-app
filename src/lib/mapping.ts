import mappingData from '../assets/mapping.json'
// To refresh the mapping file: https://github.com/AntoninHuaut/DofusNoobsIdentifier

interface MappingData {
  dungeon: Record<string, string>
  quest: Record<string, string>
}

export function getDofusPourLesNoobsUrl(dofusdbId: string, resourceType: string): string | null {
  const mapping = mappingData as MappingData

  if (resourceType !== 'quest' && resourceType !== 'dungeon') {
    return null
  }

  return mapping?.[resourceType]?.[dofusdbId] ?? null
}

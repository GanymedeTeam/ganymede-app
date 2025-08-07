import { useQuery } from '@tanstack/react-query'
import { error } from '@tauri-apps/plugin-log'
import { fromPromise } from 'neverthrow'
import { ComponentProps } from 'react'
import { GenericLoader } from '@/components/generic_loader.tsx'
import { taurpc } from '@/ipc/ipc.ts'
import { GANYMEDE_HOST } from '@/lib/api.ts'
import { cn } from '@/lib/utils.ts'

class FetchImageError extends Error {}

export function DownloadImage({ src, ...props }: Omit<ComponentProps<'img'>, 'srcset'> & {}) {
  const enabled = !!src && src.startsWith('http') && (src.includes('dofusdb.fr') || src.includes(GANYMEDE_HOST))
  const image = useQuery({
    queryKey: ['image', src],
    queryFn: async () => {
      // should not happen with enabled: !!src
      if (!src) throw new Error('No image source provided')

      const data = await fromPromise(
        taurpc.image.fetchImage(src),
        (err) => new FetchImageError('Failed to load image', { cause: err }),
      )

      if (data.isErr()) throw data.error

      const binary = String.fromCharCode(...new Uint8Array(data.value))

      return btoa(binary)
    },
    enabled,
    staleTime: Infinity,
    retry: 2,
  })

  if (!enabled) return <img alt="" src={src} {...props} />

  if (image.isLoading) {
    return (
      <span className="mr-[0.17em] inline-block">
        <GenericLoader data-slot="loader" className={cn('inline-block size-[1.05rem]', props.className)} />
      </span>
    )
  }

  if (image.isError) {
    error(`Failed to load image: ${src}. ${image.error.message}`).then(() => {
      error(image.error.stack ?? 'No stack trace')
    })

    return <img alt="" src={src} referrerPolicy="same-origin" {...props} />
  }

  return <img alt="" src={`data:image/png;base64,${image.data}`} referrerPolicy="same-origin" {...props} />
}

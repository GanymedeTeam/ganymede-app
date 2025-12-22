import { Trans } from '@lingui/react/macro'
import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { type Dayjs } from 'dayjs'
import { ChevronLeftIcon, ChevronRightIcon, LoaderIcon } from 'lucide-react'
import { useState } from 'react'
import kamasIcon from '@/assets/kamas.webp'
import xpIcon from '@/assets/xp.webp'
import { CopyOnClick } from '@/components/copy_on_click.tsx'
import { DownloadImage } from '@/components/download_image.tsx'
import { InvisibleInput } from '@/components/invisible_input.tsx'
import { Button } from '@/components/ui/button.tsx'
import { useProfile } from '@/hooks/use_profile.ts'
import { getLang } from '@/lib/conf.ts'
import { newDateFromParis } from '@/lib/date.ts'
import { useSetConf } from '@/mutations/set_conf.mutation.ts'
import { almanaxQuery } from '@/queries/almanax.query.ts'
import { confQuery } from '@/queries/conf.query.ts'

function dateToDayMonthYear(date: Dayjs) {
  if (date.hour() === 0) {
    return date.format('DD/MM/YYYY')
  }

  return date.format('DD/MM/YYYY HH:mm')
}

const defaultLevel = 200

export function AlmanaxFrame() {
  const [date, setDate] = useState(newDateFromParis())
  const setConf = useSetConf()
  const conf = useSuspenseQuery(confQuery)
  const profile = useProfile()
  const [almanaxLevel, setAlmanaxLevel] = useState((profile.level ?? defaultLevel).toString())
  const almanax = useQuery(almanaxQuery(getLang(conf.data.lang), profile.level ?? defaultLevel, date))

  const onPreviousDay = () => {
    setDate(date.subtract(1, 'day'))
  }
  const onNextDay = () => {
    setDate(date.add(1, 'day'))
  }
  const onGoToday = () => {
    setDate(newDateFromParis())
  }

  return (
    <>
      <div className="flex gap-1">
        <Button className="sticky top-1 z-11 self-start" onClick={onPreviousDay} size="icon-sm">
          <ChevronLeftIcon />
        </Button>
        <Button className="sticky top-1 z-11 self-start" onClick={onNextDay} size="icon-sm">
          <ChevronRightIcon />
        </Button>
        <div className="sticky top-0 z-10 flex grow items-center gap-2 font-semibold text-blue-300">
          <span className="mx-auto text-xs xs:text-base">{dateToDayMonthYear(date)}</span>
          <Button className="h-7" onClick={onGoToday}>
            <Trans>Aujourd'hui</Trans>
          </Button>
        </div>
      </div>
      <div className="scroller relative z-10 flex h-45 w-full items-center justify-center overflow-y-auto rounded-md border-2 border-blue-100/80 bg-secondary px-2 pb-2 text-secondary-foreground">
        <div className="flex h-full grow flex-col gap-2">
          <div className="mx-3 flex flex-col text-sm">
            <span className="flex gap-1">
              Lvl:{' '}
              <InvisibleInput
                className="text-left"
                max={200}
                min={1}
                onChange={setAlmanaxLevel}
                onSubmit={(value) => {
                  if (value === '') {
                    setAlmanaxLevel((profile.level ?? defaultLevel).toString())
                    return
                  }

                  const level = parseInt(value)

                  if (value === '' || Number.isNaN(level)) {
                    return
                  }

                  setConf.mutate({
                    ...conf.data,
                    profiles: conf.data.profiles.map((p) => {
                      if (p.id === conf.data.profileInUse) {
                        return {
                          ...p,
                          level,
                        }
                      }
                      return p
                    }),
                  })
                  setAlmanaxLevel(level.toString())
                }}
                value={almanaxLevel}
              />
            </span>
          </div>
          {almanax.isLoading && (
            <div className="flex grow items-center justify-center">
              <LoaderIcon className="size-8 animate-spin text-blue-400 duration-1000" />
            </div>
          )}
          {almanax.isSuccess && (
            <>
              <div className="flex justify-center gap-2">
                {almanax.data.img && (
                  <DownloadImage
                    className="mr-0 size-10 self-slot-[loader]:p-2 self-slot-[loader]:text-yellow-300"
                    src={almanax.data.img}
                  />
                )}
                <div className="flex flex-col gap-2">
                  <CopyOnClick title={almanax.data.name}>
                    <div className="flex items-center gap-1 text-center text-xxs xs:text-xs">
                      {almanax.data.quantity.toLocaleString()}x{' '}
                      <span className="line-clamp-1 font-semibold text-yellow-300">{almanax.data.name}</span>
                    </div>
                  </CopyOnClick>
                  <div className="flex gap-4">
                    <div className="flex items-center justify-center gap-2 text-xs">
                      <img className="h-3 select-none" draggable={false} src={xpIcon} />
                      <span>{almanax.data.experience.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-center gap-2 text-xs">
                      <img className="h-3 select-none" draggable={false} src={kamasIcon} />
                      <span>{almanax.data.kamas.toLocaleString()} </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="prose-sm text-center text-xxs" dangerouslySetInnerHTML={{ __html: almanax.data.bonus }} />
            </>
          )}
        </div>
      </div>
    </>
  )
}

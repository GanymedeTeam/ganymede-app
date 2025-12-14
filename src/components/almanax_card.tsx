import { Trans } from '@lingui/react/macro'
import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { type Dayjs } from 'dayjs'
import { ChevronLeftIcon, ChevronRightIcon, LoaderIcon, Undo2Icon } from 'lucide-react'
import { useState } from 'react'
import kamasIcon from '@/assets/kamas.webp'
import xpIcon from '@/assets/xp.webp'
import { CopyOnClick } from '@/components/copy_on_click.tsx'
import { DownloadImage } from '@/components/download_image.tsx'
import { InvisibleInput } from '@/components/invisible_input.tsx'
import { Button } from '@/components/ui/button.tsx'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip.tsx'
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

export function AlmanaxCard() {
  const [date, setDate] = useState(newDateFromParis())
  const setConf = useSetConf()
  const conf = useSuspenseQuery(confQuery)
  const profile = useProfile()
  const [almanaxLevel, setAlmanaxLevel] = useState((profile.level ?? defaultLevel).toString())
  const almanax = useQuery(almanaxQuery(getLang(conf.data.lang), profile.level ?? defaultLevel, date))

  const isToday = date.isSame(newDateFromParis(), 'day')

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
    <div className="flex flex-col gap-3 rounded-xl border border-border-muted bg-surface-card p-3 shadow-[0_5px_14px_rgba(0,0,0,0.5)]">
      {/* Header: Date Navigation */}
      <div className="flex items-center justify-between gap-2">
        {/* Nav buttons */}
        <div className="flex items-center gap-1">
          <Button size="icon-sm" variant="ghost" onClick={onPreviousDay} className="size-8 hover:bg-surface-inset/70">
            <ChevronLeftIcon className="size-4" />
          </Button>
          <Button size="icon-sm" variant="ghost" onClick={onNextDay} className="size-8 hover:bg-surface-inset/70">
            <ChevronRightIcon className="size-4" />
          </Button>
        </div>

        {/* Date display */}
        <span className="font-semibold text-accent text-sm">{dateToDayMonthYear(date)}</span>

        {/* Today button */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={onGoToday}
                disabled={isToday}
                className="size-8 hover:bg-surface-inset/70 disabled:opacity-30"
              >
                <Undo2Icon className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <Trans>Aujourd'hui</Trans>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Level input */}
      <div className="flex items-center gap-2 text-xs">
        <span className="text-muted-foreground">Lvl:</span>
        <div className="flex cursor-text items-center rounded-md border border-border-muted bg-surface-inset px-2 py-1 transition-colors focus-within:border-accent hover:border-accent/50">
          <InvisibleInput
            className="w-8 text-left font-semibold text-foreground"
            min={1}
            max={200}
            value={almanaxLevel}
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
          />
        </div>
      </div>

      {/* Content */}
      <div className="min-h-28">
        {almanax.isLoading && (
          <div className="flex h-28 items-center justify-center">
            <LoaderIcon className="size-6 animate-spin text-accent duration-1000" />
          </div>
        )}

        {almanax.isSuccess && (
          <div className="flex flex-col gap-3">
            {/* Item info */}
            <div className="flex items-center gap-3">
              {almanax.data.img && (
                <DownloadImage
                  src={almanax.data.img}
                  className="size-12 rounded-lg bg-surface-inset self-slot-[loader]:p-2 self-slot-[loader]:text-accent"
                />
              )}
              <div className="flex min-w-0 flex-col gap-1">
                <CopyOnClick title={almanax.data.name}>
                  <div className="flex items-baseline gap-1.5 text-sm">
                    <span className="font-bold text-accent">{almanax.data.quantity.toLocaleString()}x</span>
                    <span className="line-clamp-1 font-semibold text-accent-light">{almanax.data.name}</span>
                  </div>
                </CopyOnClick>

                {/* XP & Kamas */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground text-xs">
                  <div className="flex items-center gap-1.5">
                    <img src={xpIcon} className="h-3.5 select-none" draggable={false} alt="XP" />
                    <span>{almanax.data.experience.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <img src={kamasIcon} className="h-3.5 select-none" draggable={false} alt="Kamas" />
                    <span>{almanax.data.kamas.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bonus description */}
            <div
              className="text-muted-foreground text-xs leading-relaxed"
              dangerouslySetInnerHTML={{ __html: almanax.data.bonus }}
            />
          </div>
        )}
      </div>
    </div>
  )
}

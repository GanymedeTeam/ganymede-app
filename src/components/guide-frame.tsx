import goToStepIcon from '@/assets/guide-go-to-step.webp'
import { useGuide } from '@/hooks/use_guide.ts'
import { useProfile } from '@/hooks/use_profile.ts'
import { clamp } from '@/lib/clamp.ts'
import { copyPosition } from '@/lib/copy-position.ts'
import { getGuideById } from '@/lib/guide.ts'
import { getProgress, getProgressConfStep } from '@/lib/progress.ts'
import { cn } from '@/lib/utils.ts'
import { useDownloadGuideFromServer } from '@/mutations/download-guide-from-server.mutation.ts'
import { useOpenUrlInBrowser } from '@/mutations/open-url-in-browser.ts'
import { useToggleGuideCheckbox } from '@/mutations/toggle-guide-checkbox.mutation.ts'
import { confQuery } from '@/queries/conf.query.ts'
import { guidesQuery } from '@/queries/guides.query.ts'
import { whiteListQuery } from '@/queries/white_list.query.ts'
import { Trans, useLingui } from '@lingui/react/macro'
import { useSuspenseQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { writeText } from '@tauri-apps/plugin-clipboard-manager'
import parse, { DOMNode, domToReact, type HTMLReactParserOptions } from 'html-react-parser'
import { AlertCircleIcon, BookCheckIcon, BookPlusIcon } from 'lucide-react'
import { Fragment, ReactNode } from 'react'
import { DownloadImage } from './download-image.tsx'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip.tsx'

export function GuideFrame({
  className,
  html,
  guideId,
  stepIndex,
}: {
  className?: string
  html: string
  guideId: number
  stepIndex: number
}) {
  const { t } = useLingui()
  const conf = useSuspenseQuery(confQuery)
  const profile = useProfile()
  const toggleGuideCheckbox = useToggleGuideCheckbox()
  const step = getProgressConfStep(profile, guideId, stepIndex)
  const openUrlInBrowser = useOpenUrlInBrowser()
  const guides = useSuspenseQuery(guidesQuery())
  const currentGuide = useGuide(guideId)
  const navigate = useNavigate()
  const downloadGuide = useDownloadGuideFromServer()
  const whiteList = useSuspenseQuery(whiteListQuery)

  let checkboxesCount = 0

  const options: HTMLReactParserOptions = {
    replace: (domNode) => {
      // #region positions
      if (domNode.type === 'text') {
        const href = domNode.data
        const isHrefHttp = href !== '' && href.startsWith('http')
        const url = isHrefHttp ? new URL(href) : undefined
        const isValid = url !== undefined ? whiteList.data.includes(`${url.protocol}//${url.hostname}`) : false

        if (isHrefHttp && !isValid) {
          return <Trans>lien masqué</Trans>
        }

        const posReg = /(.*?)\[\s*(-?\d+)\s*,\s*(-?\d+)\s*\]([(?:\w|\p{L}|\.|,|:|;)\s]*)/gu

        let elems: ReactNode[] = []

        for (const groups of domNode.data.matchAll(posReg)) {
          const [, prefix, posX, posY, suffix] = groups

          elems = [
            ...elems,
            <Fragment key={`${prefix ?? ''}-${posX ?? ''}-${posY ?? ''}`}>
              {prefix}
              {posX !== undefined && posY !== undefined && (
                <button
                  id={`copy-position-${posX}-${posY}`}
                  type="button"
                  className="inline-flex cursor-pointer text-yellow-400 hover:saturate-50 focus:saturate-[12.5%]"
                  onClick={async () => {
                    await copyPosition(Number.parseInt(posX, 10), Number.parseInt(posY, 10), conf.data.autoTravelCopy)
                  }}
                  title={conf.data.autoTravelCopy ? 'Copier la commande autopilote' : 'Copier la position'}
                >
                  [{posX},{posY}]
                </button>
              )}
              {suffix}
            </Fragment>,
          ]
        }

        if (elems.length === 0) {
          return
        }

        return <>{elems}</>
      }
      // #endregion

      if (domNode.type === 'tag') {
        const {
          attribs: { className: domClassName, ...attribs },
        } = domNode

        // #region empty p tags
        if (domNode.name === 'p' && domNode.children.length === 0) {
          const countEmptyP = (node: DOMNode | null): number => {
            if (!node) return 0

            if (node.type === 'tag' && node.name === 'p' && node.children.length === 0) {
              return 1 + countEmptyP(node.next as DOMNode | null)
            }

            return 0
          }

          const countNextEmptyP = countEmptyP(domNode)

          // disallow multiple empty p tags
          if (countNextEmptyP > 1) {
            return <></>
          }

          return <br />
        }
        // #endregion

        // #region guide step go to
        if (domNode.attribs['data-type'] === 'guide-step') {
          const stepId = Number.parseInt(domNode.attribs['stepid'] ?? null)
          let stepNumber = Number.parseInt(domNode.attribs['stepnumber'] ?? 0)
          const domGuideId =
            domNode.attribs['guideid'] !== undefined ? Number.parseInt(domNode.attribs['guideid']) : undefined
          const hasGoToGuideIcon = domNode.children.some(
            (child) =>
              child.type === 'tag' &&
              child.name === 'img' &&
              child.attribs.src.includes('images/texteditor/guides.png'),
          )

          if (!Number.isNaN(domGuideId) || !Number.isNaN(stepNumber)) {
            const guideInSystem = getGuideById(guides.data, domGuideId ?? guideId)

            stepNumber = clamp(stepNumber, 1, guideInSystem?.steps.length ?? stepNumber)
            const nextGuide = guideId !== domGuideId ? guideInSystem : undefined

            // go to the user progress step if the guide has been downloaded and the stepId is 0.
            // stepId === 0 means that the user has to go to currentStep of the progress
            if (guideInSystem && !Number.isNaN(stepId) && stepId === 0) {
              const userProgress = getProgress(profile, guideInSystem.id)

              if (userProgress) {
                stepNumber = clamp(userProgress.currentStep + 1, 1, guideInSystem.steps.length)
              }
            }

            return (
              <div id="to-guide" className="contents hover:saturate-200 focus:saturate-[25%]">
                {/* same guide */}
                {guideId === domGuideId || domGuideId === 0 ? (
                  <Link
                    {...attribs}
                    to="/guides/$id"
                    params={{ id: domGuideId === 0 ? guideId : domGuideId }}
                    search={{ step: stepNumber - 1 }}
                    draggable={false}
                    className={cn('contents select-none data-[type=guide-step]:no-underline', domNode.attribs.class)}
                  >
                    {!hasGoToGuideIcon && (
                      <img alt="" src={goToStepIcon} className="size-5 select-none" data-icon draggable={false} />
                    )}
                    <span className="hover:saturate-200 focus:saturate-[25%] group-focus-within:saturate-[25%] peer-hover:saturate-200">
                      {domToReact(domNode.children as DOMNode[], options)}
                    </span>
                  </Link>
                ) : (
                  // different guide
                  <button
                    {...attribs}
                    id={`different-guide-${domGuideId}-step-${stepNumber}`}
                    className={cn(
                      'contents! group cursor-pointer select-none data-[type=guide-step]:no-underline',
                      downloadGuide.isError && 'text-destructive!',
                      domNode.attribs.class,
                    )}
                    disabled={downloadGuide.isPending}
                    onClick={async () => {
                      if (domGuideId === undefined) {
                        // this should never happen
                        return
                      }

                      if (!nextGuide) {
                        await downloadGuide.mutateAsync({ guide: { id: domGuideId }, folder: '' })
                      }

                      await navigate({
                        to: '/guides/$id',
                        params: { id: domGuideId },
                        search: {
                          step: stepNumber - 1,
                        },
                      })
                    }}
                  >
                    {downloadGuide.isError && (
                      <AlertCircleIcon className="-translate-y-0.5 inline-flex size-5 text-destructive" />
                    )}
                    {!hasGoToGuideIcon && (
                      <img
                        alt=""
                        src={goToStepIcon}
                        className="peer inline-flex size-5 select-none group-focus-within:saturate-[25%] group-hover:saturate-200"
                        data-icon
                        draggable={false}
                      />
                    )}
                    <span className="hover:saturate-200 focus:saturate-[25%] group-focus-within:saturate-[25%] peer-hover:saturate-200">
                      {domToReact(domNode.children as DOMNode[], options)}
                    </span>
                  </button>
                )}
              </div>
            )
          }
        }
        // #endregion

        // #region custom tags monster and quest
        if (
          domNode.attribs['data-type'] === 'custom-tag' &&
          (domNode.attribs.type === 'monster' ||
            domNode.attribs.type === 'quest' ||
            domNode.attribs.type === 'item' ||
            domNode.attribs.type === 'dungeon')
        ) {
          const name = domNode.attribs.name ?? ''
          const { class: nodeClassName, ...restAttribs } = domNode.attribs
          const isMacOs = navigator.userAgent.toLowerCase().includes('mac os x')

          return (
            <div {...restAttribs} className={cn('contents!', nodeClassName)}>
              <button
                type="button"
                className="group contents cursor-pointer"
                onClick={async (evt) => {
                  // open in browser if ctrl/cmd is pressed
                  if (isMacOs ? evt.metaKey : evt.ctrlKey) {
                    openUrlInBrowser.mutate(
                      `https://dofusdb.fr/${currentGuide.lang}/database/${domNode.attribs.type === 'item' ? 'object' : domNode.attribs.type}/${domNode.attribs.dofusdbid}`,
                    )
                  } else {
                    await writeText(name)
                  }
                }}
                title={(() => {
                  switch (domNode.attribs.type) {
                    case 'dungeon':
                      return isMacOs
                        ? t`Cliquez pour copier le nom du donjon. Cmd+clic pour ouvrir sur dofusdb`
                        : t`Cliquez pour copier le nom du donjon. Ctrl+clic pour ouvrir sur dofusdb`
                    case 'item':
                      return isMacOs
                        ? t`Cliquez pour copier le nom de l'objet. Cmd+clic pour ouvrir sur dofusdb`
                        : t`Cliquez pour copier le nom de l'objet. Ctrl+clic pour ouvrir sur dofusdb`
                    case 'monster':
                      return isMacOs
                        ? t`Cliquez pour copier le nom du monstre. Cmd+clic pour ouvrir sur dofusdb`
                        : t`Cliquez pour copier le nom du monstre. Ctrl+clic pour ouvrir sur dofusdb`
                    case 'quest':
                      return isMacOs
                        ? t`Cliquez pour copier le nom de la quête. Cmd+clic pour ouvrir sur dofusdb`
                        : t`Cliquez pour copier le nom de la quête. Ctrl+clic pour ouvrir sur dofusdb`
                  }
                })()}
              >
                <span className="peer group-focus-within:saturate-[25%] group-hover:saturate-150">
                  {domToReact([domNode.children[0]] as DOMNode[], options)}
                </span>
                <span className="hover:saturate-150 focus:saturate-[25%] group-focus-within:saturate-[25%] group-hover:saturate-150">
                  {name}
                </span>
              </button>
            </div>
          )
        }
        // #endregion

        // #region quest-block
        if (domNode.attribs['data-type'] === 'quest-block') {
          const questName: string = domNode.attribs['questname']
          const status = domNode.attribs['status'] as 'in_progress' | 'start' | 'end'

          return (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className={cn('rounded-md p-2 transition-colors', domNode.attribs.class)}
                    data-status={status}
                    data-quest={questName}
                  >
                    {domToReact(domNode.children as DOMNode[], options)}
                  </div>
                </TooltipTrigger>
                <TooltipContent className="flex max-w-[calc(100vw-3rem)] items-center gap-1">
                  {status === 'start' && <BookPlusIcon className="size-4 min-h-4 min-w-4" />}
                  {status === 'end' && <BookCheckIcon className="size-4 min-h-4 min-w-4 text-green-400" />}
                  <img src="https://ganymede-dofus.com/images/icon_quest.png" className="size-6" />
                  <span className="text-balance text-base">{questName}</span>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )
        }
        // #endregion

        // #region img
        if (domNode.name === 'img') {
          const {
            attribs: { className: domClassName, ...attribs },
          } = domNode

          const imgSrc = attribs.src ?? ''
          const isIcon =
            !domClassName?.includes('img-large') &&
            !domClassName?.includes('img-medium') &&
            !domClassName?.includes('img-small')
          const clickable = !isIcon && imgSrc !== '' && imgSrc.startsWith('http')

          return (
            <DownloadImage
              {...attribs}
              onClick={() => {
                if (clickable) {
                  openUrlInBrowser.mutate(imgSrc)
                }
              }}
              draggable={false}
              title={clickable ? t`Cliquez pour ouvrir dans le navigateur` : undefined}
              role="button"
              className={cn(
                'inline-flex select-none',
                isIcon && '-translate-y-0.5 text-[0.8em]',
                !isIcon && 'cursor-pointer! pb-2',
                domClassName,
              )}
            />
          )
        }
        // #endregion

        // #region a
        if (domNode.name === 'a') {
          const href = domNode.attribs.href ?? ''
          const isHrefHttp = href !== '' && href.startsWith('http')
          const url = isHrefHttp ? new URL(href) : undefined
          const isValid = url !== undefined ? whiteList.data.includes(`${url.protocol}//${url.hostname}`) : false

          if (isHrefHttp && !isValid) {
            return <>{domToReact(domNode.children as DOMNode[], options)}</>
          }

          return (
            <button
              data-href={href}
              id={`open-link-${href.slice(0, 10)}`}
              type="button"
              className="inline-flex cursor-pointer text-yellow-300 underline [&_a]:underline"
              onClick={() => {
                if (isHrefHttp) {
                  openUrlInBrowser.mutate(href)
                }
              }}
              title={isHrefHttp ? t`Cliquez pour ouvrir dans le navigateur` : undefined}
            >
              {domToReact(domNode.children as DOMNode[], options)}
            </button>
          )
        }
        // #endregion

        // #region <p> inside taskItem
        if (
          domNode.name === 'p' &&
          domNode.parent?.type === 'tag' &&
          domNode.parent.name === 'div' &&
          domNode.parent.parent?.type === 'tag' &&
          domNode.parent.parent.name === 'li' &&
          domNode.parent.parent.attribs['data-type'] === 'taskItem'
        ) {
          return <p className="contents">{domToReact(domNode.children as DOMNode[], options)}</p>
        }
        // #endregion

        // #region checkbox
        if (domNode.name === 'input' && domNode.attribs.type === 'checkbox') {
          const {
            attribs: { className: domClassName, ...attribs },
          } = domNode
          const index = checkboxesCount++

          return (
            <input
              {...attribs}
              onChange={() => {
                toggleGuideCheckbox.mutate({
                  guideId,
                  checkboxIndex: index,
                  stepIndex,
                })
              }}
              checked={step.checkboxes.includes(index)}
              className={domClassName}
            />
          )
        }
        // #endregion
      }
    },
  }

  return <div className={className}>{parse(html, options)}</div>
}

import { cn } from '@/lib/utils.ts'
import { ComponentPropsWithRef } from 'react'

export function PageScrollableContent({
  children,
  hasTitleBar = false,
  hasBottomBar = false,
  className,
  ref,
  ...props
}: ComponentPropsWithRef<'div'> & {
  hasTitleBar?: boolean
  hasBottomBar?: boolean
}) {
  return (
    <div
      ref={ref}
      className={cn(
        'scroller flex flex-col overflow-x-hidden overflow-y-scroll pb-2',
        hasTitleBar && !hasBottomBar && 'mt-[36px] h-[calc(100vh-30px-36px-36px)] sm:h-[calc(100vh-30px-36px-40px)]',
        !hasTitleBar && 'h-[calc(100vh-30px-36px)]',
        hasBottomBar &&
          !hasTitleBar &&
          'mb-[38px] h-[calc(100vh-30px-30px-38px)] sm:mb-[52px] sm:h-[calc(100vh-30px-36px-52px)]',
        hasBottomBar &&
          hasTitleBar &&
          'mt-[36px] mb-[38px] h-[calc(100vh-30px-30px-36px-38px)] sm:mb-[52px] sm:h-[calc(100vh-30px-36px-40px-52px)]',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

import { PageContent } from '@/components/page-content.tsx'
import { PageTitle, PageTitleText } from '@/components/page-title.tsx'
import { cn } from '@/lib/utils.ts'
import { type PropsWithChildren, type ReactNode } from 'react'

export function Page({
  title,
  children,
  className,
  actions,
  pageTitleTextClassName,
  backButton,
}: PropsWithChildren<{
  title: string
  actions?: ReactNode
  className?: string
  pageTitleTextClassName?: string
  backButton?: ReactNode
}>) {
  return (
    <PageContent className={cn(className)}>
      <PageTitle>
        <div className="flex w-full items-center gap-2">
          {backButton}
          <PageTitleText className={pageTitleTextClassName} title={title}>
            {title}
          </PageTitleText>
          {actions}
        </div>
      </PageTitle>
      {children}
    </PageContent>
  )
}

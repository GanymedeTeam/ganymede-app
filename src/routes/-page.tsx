import { type PropsWithChildren, type ReactNode } from 'react'
import { PageContent } from '@/components/page_content.tsx'
import { PageTitle, PageTitleText } from '@/components/page_title.tsx'
import { cn } from '@/lib/utils.ts'

export function Page({
  title,
  children,
  className,
  actions,
  backButton,
}: PropsWithChildren<{
  title: string
  actions?: ReactNode
  className?: string
  backButton?: ReactNode
}>) {
  return (
    <PageContent className={cn(className)}>
      <PageTitle>
        <div className="flex w-full items-center gap-2" data-slot="page-title-content">
          {backButton}
          <PageTitleText title={title}>{title}</PageTitleText>
          {actions}
        </div>
      </PageTitle>
      {children}
    </PageContent>
  )
}

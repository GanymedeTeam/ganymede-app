import { ChevronLeftIcon, ChevronRightIcon, EllipsisIcon } from 'lucide-react'
import * as React from 'react'

import { ButtonProps, buttonVariants } from '@/components/ui/button.tsx'
import { cn } from '@/lib/utils.ts'
import { Link, LinkProps, useLinkProps } from '@tanstack/react-router'

const Pagination = ({ className, ...props }: React.ComponentProps<'nav'>) => (
  <nav
    role="navigation"
    aria-label="pagination"
    className={cn('mx-auto flex w-full justify-center', className)}
    {...props}
  />
)

function PaginationContent({ className, ref, ...props }: React.ComponentPropsWithRef<'ul'>) {
  return <ul ref={ref} className={cn('flex flex-row items-center gap-1', className)} {...props} />
}

function PaginationItem({ className, ref, ...props }: React.ComponentPropsWithRef<'li'>) {
  return <li ref={ref} className={cn('', className)} {...props} />
}

type PaginationLinkProps = Pick<ButtonProps, 'size'> &
  LinkProps & {
    className?: string
  }

function PaginationLink({ className, from, to, search, size = 'icon', children, ...props }: PaginationLinkProps) {
  const { 'aria-current': ariaCurrent } = useLinkProps({ from, to, search, ...props })

  return (
    <Link
      className={cn(
        buttonVariants({
          variant: ariaCurrent === 'page' ? 'secondary' : 'ghost',
          size,
        }),
        className,
      )}
      aria-current={ariaCurrent}
      to={to}
      search={search}
      draggable={false}
      {...props}
    >
      {children}
    </Link>
  )
}

function PaginationPrevious({ className, ...props }: React.ComponentProps<typeof PaginationLink>) {
  return (
    <PaginationLink
      aria-label="Go to previous page"
      size="default"
      className={cn('gap-1 pl-2.5', className)}
      {...props}
    >
      <ChevronLeftIcon />
      <span>Previous</span>
    </PaginationLink>
  )
}

function PaginationNext({ className, ...props }: React.ComponentProps<typeof PaginationLink>) {
  return (
    <PaginationLink aria-label="Go to next page" size="default" className={cn('gap-1 pr-2.5', className)} {...props}>
      <span>Next</span>
      <ChevronRightIcon />
    </PaginationLink>
  )
}

function PaginationEllipsis({ className, ref, ...props }: React.ComponentPropsWithRef<'span'>) {
  return (
    <span aria-hidden className={cn('flex h-9 w-9 items-center justify-center', className)} ref={ref} {...props}>
      <EllipsisIcon />
      <span className="sr-only">More pages</span>
    </span>
  )
}

export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
}

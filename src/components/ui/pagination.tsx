import { Link, type LinkProps, useLinkProps } from '@tanstack/react-router'
import { ChevronLeftIcon, ChevronRightIcon, EllipsisIcon } from 'lucide-react'
import type * as React from 'react'
import { type ButtonProps, buttonVariants } from '@/components/ui/button.tsx'
import { cn } from '@/lib/utils.ts'

function Pagination({ className, ...props }: React.ComponentProps<'nav'>) {
  return (
    <nav
      aria-label="pagination"
      className={cn('mx-auto flex w-full justify-center', className)}
      role="navigation"
      {...props}
    />
  )
}

function PaginationContent({ className, ref, ...props }: React.ComponentPropsWithRef<'ul'>) {
  return <ul className={cn('flex flex-row items-center gap-1', className)} ref={ref} {...props} />
}

function PaginationItem({ className, ref, ...props }: React.ComponentPropsWithRef<'li'>) {
  return <li className={cn('', className)} ref={ref} {...props} />
}

type PaginationLinkProps = Pick<ButtonProps, 'size'> &
  LinkProps & {
    className?: string
  }

function PaginationLink({ className, from, to, search, size = 'icon', children, ...props }: PaginationLinkProps) {
  const { 'aria-current': ariaCurrent } = useLinkProps({ from, to, search, ...props })

  return (
    <Link
      aria-current={ariaCurrent}
      className={cn(
        buttonVariants({
          variant: ariaCurrent === 'page' ? 'secondary' : 'ghost',
          size,
        }),
        className,
      )}
      draggable={false}
      search={search}
      to={to}
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
      className={cn('gap-1 pl-2.5', className)}
      size="default"
      {...props}
    >
      <ChevronLeftIcon />
      <span>Previous</span>
    </PaginationLink>
  )
}

function PaginationNext({ className, ...props }: React.ComponentProps<typeof PaginationLink>) {
  return (
    <PaginationLink aria-label="Go to next page" className={cn('gap-1 pr-2.5', className)} size="default" {...props}>
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

import Image from 'next/image'

import { SITE } from '@/lib/site-config'
import { cn } from '@/lib/utils'

type BrandLogoProps = {
  className?: string
  iconClassName?: string
  nameClassName?: string
  showName?: boolean
  priority?: boolean
}

export default function BrandLogo({
  className,
  iconClassName,
  nameClassName,
  showName = true,
  priority = false,
}: BrandLogoProps) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <Image
        src="/brand/site-logo.svg"
        alt={`${SITE.name} logo`}
        width={48}
        height={48}
        priority={priority}
        unoptimized
        className={cn('h-10 w-10 shrink-0 object-contain', iconClassName)}
      />
      {showName ? (
        <span
          className={cn(
            'text-xl font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 bg-clip-text text-transparent',
            nameClassName
          )}
        >
          {SITE.name}
        </span>
      ) : null}
    </span>
  )
}

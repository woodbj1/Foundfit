import Image from 'next/image'

import { cn } from '@/lib/utils'

type BrandLogoProps = {
  className?: string
  imageClassName?: string
  priority?: boolean
}

export default function BrandLogo({
  className,
  imageClassName,
  priority = false,
}: BrandLogoProps) {
  return (
    <span className={cn('inline-flex items-center', className)}>
      <Image
        src="/api/public/branding/logo"
        alt="Foundation Fitness logo"
        width={1024}
        height={860}
        priority={priority}
        unoptimized
        className={cn('h-16 w-auto shrink-0 object-contain', imageClassName)}
      />
    </span>
  )
}

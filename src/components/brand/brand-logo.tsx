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
        src="/brand/site-logo-main.png"
        alt="Foundation Fitness logo"
        width={1024}
        height={191}
        priority={priority}
        className={cn('h-10 w-auto shrink-0 object-contain', imageClassName)}
      />
    </span>
  )
}

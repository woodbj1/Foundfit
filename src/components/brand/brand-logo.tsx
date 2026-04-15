import Image from 'next/image'

import { cn } from '@/lib/utils'

type BrandLogoVariant = 'header' | 'site'

type BrandLogoProps = {
  className?: string
  imageClassName?: string
  priority?: boolean
  variant?: BrandLogoVariant
}

export default function BrandLogo({
  className,
  imageClassName,
  priority = false,
  variant = 'site',
}: BrandLogoProps) {
  const isHeader = variant === 'header'

  return (
    <span className={cn('inline-flex items-center', className)}>
      <Image
        src={`/api/public/branding/logo?variant=${variant}`}
        alt="FoundFit logo"
        width={1024}
        height={isHeader ? 138 : 860}
        priority={priority}
        unoptimized
        className={cn(
          isHeader ? 'h-12 w-auto shrink-0 object-contain' : 'h-16 w-auto shrink-0 object-contain',
          imageClassName
        )}
      />
    </span>
  )
}

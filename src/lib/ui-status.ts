import type { AlertVariants } from '@/components/ui/alert'
import type { BadgeVariants } from '@/components/ui/badge'

type BadgeTone = 'success' | 'warn' | 'danger' | 'secondary' | 'contrast'
type AlertTone = 'success' | 'warn' | 'error' | 'secondary' | 'info'

export function resolveBadgeVariant(tone: BadgeTone): BadgeVariants['variant'] {
  if (tone === 'danger') {
    return 'destructive'
  }

  if (tone === 'contrast') {
    return 'outline'
  }

  if (tone === 'secondary' || tone === 'warn') {
    return 'secondary'
  }

  return 'default'
}

export function resolveBadgeToneClass(tone: BadgeTone): string {
  if (tone === 'success') {
    return 'border-[#14532d] bg-[#06271a] text-[#a7f3d0]'
  }

  if (tone === 'warn') {
    return 'border-[#7c2d12] bg-[#2d160d] text-[#fdba74]'
  }

  if (tone === 'danger') {
    return 'border-[#7f1d1d] bg-[#2f1116] text-[#fecaca]'
  }

  if (tone === 'contrast') {
    return 'border-[rgba(148,163,184,0.18)] bg-transparent text-[#cbd5e1]'
  }

  return 'border-[rgba(148,163,184,0.14)] bg-[#111827] text-[#94a3b8]'
}

export function resolveAlertVariant(tone: AlertTone): AlertVariants['variant'] {
  if (tone === 'error') {
    return 'destructive'
  }

  return 'default'
}

export function resolveAlertToneClass(tone: AlertTone): string {
  if (tone === 'success') {
    return 'border-[#14532d] bg-[#06271a] text-[#a7f3d0]'
  }

  if (tone === 'warn') {
    return 'border-[#7c2d12] bg-[#2d160d] text-[#fdba74]'
  }

  if (tone === 'error') {
    return 'border-[#7f1d1d] bg-[#2f1116] text-[#fecaca]'
  }

  if (tone === 'secondary') {
    return 'border-[rgba(148,163,184,0.14)] bg-[#111827] text-[#94a3b8]'
  }

  return 'border-[#1d4ed8] bg-[#0f1f3a] text-[#bfdbfe]'
}

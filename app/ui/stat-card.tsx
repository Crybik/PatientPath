'use client'

import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'

export function StatCard({
  label,
  value,
  icon,
  color = 'text-accent',
}: {
  label: string
  value: number | string
  icon?: React.ReactNode
  color?: string
}) {
  const valueRef = useRef<HTMLParagraphElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (valueRef.current && typeof value === 'number') {
      gsap.fromTo(
        valueRef.current,
        { textContent: '0' },
        {
          textContent: value,
          duration: 1.2,
          ease: 'power2.out',
          snap: { textContent: 1 },
        },
      )
    }
  }, [value])

  useEffect(() => {
    if (cardRef.current) {
      gsap.fromTo(cardRef.current, { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'power2.out' })
    }
  }, [])

  return (
    <div ref={cardRef} className="group relative rounded-xl border border-border bg-surface p-4 shadow-sm transition-all hover:border-accent/30 hover:shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted">{label}</p>
          <p ref={valueRef} className={`mt-1.5 text-2xl font-bold ${color}`}>
            {value}
          </p>
        </div>
        {icon && (
          <div className="rounded-lg bg-surface-elevated p-2 text-muted group-hover:text-accent group-hover:bg-accent/5 transition-all">
            {icon}
          </div>
        )}
      </div>
      <div className="absolute inset-x-4 bottom-0 h-0.5 rounded-full bg-gradient-to-r from-accent/0 via-accent/20 to-accent/0 opacity-0 transition-opacity group-hover:opacity-100" />
    </div>
  )
}

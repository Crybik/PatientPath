'use client'

import { motion } from 'framer-motion'

export const FadeIn = motion.div
export const FadeInUp = ({
  children,
  delay = 0,
  className = '',
}: {
  children: React.ReactNode
  delay?: number
  className?: string
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
    className={className}
  >
    {children}
  </motion.div>
)

export const ScaleIn = ({
  children,
  delay = 0,
  className = '',
}: {
  children: React.ReactNode
  delay?: number
  className?: string
}) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.4, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
    className={className}
  >
    {children}
  </motion.div>
)

export const SlideIn = ({
  children,
  direction = 'left',
  delay = 0,
  className = '',
}: {
  children: React.ReactNode
  direction?: 'left' | 'right'
  delay?: number
  className?: string
}) => (
  <motion.div
    initial={{ opacity: 0, x: direction === 'left' ? -30 : 30 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ duration: 0.5, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
    className={className}
  >
    {children}
  </motion.div>
)

export const StaggerContainer = ({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) => (
  <motion.div
    initial="hidden"
    animate="visible"
    variants={{
      hidden: {},
      visible: { transition: { staggerChildren: 0.08 } },
    }}
    className={className}
  >
    {children}
  </motion.div>
)

export const StaggerItem = ({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) => (
  <motion.div
    variants={{
      hidden: { opacity: 0, y: 16 },
      visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } },
    }}
    className={className}
  >
    {children}
  </motion.div>
)

export { motion, type Variants } from 'framer-motion'
export { AnimatePresence } from 'framer-motion'

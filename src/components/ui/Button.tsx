import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'

type ButtonVariant = 'primary' | 'outline' | 'ghost' | 'danger'

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-accent-ink',
  outline: 'border border-line bg-surface text-ink',
  ghost: 'text-accent',
  danger: 'bg-signal text-on-signal',
}

const baseClasses =
  'inline-flex h-[52px] items-center justify-center gap-2 rounded-[var(--radius-pill)] px-6 text-[16px] font-medium transition-transform duration-150 active:scale-[0.98] disabled:opacity-50'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  to?: string
  children: ReactNode
}

export function Button({ variant = 'primary', to, children, className, ...props }: ButtonProps) {
  const classes = [baseClasses, variantClasses[variant], className].filter(Boolean).join(' ')

  if (to) {
    return (
      <Link to={to} className={classes}>
        {children}
      </Link>
    )
  }

  return (
    <button type="button" className={classes} {...props}>
      {children}
    </button>
  )
}

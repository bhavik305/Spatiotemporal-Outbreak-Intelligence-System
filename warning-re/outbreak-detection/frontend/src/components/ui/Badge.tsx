import { clsx } from 'clsx';
import type { HTMLAttributes, ForwardRefExoticComponent, RefAttributes } from 'react';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'neutral';
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
}

export const Badge = Object.assign(
  function Badge({
    variant = 'default',
    size = 'md',
    dot = false,
    className,
    children,
    ...props
  }: BadgeProps) {
    const variantStyles = {
      default: 'bg-primary-100 text-primary-700 border border-primary-200',
      success: 'bg-success-100 text-success-700 border border-success-200',
      warning: 'bg-warning-100 text-warning-700 border border-warning-200',
      error: 'bg-error-100 text-error-700 border border-error-200',
      info: 'bg-info-100 text-info-700 border border-info-200',
      neutral: 'bg-neutral-100 text-neutral-700 border border-neutral-200',
    };

    const sizeStyles = {
      sm: 'px-2 py-0.5 text-xs',
      md: 'px-2.5 py-1 text-sm',
      lg: 'px-3 py-1.5 text-base',
    };

    const dotStyles = {
      default: 'bg-primary-500',
      success: 'bg-success-500',
      warning: 'bg-warning-500',
      error: 'bg-error-500',
      info: 'bg-info-500',
      neutral: 'bg-neutral-500',
    };

    return (
      <span
        className={clsx(
          'inline-flex items-center gap-1.5 font-medium rounded-full border',
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {dot && <span className={clsx('w-1.5 h-1.5 rounded-full', dotStyles[variant])} aria-hidden="true" />}
        {children}
      </span>
    )
  },
  { displayName: 'Badge' }
) as ForwardRefExoticComponent<BadgeProps & RefAttributes<HTMLSpanElement>>;
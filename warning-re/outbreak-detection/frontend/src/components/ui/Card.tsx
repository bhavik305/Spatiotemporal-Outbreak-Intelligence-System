import { clsx } from 'clsx';
import type { HTMLAttributes, ForwardRefExoticComponent, RefAttributes } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'outlined' | 'elevated';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hoverable?: boolean;
}

export const Card = Object.assign(
  function Card({
    variant = 'default',
    padding = 'md',
    hoverable = false,
    className,
    children,
    ...props
  }: CardProps) {
    const variantStyles = {
      default: 'bg-white border border-neutral-200',
      outlined: 'bg-white border-2 border-neutral-200',
      elevated: 'bg-white border border-neutral-200 shadow-lg',
    };

    const paddingStyles = {
      none: '',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
    };

    const hoverStyles = hoverable ? 'transition-shadow hover:shadow-xl cursor-pointer' : '';

    return (
      <div
        className={clsx(
          'rounded-xl',
          variantStyles[variant],
          paddingStyles[padding],
          hoverStyles,
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  },
  {
    displayName: 'Card',
  }
) as ForwardRefExoticComponent<CardProps & RefAttributes<HTMLDivElement>>;

export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {}

export const CardHeader = Object.assign(
  function CardHeader({ className, children, ...props }: CardHeaderProps) {
    return (
      <div className={clsx('mb-4', className)} {...props}>
        {children}
      </div>
    )
  },
  { displayName: 'CardHeader' }
) as ForwardRefExoticComponent<CardHeaderProps & RefAttributes<HTMLDivElement>>;

export interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {}

export const CardTitle = Object.assign(
  function CardTitle({ className, children, ...props }: CardTitleProps) {
    return (
      <h3 className={clsx('text-lg font-semibold text-neutral-900', className)} {...props}>
        {children}
      </h3>
    )
  },
  { displayName: 'CardTitle' }
) as ForwardRefExoticComponent<CardTitleProps & RefAttributes<HTMLHeadingElement>>;

export interface CardDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {}

export const CardDescription = Object.assign(
  function CardDescription({ className, children, ...props }: CardDescriptionProps) {
    return (
      <p className={clsx('mt-1 text-sm text-neutral-500', className)} {...props}>
        {children}
      </p>
    )
  },
  { displayName: 'CardDescription' }
) as ForwardRefExoticComponent<CardDescriptionProps & RefAttributes<HTMLParagraphElement>>;

export interface CardContentProps extends HTMLAttributes<HTMLDivElement> {}

export const CardContent = Object.assign(
  function CardContent({ className, children, ...props }: CardContentProps) {
    return (
      <div className={clsx('', className)} {...props}>
        {children}
      </div>
    )
  },
  { displayName: 'CardContent' }
) as ForwardRefExoticComponent<CardContentProps & RefAttributes<HTMLDivElement>>;

export interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {}

export const CardFooter = Object.assign(
  function CardFooter({ className, children, ...props }: CardFooterProps) {
    return (
      <div className={clsx('mt-4 pt-4 border-t border-neutral-100 flex items-center gap-3', className)} {...props}>
        {children}
      </div>
    )
  },
  { displayName: 'CardFooter' }
) as ForwardRefExoticComponent<CardFooterProps & RefAttributes<HTMLDivElement>>;
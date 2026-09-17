import { clsx } from 'clsx';
import type { HTMLAttributes, ForwardRefExoticComponent, RefAttributes } from 'react';

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
}

export const Skeleton = Object.assign(
  function Skeleton({
    variant = 'text',
    width,
    height,
    animation = 'pulse',
    className,
    ...props
  }: SkeletonProps) {
    const variantStyles = {
      text: 'h-4 rounded',
      circular: 'rounded-full',
      rectangular: 'rounded-lg',
    };

    const animationStyles = {
      pulse: 'animate-pulse',
      wave: 'animate-wave',
      none: '',
    };

    const sizeStyles = {
      width: width ? `w-[${width}]` : variant === 'text' ? 'w-full' : variant === 'circular' ? 'w-10' : '',
      height: height ? `h-[${height}]` : variant === 'text' ? '' : variant === 'circular' ? 'h-10' : '',
    };

    return (
      <div
        className={clsx(
          'bg-neutral-200',
          variantStyles[variant],
          animationStyles[animation],
          sizeStyles.width,
          sizeStyles.height,
          className
        )}
        aria-hidden="true"
        {...props}
      />
    )
  },
  { displayName: 'Skeleton' }
) as ForwardRefExoticComponent<SkeletonProps & RefAttributes<HTMLDivElement>>;

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={clsx('space-y-3', className)}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} variant="text" width={i === lines - 1 ? '60%' : '100%'} />
      ))}
    </div>
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={clsx('space-y-4 p-6', className)}>
      <Skeleton variant="rectangular" height="24" width="40%" />
      <SkeletonText lines={3} />
      <Skeleton variant="rectangular" height="100" width="100%" />
    </div>
  );
}

export function SkeletonKpiCard({ className }: { className?: string }) {
  return (
    <div className={clsx('p-6', className)}>
      <Skeleton variant="text" height="14" width="60%" />
      <Skeleton variant="text" height="32" width="50%" className="mt-2" />
      <Skeleton variant="text" height="14" width="40%" className="mt-2" />
    </div>
  );
}
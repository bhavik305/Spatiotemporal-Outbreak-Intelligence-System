import { clsx } from 'clsx';
import type { HTMLAttributes, ForwardRefExoticComponent, RefAttributes, ReactNode } from 'react';
import { Button } from './Button';

export interface EmptyStateProps extends HTMLAttributes<HTMLDivElement> {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'outline';
  };
}

export const EmptyState = Object.assign(
  function EmptyState({
    icon,
    title,
    description,
    action,
    className,
    ...props
  }: EmptyStateProps) {
    return (
      <div
        className={clsx('flex flex-col items-center justify-center text-center py-12 px-4', className)}
        {...props}
      >
        <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-400 mb-4" aria-hidden="true">
          {icon || (
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
          )}
        </div>
        <h3 className="text-lg font-semibold text-neutral-900 mb-1">{title}</h3>
        {description && (
          <p className="text-neutral-500 max-w-sm mb-6">{description}</p>
        )}
        {action && (
          <Button variant={action.variant || 'primary'} onClick={action.onClick}>
            {action.label}
          </Button>
        )}
      </div>
    )
  },
  { displayName: 'EmptyState' }
) as ForwardRefExoticComponent<EmptyStateProps & RefAttributes<HTMLDivElement>>;

export interface ErrorStateProps extends HTMLAttributes<HTMLDivElement> {
  icon?: ReactNode;
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export const ErrorState = Object.assign(
  function ErrorState({
    icon,
    title = 'Something went wrong',
    message = 'Unable to load data. Please try again.',
    onRetry,
    retryLabel = 'Try again',
    className,
    ...props
  }: ErrorStateProps) {
    return (
      <div
        className={clsx('flex flex-col items-center justify-center text-center py-12 px-4', className)}
        {...props}
      >
        <div className="w-16 h-16 rounded-full bg-error-50 flex items-center justify-center text-error-500 mb-4" aria-hidden="true">
          {icon || (
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
          )}
        </div>
        <h3 className="text-lg font-semibold text-neutral-900 mb-1">{title}</h3>
        <p className="text-neutral-500 max-w-sm mb-6">{message}</p>
        {onRetry && (
          <Button variant="primary" onClick={onRetry}>
            {retryLabel}
          </Button>
        )}
      </div>
    )
  },
  { displayName: 'ErrorState' }
) as ForwardRefExoticComponent<ErrorStateProps & RefAttributes<HTMLDivElement>>;

export interface LoadingStateProps extends HTMLAttributes<HTMLDivElement> {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const LoadingState = Object.assign(
  function LoadingState({
    message = 'Loading...',
    size = 'md',
    className,
    ...props
  }: LoadingStateProps) {
    const sizeStyles = {
      sm: 'w-6 h-6',
      md: 'w-8 h-8',
      lg: 'w-12 h-12',
    };

    return (
      <div
        className={clsx('flex flex-col items-center justify-center py-12 px-4 gap-3', className)}
        {...props}
      >
        <svg
          className={clsx('animate-spin text-primary-600', sizeStyles[size])}
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="text-neutral-500 text-sm">{message}</p>
      </div>
    )
  },
  { displayName: 'LoadingState' }
) as ForwardRefExoticComponent<LoadingStateProps & RefAttributes<HTMLDivElement>>;
import { clsx } from 'clsx';
import type { ButtonHTMLAttributes, ReactNode, ForwardRefExoticComponent, RefAttributes } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

export const Button = Object.assign(
  function Button({
    variant = 'primary',
    size = 'md',
    loading = false,
    leftIcon,
    rightIcon,
    fullWidth = false,
    disabled,
    className,
    children,
    ...props
  }: ButtonProps) {
    const baseStyles =
      'inline-flex items-center justify-center font-medium rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

    const variantStyles = {
      primary:
        'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800 shadow-sm hover:shadow focus-visible:ring-primary-500',
      secondary:
        'bg-neutral-100 text-neutral-800 hover:bg-neutral-200 active:bg-neutral-300 border border-neutral-200 focus-visible:ring-neutral-500',
      outline:
        'border-2 border-primary-600 text-primary-600 hover:bg-primary-50 active:bg-primary-100 focus-visible:ring-primary-500',
      ghost:
        'text-primary-600 hover:bg-primary-50 active:bg-primary-100 focus-visible:ring-primary-500',
      danger:
        'bg-error-600 text-white hover:bg-error-700 active:bg-error-800 shadow-sm hover:shadow focus-visible:ring-error-500',
      success:
        'bg-success-600 text-white hover:bg-success-700 active:bg-success-800 shadow-sm hover:shadow focus-visible:ring-success-500',
    };

    const sizeStyles = {
      sm: 'px-3 py-1.5 text-sm gap-1.5',
      md: 'px-4 py-2 text-base gap-2',
      lg: 'px-6 py-3 text-lg gap-2',
    };

    const widthStyles = fullWidth ? 'w-full' : '';

    return (
      <button
        className={clsx(
          baseStyles,
          variantStyles[variant],
          sizeStyles[size],
          widthStyles,
          'rounded-lg',
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <>
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span>Loading...</span>
          </>
        ) : (
          <>
            {leftIcon && <span aria-hidden="true">{leftIcon}</span>}
            {children}
            {rightIcon && <span aria-hidden="true">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  },
  {
    displayName: 'Button',
  }
) as ForwardRefExoticComponent<ButtonProps & RefAttributes<HTMLButtonElement>>;

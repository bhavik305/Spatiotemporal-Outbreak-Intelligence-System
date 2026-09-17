import { clsx } from 'clsx';
import type { InputHTMLAttributes, ForwardRefExoticComponent, RefAttributes } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = Object.assign(
  function Input({
    label,
    error,
    helperText,
    leftIcon,
    rightIcon,
    className,
    id,
    disabled,
    required,
    ...props
  }: InputProps) {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-neutral-700 mb-1.5">
            {label}
            {required && <span className="text-error-500 ml-1" aria-hidden="true">*</span>}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" aria-hidden="true">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            disabled={disabled}
            required={required}
            className={clsx(
              'w-full rounded-lg border bg-white text-neutral-900 placeholder:text-neutral-400 transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
              'disabled:bg-neutral-50 disabled:cursor-not-allowed',
              leftIcon ? 'pl-10' : 'pl-4',
              rightIcon ? 'pr-10' : 'pr-4',
              'py-2.5',
              error ? 'border-error-500 focus:ring-error-500' : 'border-neutral-300 hover:border-neutral-400',
              className
            )}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" aria-hidden="true">
              {rightIcon}
            </div>
          )}
        </div>
        {error && (
          <p id={`${inputId}-error`} className="mt-1.5 text-sm text-error-600" role="alert">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={`${inputId}-helper`} className="mt-1.5 text-sm text-neutral-500">
            {helperText}
          </p>
        )}
      </div>
    )
  },
  { displayName: 'Input' }
) as ForwardRefExoticComponent<InputProps & RefAttributes<HTMLInputElement>>;

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea = Object.assign(
  function Textarea({
    label,
    error,
    helperText,
    className,
    id,
    disabled,
    required,
    ...props
  }: TextareaProps) {
    const textareaId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={textareaId} className="block text-sm font-medium text-neutral-700 mb-1.5">
            {label}
            {required && <span className="text-error-500 ml-1" aria-hidden="true">*</span>}
          </label>
        )}
        <textarea
          id={textareaId}
          disabled={disabled}
          required={required}
          className={clsx(
            'w-full rounded-lg border bg-white text-neutral-900 placeholder:text-neutral-400 transition-colors resize-y min-h-[80px]',
            'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
            'disabled:bg-neutral-50 disabled:cursor-not-allowed',
            'p-4',
            error ? 'border-error-500 focus:ring-error-500' : 'border-neutral-300 hover:border-neutral-400',
            className
          )}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${textareaId}-error` : helperText ? `${textareaId}-helper` : undefined}
          {...props}
        />
        {error && (
          <p id={`${textareaId}-error`} className="mt-1.5 text-sm text-error-600" role="alert">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={`${textareaId}-helper`} className="mt-1.5 text-sm text-neutral-500">
            {helperText}
          </p>
        )}
      </div>
    )
  },
  { displayName: 'Textarea' }
) as ForwardRefExoticComponent<TextareaProps & RefAttributes<HTMLTextAreaElement>>;
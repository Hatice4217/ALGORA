import React, { useId } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconClick?: () => void;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type = 'text',
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      onRightIconClick,
      id,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = id || `input-${generatedId}`;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 dark:text-slate-400">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            type={type}
            id={inputId}
            className={cn(
              'block w-full rounded-lg border bg-gray-50 dark:bg-slate-800',
              'px-4 py-3 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-400',
              'focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent focus:bg-white dark:focus:bg-slate-900',
              'disabled:bg-gray-100 dark:disabled:bg-slate-800 disabled:cursor-not-allowed',
              'transition-all duration-200',
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              error ? 'border-red-300 dark:border-red-500/50 focus:ring-red-500' : 'border-gray-300 dark:border-slate-700',
              className
            )}
            {...props}
          />
          {rightIcon && (
            <div
              className={cn(
                'absolute inset-y-0 right-0 pr-3 flex items-center',
                onRightIconClick ? 'cursor-pointer text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-300' : 'pointer-events-none text-gray-400 dark:text-slate-400'
              )}
              onClick={onRightIconClick}
            >
              {rightIcon}
            </div>
          )}
        </div>
        {error && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };

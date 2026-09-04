'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';

interface ToggleProps {
  id?: string;
  label?: string;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  helperText?: string;
}

export const Toggle = React.forwardRef<HTMLButtonElement, ToggleProps>(
  (
    {
      id,
      label,
      checked = false,
      onChange,
      disabled = false,
      helperText,
    },
    ref
  ) => {
    const [isChecked, setIsChecked] = useState(checked);

    const toggleId = id || `toggle-${Math.random().toString(36).substring(2, 9)}`;

    const handleChange = () => {
      if (disabled) return;

      const newValue = !isChecked;
      setIsChecked(newValue);
      onChange?.(newValue);
    };

    // Update internal state when checked prop changes
    React.useEffect(() => {
      setIsChecked(checked);
    }, [checked]);

    return (
      <div className="flex items-center gap-3">
        <button
          ref={ref}
          id={toggleId}
          type="button"
          role="switch"
          aria-checked={isChecked}
          aria-labelledby={label ? `${toggleId}-label` : undefined}
          disabled={disabled}
          onClick={handleChange}
          className={cn(
            'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2',
            isChecked ? 'bg-purple-600' : 'bg-gray-200',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
              isChecked ? 'translate-x-5' : 'translate-x-0'
            )}
          />
        </button>

        {label && (
          <div className="flex flex-col">
            <label
              id={`${toggleId}-label`}
              htmlFor={toggleId}
              className={cn(
                'text-sm font-medium',
                disabled ? 'text-gray-400' : 'text-gray-700'
              )}
            >
              {label}
            </label>
            {helperText && (
              <p className="text-xs text-gray-500">{helperText}</p>
            )}
          </div>
        )}
      </div>
    );
  }
);

Toggle.displayName = 'Toggle';

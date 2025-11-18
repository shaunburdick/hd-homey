'use client';

import React, { useState } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
    error?: string;
    helpText?: string;
    showPasswordToggle?: boolean;
}

export function Input({
    label,
    error,
    helpText,
    showPasswordToggle = false,
    type = 'text',
    id,
    className = '',
    ...props
}: InputProps) {
    const [showPassword, setShowPassword] = useState(false);
    const inputId = id || `input-${label.toLowerCase().replace(/\s+/g, '-')}`;
    const errorId = `${inputId}-error`;
    const helpId = `${inputId}-help`;

    const isPasswordField = type === 'password';
    const actualType = isPasswordField && showPassword ? 'text' : type;

    return (
        <div className="form-field" style={{ marginBottom: 'var(--space-4)' }}>
            <label
                htmlFor={inputId}
                style={{
                    display: 'block',
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: 'var(--font-weight-medium)',
                    color: 'var(--color-text-primary)',
                    marginBottom: 'var(--space-2)',
                }}
            >
                {label}
                {props.required && (
                    <span style={{ color: 'var(--color-error)', marginLeft: 'var(--space-1)' }} aria-label="required">
                        *
                    </span>
                )}
            </label>

            <div style={{ position: 'relative' }}>
                <input
                    type={actualType}
                    id={inputId}
                    className={className}
                    aria-invalid={error ? 'true' : 'false'}
                    aria-describedby={
                        error ? errorId : helpText ? helpId : undefined
                    }
                    style={{
                        width: '100%',
                        minHeight: 'var(--input-height)',
                        padding: 'var(--space-3)',
                        backgroundColor: 'var(--color-bg-secondary)',
                        color: 'var(--color-text-primary)',
                        border: `1px solid ${error ? 'var(--color-error)' : 'var(--color-border)'}`,
                        borderRadius: 'var(--radius-md)',
                        fontSize: 'var(--font-size-base)',
                        transition: 'border-color var(--transition-fast)',
                    }}
                    {...props}
                />

                {/* WCAG 2.2: Accessible Authentication - Show/Hide Password Toggle */}
                {isPasswordField && showPasswordToggle && (
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        style={{
                            position: 'absolute',
                            right: 'var(--space-3)',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'none',
                            border: 'none',
                            color: 'var(--color-text-secondary)',
                            cursor: 'pointer',
                            padding: 'var(--space-2)',
                            fontSize: 'var(--font-size-sm)',
                            minHeight: 'var(--min-touch-target)',
                            minWidth: 'var(--min-touch-target)',
                        }}
                    >
                        {showPassword ? '🙈' : '👁️'}
                    </button>
                )}
            </div>

            {helpText && !error && (
                <p
                    id={helpId}
                    style={{
                        marginTop: 'var(--space-1)',
                        fontSize: 'var(--font-size-xs)',
                        color: 'var(--color-text-tertiary)',
                        marginBottom: 0,
                    }}
                >
                    {helpText}
                </p>
            )}

            {error && (
                <p
                    id={errorId}
                    role="alert"
                    style={{
                        marginTop: 'var(--space-1)',
                        fontSize: 'var(--font-size-sm)',
                        color: 'var(--color-error)',
                        marginBottom: 0,
                    }}
                >
                    {error}
                </p>
            )}
        </div>
    );
}

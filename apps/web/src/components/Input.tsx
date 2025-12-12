'use client';

import React, { useState } from 'react';
import styles from './Input.module.css';

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
        <div className={styles.formField}>
            <label htmlFor={inputId} className={styles.label}>
                {label}
                {props.required && (
                    <span className={styles.required} aria-label="required">
                        *
                    </span>
                )}
            </label>

            <div className={styles.inputWrapper}>
                <input
                    type={actualType}
                    id={inputId}
                    className={`${styles.input} ${className}`.trim()}
                    aria-invalid={error ? 'true' : 'false'}
                    aria-describedby={
                        error ? errorId : helpText ? helpId : undefined
                    }
                    {...props}
                />

                {/* WCAG 2.2: Accessible Authentication - Show/Hide Password Toggle */}
                {isPasswordField && showPasswordToggle && (
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        className={`${styles.toggleButton} unstyled`}
                    >
                        {showPassword ? '🙈' : '👁️'}
                    </button>
                )}
            </div>

            {helpText && !error && (
                <p id={helpId} className={styles.helpText}>
                    {helpText}
                </p>
            )}

            {error && (
                <p id={errorId} role="alert" className={styles.errorText}>
                    {error}
                </p>
            )}
        </div>
    );
}

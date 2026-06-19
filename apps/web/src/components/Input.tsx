'use client';

import React, { useState } from 'react';
import styles from './Input.module.css';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
    error?: string;
    helpText?: string;
    showPasswordToggle?: boolean;
}

/**
 * Derives the `aria-describedby` value for the input element.
 * Returns the error ID when there is an error, the help ID when there is help text,
 * and undefined otherwise.
 */
function getAriaDescribedBy({
    error,
    helpText,
    errorId,
    helpId,
}: {
    error: string | undefined;
    helpText: string | undefined;
    errorId: string;
    helpId: string;
}): string | undefined {
    if (error) {
        return errorId;
    }
    if (helpText) {
        return helpId;
    }
    return undefined;
}

/**
 * Resolves the effective input type, handling the show/hide password toggle.
 * When the field is a password and visibility is toggled on, returns 'text'.
 */
function resolveInputType({
    type,
    isPasswordField,
    showPassword,
}: {
    type: string;
    isPasswordField: boolean;
    showPassword: boolean;
}): string {
    if (isPasswordField && showPassword) {
        return 'text';
    }
    return type;
}

/** Toggle button that shows/hides the password field value. */
function PasswordToggle({
    showPassword,
    onToggle,
    className,
}: {
    showPassword: boolean;
    onToggle: () => void;
    className: string;
}) {
    return (
        <button
            type="button"
            onClick={onToggle}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className={`${className} unstyled`}
        >
            {showPassword ? '🙈' : '👁️'}
        </button>
    );
}

/** Input field label with an optional asterisk for required fields. */
function InputLabel({
    inputId,
    label,
    required,
}: {
    inputId: string;
    label: string;
    required: boolean | undefined;
}) {
    return (
        <label htmlFor={inputId} className={styles.label}>
            {label}
            {required && (
                <span className={styles.required} aria-label="required">
                    *
                </span>
            )}
        </label>
    );
}

/** Help text shown below the input when there is no error. */
function InputHelpText({ id, text }: { id: string; text: string }) {
    return (
        <p id={id} className={styles.helpText}>
            {text}
        </p>
    );
}

/** Error message shown below the input when validation fails. */
function InputErrorText({ id, message }: { id: string; message: string }) {
    return (
        <p id={id} role="alert" className={styles.errorText}>
            {message}
        </p>
    );
}

/** Input wrapper containing the native input element and optional password toggle. */
function InputField({
    actualType,
    inputId,
    className,
    error,
    ariaDescribedBy,
    isPasswordField,
    showPasswordToggle,
    showPassword,
    onTogglePassword,
    inputProps,
}: {
    actualType: string;
    inputId: string;
    className: string;
    error: string | undefined;
    ariaDescribedBy: string | undefined;
    isPasswordField: boolean;
    showPasswordToggle: boolean;
    showPassword: boolean;
    onTogglePassword: () => void;
    inputProps: React.InputHTMLAttributes<HTMLInputElement>;
}) {
    return (
        <div className={styles.inputWrapper}>
            <input
                type={actualType}
                id={inputId}
                className={`${styles.input} ${className}`.trim()}
                aria-invalid={error ? 'true' : 'false'}
                aria-describedby={ariaDescribedBy}
                {...inputProps}
            />
            {/* WCAG 2.2: Accessible Authentication - Show/Hide Password Toggle */}
            {isPasswordField && showPasswordToggle && (
                <PasswordToggle
                    showPassword={showPassword}
                    onToggle={onTogglePassword}
                    className={styles.toggleButton}
                />
            )}
        </div>
    );
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
    const inputId = id ?? `input-${label.toLowerCase().replace(/\s+/g, '-')}`;
    const errorId = `${inputId}-error`;
    const helpId = `${inputId}-help`;

    const isPasswordField = type === 'password';
    const actualType = resolveInputType({ type, isPasswordField, showPassword });
    const ariaDescribedBy = getAriaDescribedBy({ error, helpText, errorId, helpId });

    return (
        <div className={styles.formField}>
            <InputLabel inputId={inputId} label={label} required={props.required} />
            <InputField
                actualType={actualType}
                inputId={inputId}
                className={className}
                error={error}
                ariaDescribedBy={ariaDescribedBy}
                isPasswordField={isPasswordField}
                showPasswordToggle={showPasswordToggle}
                showPassword={showPassword}
                onTogglePassword={() => setShowPassword(!showPassword)}
                inputProps={props}
            />
            {helpText && !error && <InputHelpText id={helpId} text={helpText} />}
            {error && <InputErrorText id={errorId} message={error} />}
        </div>
    );
}

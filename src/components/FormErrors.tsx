import React from 'react';

export interface FormErrorsProps {
    errors: Record<string, string[]> | undefined;
    className?: string;
}

export function FormErrors({ errors, className = '' }: FormErrorsProps) {
    if (!errors || Object.keys(errors).length === 0) {
        return null;
    }

    return (
        <div
            role="alert"
            className={className}
            style={{
                backgroundColor: 'var(--color-error-bg)',
                border: '1px solid var(--color-error)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--space-4)',
                marginBottom: 'var(--space-4)',
            }}
        >
            <h3
                style={{
                    fontSize: 'var(--font-size-base)',
                    fontWeight: 'var(--font-weight-semibold)',
                    color: 'var(--color-error)',
                    marginTop: 0,
                    marginBottom: 'var(--space-2)',
                }}
            >
                {Object.keys(errors).length === 1 ? 'Error' : 'Errors'}
            </h3>
            <ul
                style={{
                    margin: 0,
                    paddingLeft: 'var(--space-5)',
                    color: 'var(--color-error)',
                }}
            >
                {Object.entries(errors).map(([field, messages]) =>
                    messages.map((message, idx) => (
                        <li
                            key={`${field}-${idx}`}
                            style={{
                                marginBottom: 'var(--space-1)',
                            }}
                        >
                            {field !== '_form' && <strong>{field}: </strong>}
                            {message}
                        </li>
                    )))}
            </ul>
        </div>
    );
}

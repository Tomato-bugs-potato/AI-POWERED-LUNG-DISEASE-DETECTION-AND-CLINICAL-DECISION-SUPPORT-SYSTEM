import * as z from 'zod';

export interface PasswordRule {
    id: 'length' | 'uppercase' | 'lowercase' | 'number' | 'special';
    label: string;
    test: (value: string) => boolean;
}

export const PASSWORD_RULES: PasswordRule[] = [
    {
        id: 'length',
        label: 'At least 8 characters',
        test: (v) => v.length >= 8,
    },
    {
        id: 'uppercase',
        label: 'At least one uppercase letter (A-Z)',
        test: (v) => /[A-Z]/.test(v),
    },
    {
        id: 'lowercase',
        label: 'At least one lowercase letter (a-z)',
        test: (v) => /[a-z]/.test(v),
    },
    {
        id: 'number',
        label: 'At least one number (0-9)',
        test: (v) => /\d/.test(v),
    },
    {
        id: 'special',
        label: 'At least one special character (e.g. ! @ # $ %)',
        test: (v) => /[^A-Za-z0-9]/.test(v),
    },
];

export function passwordIssues(value: string): string[] {
    return PASSWORD_RULES.filter((r) => !r.test(value)).map((r) => r.label);
}

export function passwordStrength(value: string): {
    score: 0 | 1 | 2 | 3 | 4 | 5;
    label: 'Empty' | 'Very weak' | 'Weak' | 'Fair' | 'Good' | 'Strong';
} {
    if (!value) return { score: 0, label: 'Empty' };
    const passed = PASSWORD_RULES.filter((r) => r.test(value)).length as 0 | 1 | 2 | 3 | 4 | 5;
    const labels = ['Very weak', 'Very weak', 'Weak', 'Fair', 'Good', 'Strong'] as const;
    return { score: passed, label: labels[passed] };
}

export const strongPasswordSchema = z
    .string()
    .min(1, 'Password is required')
    .refine((v) => v.length >= 8, {
        message: 'Password must be at least 8 characters long',
    })
    .refine((v) => /[A-Z]/.test(v), {
        message: 'Password must include at least one uppercase letter (A-Z)',
    })
    .refine((v) => /[a-z]/.test(v), {
        message: 'Password must include at least one lowercase letter (a-z)',
    })
    .refine((v) => /\d/.test(v), {
        message: 'Password must include at least one number (0-9)',
    })
    .refine((v) => /[^A-Za-z0-9]/.test(v), {
        message: 'Password must include at least one special character (e.g. ! @ # $ %)',
    });

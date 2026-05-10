'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowLeft, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';
import api from '@/lib/api';
import { strongPasswordSchema } from '@/lib/password';
import { PasswordStrengthMeter } from '@/components/auth/PasswordStrengthMeter';

const schema = z.object({
    new_password: strongPasswordSchema,
    confirm_password: z.string().min(1, 'Please re-enter your password to confirm'),
}).refine((data) => data.new_password === data.confirm_password, {
    message: 'Passwords do not match — please make sure both fields are identical',
    path: ['confirm_password'],
});

type FormValues = z.infer<typeof schema>;

// useSearchParams() requires a Suspense boundary on the static-export path.
// Default export wraps the form in <Suspense>; the form itself owns the hook.
export default function ResetPasswordPage() {
    return (
        <React.Suspense fallback={<ResetPasswordFallback />}>
            <ResetPasswordForm />
        </React.Suspense>
    );
}

function ResetPasswordFallback() {
    return (
        <div className="min-h-screen bg-premium-gradient flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md flex justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#4BA0A2]" />
            </div>
        </div>
    );
}

function ResetPasswordForm() {
    const searchParams = useSearchParams();
    const token = searchParams.get('token');

    const [success, setSuccess] = React.useState(false);
    const [error, setError] = React.useState('');
    const [showPassword, setShowPassword] = React.useState(false);
    const [showConfirm, setShowConfirm] = React.useState(false);

    const {
        register,
        handleSubmit,
        watch,
        formState: { errors, isSubmitting },
    } = useForm<FormValues>({
        resolver: zodResolver(schema),
        mode: 'onChange',
    });

    const newPasswordValue = watch('new_password') || '';

    const onSubmit = async (data: FormValues) => {
        setError('');
        if (!token) {
            setError('Reset token is missing. Please use the link from your email.');
            return;
        }
        try {
            await api.post('/auth/reset-password', {
                token,
                new_password: data.new_password,
            });
            setSuccess(true);
        } catch (err: any) {
            const detail = err?.response?.data?.detail;
            setError(detail || 'Reset token is invalid or has expired. Please request a new one.');
        }
    };

    // No token in URL
    if (!token) {
        return (
            <div className="min-h-screen bg-premium-gradient flex flex-col justify-center py-12 sm:px-6 lg:px-8">
                <div className="sm:mx-auto sm:w-full sm:max-w-md">
                    <div className="card-premium-pocket p-0 overflow-hidden">
                        <div className="bg-white/80 backdrop-blur-sm rounded-[2rem] p-6 sm:p-8 m-1 text-center space-y-4">
                            <div className="flex justify-center">
                                <div className="bg-red-100 p-4 rounded-full">
                                    <AlertCircle className="w-8 h-8 text-red-500" />
                                </div>
                            </div>
                            <h3 className="text-lg font-extrabold text-[#1C2222]">Invalid Reset Link</h3>
                            <p className="text-sm text-[#1C2222]/50 font-medium">
                                This link is missing a reset token. Please request a new password reset.
                            </p>
                            <Link
                                href="/forgot-password"
                                className="inline-flex items-center gap-2 text-sm font-bold text-[#4BA0A2] hover:text-[#3a8284]"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Request New Reset Link
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-premium-gradient flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="flex justify-center">
                    <div className="bg-[#4BA0A2] w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg">
                        <img src="/image.png" alt="Logo" className="w-full h-full object-cover rounded-2xl" />
                    </div>
                </div>
                <h2 className="mt-6 text-center text-2xl font-black tracking-tight text-[#1C2222]">
                    Set New Password
                </h2>
                <p className="mt-2 text-center text-sm text-[#1C2222]/50 font-medium">
                    Enter your new password below
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-[440px]">
                <div className="card-premium-pocket p-0 overflow-hidden">
                    <div className="bg-white/80 backdrop-blur-sm rounded-[2rem] p-6 sm:p-8 m-1">
                        {success ? (
                            <div className="text-center space-y-4 py-4">
                                <div className="flex justify-center">
                                    <div className="bg-green-100 p-4 rounded-full">
                                        <CheckCircle className="w-8 h-8 text-green-600" />
                                    </div>
                                </div>
                                <h3 className="text-lg font-extrabold text-[#1C2222]">
                                    Password Updated
                                </h3>
                                <p className="text-sm text-[#1C2222]/50 font-medium">
                                    Your password has been reset successfully. You can now sign in with your new password.
                                </p>
                                <Link
                                    href="/login"
                                    className="inline-flex items-center justify-center gap-2 w-full bg-[#1C2222] hover:bg-[#2a3333] text-white rounded-xl font-bold py-2.5 px-4 transition-colors"
                                >
                                    Sign In
                                </Link>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                                <div className="mb-4">
                                    <h3 className="text-xl font-extrabold text-[#1C2222]">Reset Password</h3>
                                    <p className="text-sm text-[#1C2222]/40 mt-1 font-medium">
                                        Choose a strong password — at least 8 characters with upper, lower, number, and a special character.
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="new_password" className={`font-bold ${errors.new_password ? 'text-red-500' : 'text-[#1C2222]/70'}`}>
                                        New Password
                                    </Label>
                                    <div className="relative">
                                        <Input
                                            id="new_password"
                                            type={showPassword ? 'text' : 'password'}
                                            autoComplete="new-password"
                                            placeholder="Enter new password"
                                            className={`rounded-xl border-[#1C2222]/10 bg-white/60 focus:bg-white pr-10 ${errors.new_password ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                                            {...register('new_password')}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#1C2222]/40 hover:text-[#1C2222]/70"
                                        >
                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                    {errors.new_password && (
                                        <p className="text-sm text-red-500">{errors.new_password.message}</p>
                                    )}
                                    <PasswordStrengthMeter value={newPasswordValue} className="mt-1" />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="confirm_password" className={`font-bold ${errors.confirm_password ? 'text-red-500' : 'text-[#1C2222]/70'}`}>
                                        Confirm Password
                                    </Label>
                                    <div className="relative">
                                        <Input
                                            id="confirm_password"
                                            type={showConfirm ? 'text' : 'password'}
                                            autoComplete="new-password"
                                            placeholder="Confirm new password"
                                            className={`rounded-xl border-[#1C2222]/10 bg-white/60 focus:bg-white pr-10 ${errors.confirm_password ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                                            {...register('confirm_password')}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirm(!showConfirm)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#1C2222]/40 hover:text-[#1C2222]/70"
                                        >
                                            {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                    {errors.confirm_password && (
                                        <p className="text-sm text-red-500">{errors.confirm_password.message}</p>
                                    )}
                                </div>

                                {error && (
                                    <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                                        <p className="text-sm text-red-600 font-medium">{error}</p>
                                    </div>
                                )}

                                <Button
                                    type="submit"
                                    className="w-full bg-[#1C2222] hover:bg-[#2a3333] text-white rounded-xl font-bold"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Updating...
                                        </>
                                    ) : (
                                        'Update Password'
                                    )}
                                </Button>

                                <div className="text-center">
                                    <Link
                                        href="/login"
                                        className="inline-flex items-center gap-2 text-sm font-bold text-[#4BA0A2] hover:text-[#3a8284]"
                                    >
                                        <ArrowLeft className="w-4 h-4" />
                                        Back to Sign In
                                    </Link>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

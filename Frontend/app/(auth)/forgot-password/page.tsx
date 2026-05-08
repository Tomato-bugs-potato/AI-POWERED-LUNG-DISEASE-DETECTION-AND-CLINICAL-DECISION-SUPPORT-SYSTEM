'use client';

import * as React from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowLeft, Mail } from 'lucide-react';
import api from '@/lib/api';
import { sendResetEmail } from '@/lib/email';

const schema = z.object({
    email: z.string().email('Please enter a valid email address'),
});

type FormValues = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
    const [submitted, setSubmitted] = React.useState(false);
    const [error, setError] = React.useState('');

    const {
        register,
        handleSubmit,
        getValues,
        formState: { errors, isSubmitting },
    } = useForm<FormValues>({
        resolver: zodResolver(schema),
    });

    const onSubmit = async (data: FormValues) => {
        setError('');
        try {
            const res = await api.post('/auth/forgot-password', { email: data.email });

            // If the backend found the user, it returns reset_token + email
            if (res.data.reset_token) {
                await sendResetEmail({
                    email: res.data.email,
                    resetToken: res.data.reset_token,
                });
            }
            // If user not found, backend returns a generic message (no token)
            // We still show success to prevent email enumeration
        } catch {
            // Always show success to prevent email enumeration
        } finally {
            setSubmitted(true);
        }
    };

    return (
        <div className="min-h-screen bg-premium-gradient flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="flex justify-center">
                    <div className="bg-[#4BA0A2] w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg">
                        <img src="/image.png" alt="Logo" className="w-full h-full object-cover rounded-2xl" />
                    </div>
                </div>
                <h2 className="mt-6 text-center text-2xl font-black tracking-tight text-[#1C2222]">
                    Reset your password
                </h2>
                <p className="mt-2 text-center text-sm text-[#1C2222]/50 font-medium">
                    Enter your email and we&apos;ll send you a reset link
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-[440px]">
                <div className="card-premium-pocket p-0 overflow-hidden">
                    <div className="bg-white/80 backdrop-blur-sm rounded-[2rem] p-6 sm:p-8 m-1">
                        <div className="mb-6">
                            <h3 className="text-xl font-extrabold text-[#1C2222]">Forgot Password</h3>
                            <p className="text-sm text-[#1C2222]/40 mt-1 font-medium">
                                We&apos;ll send a password reset link to your registered email address.
                            </p>
                        </div>

                        {submitted ? (
                            <div className="text-center space-y-4 py-4">
                                <div className="flex justify-center">
                                    <div className="bg-[#4BA0A2]/20 p-4 rounded-full">
                                        <Mail className="w-8 h-8 text-[#4BA0A2]" />
                                    </div>
                                </div>
                                <h3 className="text-lg font-extrabold text-[#1C2222]">
                                    Check your inbox
                                </h3>
                                <p className="text-sm text-[#1C2222]/50 font-medium">
                                    If an account exists for{' '}
                                    <span className="font-bold text-[#1C2222]">
                                        {getValues('email')}
                                    </span>
                                    , you will receive a password reset link shortly.
                                </p>
                                <Link
                                    href="/login"
                                    className="inline-flex items-center gap-2 text-sm font-bold text-[#4BA0A2] hover:text-[#3a8284] mt-2"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    Back to Sign In
                                </Link>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email" className={`font-bold ${errors.email ? 'text-red-500' : 'text-[#1C2222]/70'}`}>
                                        Email address
                                    </Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        autoComplete="email"
                                        placeholder="doctor@hospital.com"
                                        className={`rounded-xl border-[#1C2222]/10 bg-white/60 focus:bg-white ${errors.email ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                                        {...register('email')}
                                    />
                                    {errors.email && (
                                        <p className="text-sm text-red-500">{errors.email.message}</p>
                                    )}
                                </div>

                                {error && (
                                    <p className="text-sm text-red-500 text-center">{error}</p>
                                )}

                                <Button
                                    type="submit"
                                    className="w-full bg-[#1C2222] hover:bg-[#2a3333] text-white rounded-xl font-bold"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Sending...
                                        </>
                                    ) : (
                                        'Send Reset Link'
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

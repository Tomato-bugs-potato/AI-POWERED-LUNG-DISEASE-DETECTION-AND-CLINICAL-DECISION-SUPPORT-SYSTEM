'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';
import { LanguageToggle } from '@/components/auth/LanguageToggle';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, AlertCircle } from 'lucide-react';
import api from '@/lib/api';
import { sendOtpEmail } from '@/lib/email';
import { setAccessToken } from '@/lib/auth';
import { useAuthStore } from '@/store';

const loginSchema = z.object({
    email: z.string().email('Please enter a valid email address'),
    password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
    const router = useRouter();
    const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
    const [lockedMsg, setLockedMsg] = React.useState<string | null>(null);
    const [attemptsLeft, setAttemptsLeft] = React.useState<number | null>(null);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
    });

    const onSubmit = async (data: LoginFormValues) => {
        setErrorMsg(null);
        setLockedMsg(null);

        try {
            const response = await api.post('/auth/login', data);

            // ── DEV SHORTCUT: backend returned tokens directly (SKIP_OTP=true) ──
            if (response.data.skip_otp && response.data.access_token) {
                const { access_token, user } = response.data;

                setAccessToken(access_token, 900);
                document.cookie = `access_token=${access_token}; path=/; max-age=86400; samesite=Lax`;

                useAuthStore.getState().setUser({
                    user_id: user.user_id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                    hospital_id: user.hospital_id || undefined,
                    status: 'Active',
                });

                window.location.href = '/';
                return;
            }
            // ── END DEV SHORTCUT ──

            const { user_id, otp_code, email } = response.data;

            if (user_id) sessionStorage.setItem('temp_user_id', user_id);
            if (email) sessionStorage.setItem('temp_email', email);

            if (otp_code && email) {
                sendOtpEmail(email, otp_code).catch((err) =>
                    console.error('Failed to send OTP email:', err)
                );
            }

            router.push('/verify-otp');

        } catch (error: any) {
            if (error.response?.status === 401) {
                setErrorMsg('Invalid email or password');
                const remaining = error.response.data?.attempts_left;
                if (remaining !== undefined) {
                    setAttemptsLeft(remaining);
                }
            } else if (error.response?.status === 403) {
                setLockedMsg('Your account has been locked due to multiple failed attempts.');
            } else {
                setErrorMsg('An unexpected error occurred. Please try again.');
            }
        }
    };

    return (
        <div className="min-h-screen bg-premium-gradient flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative">
            <div className="absolute top-4 right-4 md:top-8 md:right-8">
                <LanguageToggle />
            </div>

            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="flex justify-center">
                    <div className="bg-[#4BA0A2] w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg">
                        <img src="/image.png" alt="Logo" className="w-full h-full object-cover rounded-2xl" />
                    </div>
                </div>
                <h2 className="mt-6 text-center text-2xl font-black tracking-tight text-[#1C2222]">
                    AI Lung Disease Detection
                </h2>
                <p className="mt-2 text-center text-sm text-[#1C2222]/50 font-medium">
                    Sign in to your account to continue
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-[440px]">
                <div className="card-premium-pocket p-0 overflow-hidden">
                    <div className="bg-white/80 backdrop-blur-sm rounded-[2rem] p-6 sm:p-8 m-1">
                        <div className="mb-6">
                            <h3 className="text-xl font-extrabold text-[#1C2222]">Sign in</h3>
                            <p className="text-sm text-[#1C2222]/40 mt-1 font-medium">
                                Enter your email and password below to login
                            </p>
                        </div>

                        {lockedMsg ? (
                            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6">
                                <div className="flex">
                                    <AlertCircle className="h-5 w-5 text-red-600 mr-3 shrink-0 mt-0.5" />
                                    <div>
                                        <h3 className="text-sm font-bold text-red-800">Account Locked</h3>
                                        <p className="text-sm text-red-700 mt-1">{lockedMsg}</p>
                                        <a href="/forgot-password" className="text-sm font-bold text-red-800 hover:underline mt-2 inline-block">
                                            Reset your password
                                        </a>
                                    </div>
                                </div>
                            </div>
                        ) : null}

                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email" className={`font-bold ${errors.email ? "text-red-500" : "text-[#1C2222]/70"}`}>Email address</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    autoComplete="email"
                                    aria-invalid={!!errors.email}
                                    aria-describedby={errors.email ? "email-error" : undefined}
                                    className={`rounded-xl border-[#1C2222]/10 bg-white/60 focus:bg-white ${errors.email ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                                    {...register("email")}
                                />
                                {errors.email && (
                                    <p className="text-sm text-red-500" id="email-error">{errors.email.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="password" className={`font-bold ${errors.password ? "text-red-500" : "text-[#1C2222]/70"}`}>Password</Label>
                                    <a href="/forgot-password" className="text-sm font-bold text-[#4BA0A2] hover:text-[#3a8284]">
                                        Forgot Password?
                                    </a>
                                </div>
                                <PasswordInput
                                    id="password"
                                    autoComplete="current-password"
                                    error={!!errors.password}
                                    aria-invalid={!!errors.password}
                                    aria-describedby={errors.password ? "password-error" : undefined}
                                    className="rounded-xl border-[#1C2222]/10 bg-white/60 focus:bg-white"
                                    {...register("password")}
                                />
                                {errors.password && (
                                    <p className="text-sm text-red-500" id="password-error">{errors.password.message}</p>
                                )}

                                {errorMsg && !lockedMsg && (
                                    <p className="text-sm font-bold text-red-500 mt-1">{errorMsg}</p>
                                )}

                                {attemptsLeft !== null && attemptsLeft > 0 && attemptsLeft <= 3 && (
                                    <p className="text-sm text-amber-600 font-bold">
                                        Warning: You have {attemptsLeft} attempt{attemptsLeft === 1 ? '' : 's'} left.
                                    </p>
                                )}
                            </div>

                            <Button
                                type="submit"
                                className="w-full bg-[#1C2222] hover:bg-[#2a3333] text-white rounded-xl font-bold mt-2"
                                disabled={isSubmitting || !!lockedMsg}
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Signing in...
                                    </>
                                ) : (
                                    "Sign In"
                                )}
                            </Button>
                        </form>

                        <div className="mt-6">
                            <p className="text-center text-sm text-[#1C2222]/40 font-medium">
                                Don&apos;t have an account?{' '}
                                <Link href="/signup" className="font-bold text-[#4BA0A2] hover:text-[#3a8284]">
                                    Sign up
                                </Link>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

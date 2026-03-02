'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { LanguageToggle } from '@/components/auth/LanguageToggle';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Stethoscope, Loader2, AlertCircle } from 'lucide-react';
import api from '@/lib/api';

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

            // Store user_id in sessionStorage for the OTP verification page
            if (response.data && response.data.user_id) {
                sessionStorage.setItem('temp_user_id', response.data.user_id);
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
        <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative">
            <div className="absolute top-4 right-4 md:top-8 md:right-8">
                <LanguageToggle />
            </div>

            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="flex justify-center">
                    <div className="bg-blue-600 p-3 rounded-full">
                        <Stethoscope className="w-8 h-8 text-white" />
                    </div>
                </div>
                <h2 className="mt-6 text-center text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                    AI Lung Disease Detection
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
                    Sign in to your account to continue
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-[440px]">
                <Card className="border-border">
                    <CardHeader className="space-y-1">
                        <CardTitle className="text-xl">Sign in</CardTitle>
                        <CardDescription>
                            Enter your email and password below to login
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {lockedMsg ? (
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4 mb-6">
                                <div className="flex">
                                    <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-500 mr-3" />
                                    <div>
                                        <h3 className="text-sm font-medium text-red-800 dark:text-red-400">Account Locked</h3>
                                        <p className="text-sm text-red-700 dark:text-red-300 mt-1">{lockedMsg}</p>
                                        <a href="/forgot-password" className="text-sm font-medium text-red-800 dark:text-red-400 hover:underline mt-2 inline-block">
                                            Reset your password
                                        </a>
                                    </div>
                                </div>
                            </div>
                        ) : null}

                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email" className={errors.email ? "text-red-500" : ""}>Email address</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    autoComplete="email"
                                    aria-invalid={!!errors.email}
                                    aria-describedby={errors.email ? "email-error" : undefined}
                                    className={errors.email ? "border-red-500 focus-visible:ring-red-500" : ""}
                                    {...register("email")}
                                />
                                {errors.email && (
                                    <p className="text-sm text-red-500" id="email-error">{errors.email.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="password" className={errors.password ? "text-red-500" : ""}>Password</Label>
                                    <a href="/forgot-password" className="text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400">
                                        Forgot Password?
                                    </a>
                                </div>
                                <PasswordInput
                                    id="password"
                                    autoComplete="current-password"
                                    error={!!errors.password}
                                    aria-invalid={!!errors.password}
                                    aria-describedby={errors.password ? "password-error" : undefined}
                                    {...register("password")}
                                />
                                {errors.password && (
                                    <p className="text-sm text-red-500" id="password-error">{errors.password.message}</p>
                                )}

                                {errorMsg && !lockedMsg && (
                                    <p className="text-sm font-medium text-red-500 mt-1">{errorMsg}</p>
                                )}

                                {attemptsLeft !== null && attemptsLeft > 0 && attemptsLeft <= 3 && (
                                    <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">
                                        Warning: You have {attemptsLeft} attempt{attemptsLeft === 1 ? '' : 's'} left.
                                    </p>
                                )}
                            </div>

                            <Button
                                type="submit"
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
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
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

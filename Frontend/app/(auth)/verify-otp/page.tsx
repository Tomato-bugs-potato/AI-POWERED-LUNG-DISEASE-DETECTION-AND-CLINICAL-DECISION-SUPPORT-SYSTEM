'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
} from '@/components/ui/input-otp';
import api from '@/lib/api';
import { setAccessToken } from '@/lib/auth';
import { useAuthStore } from '@/store';
import { toast } from 'sonner';
import { sendOtpEmail } from '@/lib/email';

export default function VerifyOtpPage() {
    const router = useRouter();
    const [otp, setOtp] = React.useState('');
    const [timeLeft, setTimeLeft] = React.useState(300); // 5 minutes
    const [isVerifying, setIsVerifying] = React.useState(false);
    const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
    const [hasError, setHasError] = React.useState(false);
    const [attemptsAllowed, setAttemptsAllowed] = React.useState(3);

    React.useEffect(() => {
        if (timeLeft <= 0) return;
        const intervalId = setInterval(() => {
            setTimeLeft((prev) => prev - 1);
        }, 1000);
        return () => clearInterval(intervalId);
    }, [timeLeft]);

    const handleVerify = async (code: string) => {
        if (attemptsAllowed <= 0) return;
        if (code.length !== 6) return;

        setIsVerifying(true);
        setErrorMsg(null);
        setHasError(false);

        try {
            const userId = sessionStorage.getItem('temp_user_id');
            if (!userId) {
                throw new Error('User session not found. Please log in again.');
            }

            // Real API call to verify OTP
            const response = await api.post('/auth/verify-otp', {
                user_id: userId,
                otp: code
            });

            const { access_token, user } = response.data;

            // 1. Set in-memory token for api.ts interceptor (15 min = 900s)
            setAccessToken(access_token, 900);

            // 2. Set cookie for middleware (server-side route protection)
            document.cookie = `access_token=${access_token}; path=/; max-age=86400; samesite=Lax`;

            // 3. Populate Zustand store so dashboard layout shows user info
            useAuthStore.getState().setUser({
                user_id: user.user_id,
                email: user.email,
                name: user.name,
                role: user.role,
                hospital_id: user.hospital_id || undefined,
                status: 'Active',
            });

            // Clear temp session
            sessionStorage.removeItem('temp_user_id');

            // Redirect to dashboard root (middleware handles role-based routing)
            toast.success('Identity verified successfully');
            window.location.href = '/';

        } catch (error: any) {
            setHasError(true);
            setOtp(''); // clear boxes

            const remaining = attemptsAllowed - 1;
            setAttemptsAllowed(remaining);

            if (remaining <= 0) {
                setErrorMsg('Maximum attempts reached. Please request a new code.');
            } else {
                setErrorMsg('Invalid verification code.');
                toast.error('Invalid verification code.');
            }
        } finally {
            setIsVerifying(false);
        }
    };

    const handleResend = async () => {
        try {
            const userId = sessionStorage.getItem('temp_user_id');
            if (!userId) {
                toast.error('Session expired, please log in again.');
                return;
            }

            const response = await api.post('/auth/resend-otp', { user_id: userId });
            const { otp_code, email } = response.data;

            // Re-dispatch OTP via EmailJS
            if (otp_code && email) {
                sendOtpEmail(email, otp_code).catch((err) =>
                    console.error('Failed to resend OTP email:', err)
                );
            }

            setTimeLeft(300); // Reset timer to 5 minutes
            setAttemptsAllowed(3);
            setErrorMsg(null);
            setHasError(false);
            setOtp('');
            toast.success('A new code has been sent to your email.');
        } catch (error) {
            toast.error('Failed to resend code. Please try again.');
        }
    };

    // Convert seconds to MM:SS
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const isTimerUrgent = timeLeft > 0 && timeLeft < 60;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="flex justify-center">
                    <div className="bg-blue-600 p-3 rounded-full">
                        <ShieldCheck className="w-8 h-8 text-white" />
                    </div>
                </div>
                <h2 className="mt-6 text-center text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                    Verify Your Identity
                </h2>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-[440px]">
                <Card className="border-border">
                    <CardHeader className="space-y-1 text-center pb-8">
                        <CardDescription className="text-base text-gray-600 dark:text-gray-400">
                            A 6-digit code was sent to your email
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center">

                        <InputOTP
                            maxLength={6}
                            value={otp}
                            onChange={(value) => {
                                setOtp(value);
                                setHasError(false);
                                if (value.length === 6) {
                                    handleVerify(value);
                                }
                            }}
                            disabled={isVerifying || attemptsAllowed <= 0}
                            autoFocus
                        >
                            <InputOTPGroup className={hasError ? "gap-2 animate-shake" : "gap-2"}>
                                {Array.from({ length: 6 }).map((_, index) => (
                                    <InputOTPSlot
                                        key={index}
                                        index={index}
                                        className={`w-12 h-14 text-xl border-gray-300 dark:border-gray-700 
                      ${hasError ? 'border-red-500 text-red-500 ring-red-500 focus-visible:ring-red-500' : ''}`
                                        }
                                    />
                                ))}
                            </InputOTPGroup>
                        </InputOTP>

                        {errorMsg && (
                            <p className="mt-4 text-sm font-medium text-red-500 text-center">
                                {errorMsg}
                            </p>
                        )}

                        <div className="mt-8 mb-6 w-full flex flex-col items-center space-y-4">
                            <Button
                                onClick={() => handleVerify(otp)}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                                disabled={otp.length !== 6 || isVerifying || attemptsAllowed <= 0}
                            >
                                {isVerifying ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Verifying...
                                    </>
                                ) : (
                                    "Verify"
                                )}
                            </Button>
                        </div>

                        <div className="flex flex-col items-center space-y-2 text-sm">
                            <span className={`font-mono font-medium tracking-wider ${isTimerUrgent ? 'text-red-500' : 'text-gray-600 dark:text-gray-400'}`}>
                                {formatTime(timeLeft)}
                            </span>

                            <div className="flex items-center space-x-1">
                                <span className="text-gray-500 dark:text-gray-400">Didn't receive a code?</span>
                                <Button
                                    variant="link"
                                    className="px-1 h-auto text-blue-600 dark:text-blue-400 p-0"
                                    onClick={handleResend}
                                    disabled={timeLeft > 0}
                                >
                                    Resend Code
                                </Button>
                            </div>
                        </div>

                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

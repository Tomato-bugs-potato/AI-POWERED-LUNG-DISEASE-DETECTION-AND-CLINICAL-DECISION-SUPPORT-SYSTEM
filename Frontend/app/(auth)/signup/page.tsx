'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
} from '@/components/ui/input-otp';
import { Stethoscope, Loader2, ShieldCheck, ArrowLeft } from 'lucide-react';
import api from '@/lib/api';
import { sendOtpEmail } from '@/lib/email';

const signupSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Please enter a valid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    role: z.enum(['Doctor', 'Radiologist', 'Lab_Technician'], {
        required_error: 'Please select a role',
    }),
});

type SignupFormValues = z.infer<typeof signupSchema>;

export default function SignupPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = React.useState(false);

    // Registration OTP state
    const [isOtpSent, setIsOtpSent] = React.useState(false);
    const [otp, setOtp] = React.useState('');
    const [generatedOtp, setGeneratedOtp] = React.useState('');
    const [signupPayload, setSignupPayload] = React.useState<any>(null);
    const [hasError, setHasError] = React.useState(false);

    const form = useForm<SignupFormValues>({
        resolver: zodResolver(signupSchema),
        defaultValues: {
            name: '',
            email: '',
            password: '',
            role: 'Doctor',
        },
    });

    // Step 1: Submit Form -> Send OTP
    async function onSubmit(data: SignupFormValues) {
        setIsLoading(true);

        try {
            const payload = {
                email: data.email,
                password: data.password,
                name: data.name,
                role: data.role,
                status: 'Active',
            };

            const code = Math.floor(100000 + Math.random() * 900000).toString();

            await sendOtpEmail(data.email, code);

            setSignupPayload(payload);
            setGeneratedOtp(code);
            setIsOtpSent(true);
            setOtp('');

            toast.success('Verification code sent to your email');
        } catch (error: any) {
            console.error('Signup error:', error);
            toast.error('Failed to send verification code. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }

    // Step 2: Verify OTP -> Create backend account
    async function handleVerifyOtp() {
        if (otp.length !== 6) return;

        if (otp !== generatedOtp) {
            setHasError(true);
            setOtp('');
            toast.error('Invalid verification code');
            return;
        }

        setIsLoading(true);
        setHasError(false);

        try {
            await api.post('/users/', signupPayload);

            toast.success('Account created successfully!', {
                description: 'You can now log in with your credentials.',
            });

            router.push('/login');
        } catch (error: any) {
            console.error('Account creation error:', error);
            const errorMessage = error.response?.data?.detail?.[0]?.msg
                || error.response?.data?.detail
                || 'Failed to create account. Email may already exist.';

            toast.error('Signup Failed', {
                description: Array.isArray(errorMessage) ? errorMessage[0] : errorMessage,
            });
            // Optionally, revert back to step 1 so they can fix their email
            setIsOtpSent(false);
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative">
            {!isOtpSent ? (
                // Step 1: Form
                <>
                    <div className="sm:mx-auto sm:w-full sm:max-w-md">
                        <div className="flex justify-center">
                            <div className="bg-blue-600 p-3 rounded-full">
                                <Stethoscope className="w-8 h-8 text-white" />
                            </div>
                        </div>
                        <h2 className="mt-6 text-center text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                            Create an account
                        </h2>
                        <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
                            Sign up to request platform access
                        </p>
                    </div>

                    <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-[440px]">
                        <div className="bg-white dark:bg-zinc-900 border border-border sm:rounded-xl shadow-sm overflow-hidden">
                            <div className="px-4 py-8 sm:px-10">
                                <Form {...form}>
                                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                        <FormField
                                            control={form.control}
                                            name="name"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Full Name</FormLabel>
                                                    <FormControl>
                                                        <Input disabled={isLoading} placeholder="Dr. John Doe" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="email"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Email</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            disabled={isLoading}
                                                            placeholder="doctor@hospital.com"
                                                            type="email"
                                                            {...field}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="role"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Clinical Role</FormLabel>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
                                                        <FormControl>
                                                            <SelectTrigger className="w-full">
                                                                <SelectValue placeholder="Select your clinical role" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent className="w-full bg-white dark:bg-zinc-900 border border-border shadow-lg">
                                                            <SelectItem value="Doctor" className="hover:bg-blue-50 dark:hover:bg-zinc-800 focus:bg-blue-50 dark:focus:bg-zinc-800 cursor-pointer">Doctor / Physician</SelectItem>
                                                            <SelectItem value="Radiologist" className="hover:bg-blue-50 dark:hover:bg-zinc-800 focus:bg-blue-50 dark:focus:bg-zinc-800 cursor-pointer">Radiologist</SelectItem>
                                                            <SelectItem value="Lab_Technician" className="hover:bg-blue-50 dark:hover:bg-zinc-800 focus:bg-blue-50 dark:focus:bg-zinc-800 cursor-pointer">Lab Technician</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="password"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Password</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            disabled={isLoading}
                                                            placeholder="••••••••"
                                                            type="password"
                                                            {...field}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <Button className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white" type="submit" disabled={isLoading}>
                                            {isLoading ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Sending code...
                                                </>
                                            ) : (
                                                "Create Account"
                                            )}
                                        </Button>
                                    </form>
                                </Form>

                                <div className="mt-6">
                                    <p className="text-center text-sm text-muted-foreground">
                                        Already have an account?{' '}
                                        <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300">
                                            Sign in
                                        </Link>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                // Step 2: Verify OTP
                <>
                    <div className="sm:mx-auto sm:w-full sm:max-w-md">
                        <div className="flex justify-center">
                            <div className="bg-blue-600 p-3 rounded-full">
                                <ShieldCheck className="w-8 h-8 text-white" />
                            </div>
                        </div>
                        <h2 className="mt-6 text-center text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                            Verify Your Email
                        </h2>
                        <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
                            A 6-digit code was sent to {signupPayload?.email}
                        </p>
                    </div>

                    <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-[440px]">
                        <div className="bg-white dark:bg-zinc-900 border border-border sm:rounded-xl shadow-sm overflow-hidden">
                            <div className="px-4 py-8 sm:px-10 flex flex-col items-center">
                                <InputOTP
                                    maxLength={6}
                                    value={otp}
                                    onChange={(value) => {
                                        setOtp(value);
                                        setHasError(false);
                                        if (value.length === 6) {
                                            // auto trigger isn't required but makes UX better, doing explicitly via button instead or allow both.
                                        }
                                    }}
                                    disabled={isLoading}
                                    autoFocus
                                >
                                    <InputOTPGroup className={hasError ? "gap-2 animate-shake" : "gap-2"}>
                                        {Array.from({ length: 6 }).map((_, index) => (
                                            <InputOTPSlot
                                                key={index}
                                                index={index}
                                                className={`w-12 h-14 text-xl border-gray-300 dark:border-gray-700 
                                                ${hasError ? 'border-red-500 text-red-500 ring-red-500 focus-visible:ring-red-500' : ''}`}
                                            />
                                        ))}
                                    </InputOTPGroup>
                                </InputOTP>

                                <div className="mt-8 mb-6 w-full flex flex-col items-center space-y-4">
                                    <Button
                                        onClick={handleVerifyOtp}
                                        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                                        disabled={otp.length !== 6 || isLoading}
                                    >
                                        {isLoading ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Creating account...
                                            </>
                                        ) : (
                                            "Confirm & Register"
                                        )}
                                    </Button>

                                    <Button
                                        variant="ghost"
                                        className="text-sm font-medium text-gray-600 dark:text-gray-400"
                                        onClick={() => setIsOtpSent(false)}
                                        disabled={isLoading}
                                    >
                                        <ArrowLeft className="mr-2 h-4 w-4" />
                                        Back to registration
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

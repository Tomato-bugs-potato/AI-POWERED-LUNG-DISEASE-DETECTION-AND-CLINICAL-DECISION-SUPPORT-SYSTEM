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
import { Loader2 } from 'lucide-react';
import api from '@/lib/api';

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

    const form = useForm<SignupFormValues>({
        resolver: zodResolver(signupSchema),
        defaultValues: {
            name: '',
            email: '',
            password: '',
            role: 'Doctor',
        },
    });

    async function onSubmit(data: SignupFormValues) {
        setIsLoading(true);

        try {
            // Note: hospital_id is optional or inferred since we removed null constraint
            const payload = {
                email: data.email,
                password: data.password,
                name: data.name,
                role: data.role,
                status: 'Active',
            };

            await api.post('/users/', payload);

            toast.success('Account created successfully!', {
                description: 'You can now log in with your credentials.',
            });

            router.push('/login');
        } catch (error: any) {
            console.error('Signup error:', error);
            const errorMessage = error.response?.data?.detail?.[0]?.msg
                || error.response?.data?.detail
                || 'Failed to create account. Email may already exist.';

            toast.error('Signup Failed', {
                description: Array.isArray(errorMessage) ? errorMessage[0] : errorMessage,
            });
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
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
                                                    <SelectItem value="Doctor" className="hover:bg-[#edfafa] dark:hover:bg-zinc-800 focus:bg-[#edfafa] dark:focus:bg-zinc-800 cursor-pointer">Doctor / Physician</SelectItem>
                                                    <SelectItem value="Radiologist" className="hover:bg-[#edfafa] dark:hover:bg-zinc-800 focus:bg-[#edfafa] dark:focus:bg-zinc-800 cursor-pointer">Radiologist</SelectItem>
                                                    <SelectItem value="Lab_Technician" className="hover:bg-[#edfafa] dark:hover:bg-zinc-800 focus:bg-[#edfafa] dark:focus:bg-zinc-800 cursor-pointer">Lab Technician</SelectItem>
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

                                <Button className="w-full mt-6 bg-[#4DC8D8] hover:bg-[#3ab8c8] text-white" type="submit" disabled={isLoading}>
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Creating...
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
                                <Link href="/login" className="font-medium text-[#4DC8D8] hover:text-[#3ab8c8] dark:text-[#4DC8D8] dark:hover:text-[#3ab8c8]">
                                    Sign in
                                </Link>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

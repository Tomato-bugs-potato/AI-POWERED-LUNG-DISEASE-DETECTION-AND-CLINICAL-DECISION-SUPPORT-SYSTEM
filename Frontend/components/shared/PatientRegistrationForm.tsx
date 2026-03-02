'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Patient, PatientSex } from '@/types';
import { toast } from 'sonner';
import api from '@/lib/api';

const patientSchema = z.object({
    age: z.coerce.number().positive('Age must be positive').int().max(120),
    sex: z.enum(['Male', 'Female']),
    visit_date: z.date(),
    consent_given: z.boolean().refine(val => val === true, {
        message: 'You must confirm patient consent',
    }),
});

type PatientFormValues = z.infer<typeof patientSchema>;

interface PatientRegistrationFormProps {
    onSuccess: (patient: Patient) => void;
    className?: string;
    isSubmitting?: boolean;
}

export function PatientRegistrationForm({ onSuccess, className = '' }: PatientRegistrationFormProps) {
    const {
        register,
        handleSubmit,
        setValue,
        watch,
        formState: { errors, isSubmitting },
    } = useForm<PatientFormValues>({
        resolver: zodResolver(patientSchema),
        defaultValues: {
            visit_date: new Date(),
        },
    });

    const visitDate = watch('visit_date');
    const consentGiven = watch('consent_given');
    const sex = watch('sex');

    const onSubmit = async (data: PatientFormValues) => {
        try {
            const response = await api.post('/patients/', {
                age: data.age,
                sex: data.sex,
                consent_recorded: data.consent_given,
                visit_date: format(data.visit_date, 'yyyy-MM-dd'),
            });

            const p = response.data;

            const newPatient: Patient = {
                patient_id: p.patient_id,
                age: p.age,
                sex: p.sex as PatientSex,
                consent_given: p.consent_recorded,
                registration_date: p.registered_at || new Date().toISOString(),
            };

            toast.success(`Patient registered successfully — ID: ${p.patient_id.substring(0, 8)}...`);
            onSuccess(newPatient);
        } catch (error: any) {
            const detail = error?.response?.data?.detail || 'Failed to register patient';
            toast.error(detail);
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className={`space-y-4 ${className}`}>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="age" className={errors.age ? "text-red-500" : ""}>Age *</Label>
                    <Input
                        id="age"
                        type="number"
                        min="0"
                        max="120"
                        placeholder="e.g. 45"
                        {...register('age')}
                        className={errors.age ? "border-red-500 focus-visible:ring-red-500" : ""}
                    />
                    {errors.age && <p className="text-sm text-red-500">{errors.age.message}</p>}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="sex" className={errors.sex ? "text-red-500" : ""}>Sex *</Label>
                    <Select
                        onValueChange={(value) => setValue('sex', value as PatientSex, { shouldValidate: true })}
                        defaultValue={sex}
                    >
                        <SelectTrigger id="sex" className={errors.sex ? "border-red-500 focus-visible:ring-red-500 text-left" : "text-left"}>
                            <SelectValue placeholder="Select sex" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Male">Male</SelectItem>
                            <SelectItem value="Female">Female</SelectItem>
                        </SelectContent>
                    </Select>
                    {errors.sex && <p className="text-sm text-red-500">{errors.sex.message}</p>}
                </div>
            </div>

            <div className="space-y-2 flex flex-col">
                <Label htmlFor="visit_date">Visit Date *</Label>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            variant={"outline"}
                            className={`justify-start text-left font-normal ${!visitDate && "text-muted-foreground"}`}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {visitDate ? format(visitDate, "PPP") : <span>Pick a date</span>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            mode="single"
                            selected={visitDate}
                            onSelect={(date) => date && setValue('visit_date', date, { shouldValidate: true })}
                            initialFocus
                        />
                    </PopoverContent>
                </Popover>
                {errors.visit_date && <p className="text-sm text-red-500">{errors.visit_date.message}</p>}
            </div>

            <div className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm mt-6">
                <Checkbox
                    id="consent_given"
                    checked={consentGiven === true}
                    onCheckedChange={(checked) => setValue('consent_given', checked === true, { shouldValidate: true })}
                />
                <div className="space-y-1 leading-none">
                    <Label htmlFor="consent_given" className={errors.consent_given ? "text-red-500" : ""}>
                        Patient Consent Obtained *
                    </Label>
                    <p className="text-sm text-muted-foreground">
                        I confirm that the patient has given explicit consent for AI analysis of their medical images.
                    </p>
                    {errors.consent_given && <p className="text-sm text-red-500 mt-1">{errors.consent_given.message}</p>}
                </div>
            </div>

            <p className="text-xs text-muted-foreground">
                A unique Patient ID will be automatically generated upon registration.
            </p>

            <Button type="submit" className="w-full mt-6" disabled={isSubmitting}>
                {isSubmitting ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Registering...
                    </>
                ) : (
                    "Register Patient"
                )}
            </Button>
        </form>
    );
}

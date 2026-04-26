import * as React from 'react';
import { IdleTimeoutProvider } from '@/components/shared/IdleTimeoutProvider';
import { OnboardingTour } from '@/components/shared/OnboardingTour';
import { DashboardSidebar } from '@/components/dashboard/shared/DashboardSidebar';
import { DashboardHeader } from '@/components/dashboard/shared/DashboardHeader';
import { MobileSidebar } from '@/components/dashboard/shared/MobileSidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="w-full min-h-screen flex text-foreground">
            <DashboardSidebar />

             <div className="flex-1 flex flex-col min-w-0">
                <DashboardHeader />

                <main className="flex-1 bg-transparent">
                    <div className="p-2 sm:p-6 lg:p-8 xl:pr-10 max-w-[1600px] flex flex-col">
                        <IdleTimeoutProvider>
                            <OnboardingTour />
                            {children}
                        </IdleTimeoutProvider>
                    </div>
                </main>
            </div>

            <MobileSidebar />
        </div>
    );
}

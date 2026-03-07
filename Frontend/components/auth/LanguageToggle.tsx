'use client';

import * as React from 'react';
import { Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function LanguageToggle() {
    // In a real implementation this would connect to next-intl or i18next
    const [lang, setLang] = React.useState('en');

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild suppressHydrationWarning>
                <Button variant="ghost" size="icon" aria-label="Toggle language" suppressHydrationWarning>
                    <Languages className="h-5 w-5" suppressHydrationWarning />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setLang('en')} className={lang === 'en' ? 'font-bold' : ''}>
                    English
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLang('am')} className={lang === 'am' ? 'font-bold' : ''}>
                    አማርኛ (Amharic)
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

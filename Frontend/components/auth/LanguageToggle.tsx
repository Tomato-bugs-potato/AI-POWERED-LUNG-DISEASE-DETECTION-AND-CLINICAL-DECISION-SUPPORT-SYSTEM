'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function LanguageToggle() {
    const [lang, setLang] = React.useState('en');
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => setMounted(true), []);

    if (!mounted) {
        return (
            <Button variant="ghost" size="sm" aria-label="Toggle language" className="text-xs font-medium px-2">
                {lang === 'en' ? 'EN' : 'አማ'}
            </Button>
        );
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" aria-label="Toggle language" className="text-xs font-medium px-2">
                    {lang === 'en' ? 'EN' : 'አማ'}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setLang('en')} className={lang === 'en' ? 'font-semibold' : ''}>
                    English
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLang('am')} className={lang === 'am' ? 'font-semibold' : ''}>
                    አማርኛ (Amharic)
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

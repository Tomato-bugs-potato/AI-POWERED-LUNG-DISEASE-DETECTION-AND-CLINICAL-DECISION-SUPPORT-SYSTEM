import { getRequestConfig } from 'next-intl/server';
import { notFound } from 'next/navigation';

const locales = ['en', 'am'];

export default getRequestConfig(async ({ locale }) => {
    if (!locales.includes(locale as any)) notFound();

    const finalLocale = locale || 'en';
    return {
        locale: finalLocale,
        messages: (await import(`./messages/${finalLocale}.json`)).default
    };
});

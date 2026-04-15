import { getRequestConfig } from 'next-intl/server';

export default getRequestConfig(async ({ locale }) => {
  const localeStr = locale === 'en' ? 'en' : 'vi';
  const messages = (await import(`@/locales/${localeStr}/common.json`)).default;
  return {
    messages,
    locale: localeStr,
  };
});

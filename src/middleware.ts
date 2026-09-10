import { defineMiddleware } from 'astro:middleware';
import { defaultLocale, isLocale, type Locale } from '@/i18n/locales';
import { getTranslations } from '@/i18n/messages';
import { cleanPathname } from '@/i18n/paths';

/**
 * Resolve the locale once per render and hand every component the same `t`.
 *
 * Astro runs middleware for prerendered pages at BUILD time — the prerenderer
 * goes through the same app.render() pipeline as an on-demand request — so one
 * middleware covers every static page, both on-demand pages and the API
 * routes, with no prop drilling and no per-component await.
 *
 * Params first, pathname second: src/pages/404.astro has no [locale] segment
 * (only the root /404 is treated as the error page, so it cannot live under
 * one) and neither does /api/*. Both still get a usable `t`.
 */
export const onRequest = defineMiddleware(async (context, next) => {
  const fromParams = context.params.locale;
  const fromPath = cleanPathname(context.url.pathname).split('/')[1];

  const locale: Locale = isLocale(fromParams)
    ? fromParams
    : isLocale(fromPath)
      ? fromPath
      : defaultLocale;

  context.locals.locale = locale;
  context.locals.t = await getTranslations(locale);

  return next();
});

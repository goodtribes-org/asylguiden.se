import type { Core } from '@strapi/strapi';

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Server => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  // Public origin Strapi builds absolute URLs from (admin panel assets, media
  // links, OAuth redirects). Empty is Strapi's own default — derive from the
  // request — which stays correct for local dev and the in-cluster service.
  url: env('PUBLIC_URL', ''),
  // Traefik terminates TLS and forwards plain HTTP. Without this Strapi trusts
  // the connection instead of X-Forwarded-Proto, sees http, and issues http://
  // redirects and non-Secure admin cookies on an https:// site.
  proxy: env.bool('IS_PROXIED', true),
  app: {
    keys: env.array('APP_KEYS'),
  },
});

export default config;

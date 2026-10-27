/** @type {import('next').NextConfig} */
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com", // Next.js needs inline scripts; Turnstile is the optional CAPTCHA
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "frame-src https://challenges.cloudflare.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

// Paths that only scanners and bots ever request. Medbot has no PHP, WordPress or exposed config files,
// so any hit is hostile: it is logged (see /api/trap) and answered with a plain 404.
const PROBE = "(?:wp-admin|wp-login|wp-content|wp-includes|xmlrpc|phpmyadmin|pma|cgi-bin|vendor|administrator|actuator|server-status|\\.git|\\.env|\\.aws|\\.ssh|\\.DS_Store)(?:[/.].*)?";

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async rewrites() {
    return [
      { source: "/:probe(.*\\.php)", destination: "/api/trap?probe=:probe" },
      { source: `/:probe(${PROBE})`, destination: "/api/trap?probe=:probe" },
    ];
  },
  async headers() {
    return [{
      source: "/(.*)",
      headers: [
        { key: "Content-Security-Policy", value: csp },
        { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
        { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=()" },
      ],
    }];
  },
};
export default nextConfig;

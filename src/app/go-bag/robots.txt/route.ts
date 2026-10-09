export function GET() {
  return new Response(`User-agent: *
Allow: /
Disallow: /api/
Disallow: /dashboard
Disallow: /wallet
Disallow: /settings
Disallow: /login
Disallow: /signup
Sitemap: https://prepare.gocreditcardchris.com/sitemap.xml
`, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}

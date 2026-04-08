import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/signup", "/login"],
      disallow: [
        "/dashboard",
        "/best-card",
        "/wallet",
        "/benefits",
        "/keep-or-cancel",
        "/settings",
        "/onboarding",
        "/api/",
      ],
    },
    sitemap: "https://www.creditcardchris.com/sitemap.xml",
  };
}

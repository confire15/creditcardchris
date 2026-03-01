import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/signup", "/login"],
      disallow: [
        "/dashboard",
        "/wallet",
        "/transactions",
        "/goals",
        "/settings",
        "/onboarding",
        "/recommend",
        "/compare",
        "/applications",
        "/insights",
        "/budgets",
        "/subscriptions",
        "/transfer",
        "/chat",
        "/api/",
      ],
    },
    sitemap: "https://www.creditcardchris.com/sitemap.xml",
  };
}

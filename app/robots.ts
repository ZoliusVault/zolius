import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
      },
      {
        userAgent: [
          "GPTBot",
          "ChatGPT-User",
          "ClaudeBot",
          "anthropic-ai",
          "Google-Extended",
          "Googlebot",
          "PerplexityBot",
          "Bytespider",
          "CCBot",
        ],
        allow: "/",
      },
    ],
    sitemap: "https://www.veilpools.tech/sitemap.xml",
  };
}

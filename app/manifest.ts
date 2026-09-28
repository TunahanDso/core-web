import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "YTÜ CORE Portal",
    short_name: "CORE Portal",
    description: "YTÜ CORE internal student engineering operating portal.",
    start_url: "/portal",
    scope: "/portal/",
    display: "standalone",
    background_color: "#f4f5f2",
    theme_color: "#ff6500",
    orientation: "any",
    icons: [
      {
        src: "/portal-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any maskable",
      },
    ],
  };
}

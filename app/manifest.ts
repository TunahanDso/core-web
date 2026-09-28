import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "YTÜ CORE Portal",
    short_name: "CORE Portal",
    description: "YTÜ CORE öğrenci mühendislik çalışma alanı.",
    start_url: "/portal",
    scope: "/portal",
    display: "standalone",
    orientation: "any",
    background_color: "#f4f5f2",
    theme_color: "#111317",
    categories: ["productivity","education","utilities"],
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

import type { MetadataRoute } from "next";

// Lets phones "Add to Home screen" / install the site as an app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Murali ka maal",
    short_name: "Murali ka maal",
    description: "Class DSA practice questions, progress and notes",
    start_url: "/",
    display: "standalone",
    background_color: "#111114",
    theme_color: "#ffa116",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}

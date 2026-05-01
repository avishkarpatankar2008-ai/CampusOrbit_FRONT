/** @type {import('next').NextConfig} */
const nextConfig = {
  // Do NOT silence TS errors — catch them in CI
  // typescript: { ignoreBuildErrors: true }, // REMOVED

  images: {
    remotePatterns: [
      {
        // Cloudinary images (item + lost-found photos)
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
      {
        // Vercel Blob (logo used in layout.tsx)
        protocol: "https",
        hostname: "hebbkx1anhila5yf.public.blob.vercel-storage.com",
        pathname: "/**",
      },
      {
        // Placeholder images shipped with the project
        protocol: "https",
        hostname: "placehold.co",
        pathname: "/**",
      },
    ],
  },

  // Security headers for production
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ]
  },
}

export default nextConfig

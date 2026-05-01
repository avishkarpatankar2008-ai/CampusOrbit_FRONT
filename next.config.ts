/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        // Cloudinary images (item + lost-found photos)
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
      {
        // Placeholder images
        protocol: "https",
        hostname: "placehold.co",
        pathname: "/**",
      },
      // NOTE: hebbkx1anhila5yf.public.blob.vercel-storage.com removed —
      // all CampusOrbit logos are now served from /public locally.
    ],
  },

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

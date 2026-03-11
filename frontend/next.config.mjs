/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost'],
  },
  // Silence harmless warnings in production logs
  logging: {
    fetches: { fullUrl: false },
  },
};

export default nextConfig;

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // Required for Docker
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  },
}

module.exports = nextConfig

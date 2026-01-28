import type { NextConfig } from "next";

const nextConfig: any = {
  /* config options here */
  eslint: {
    // Advertencia: Esto permite que las compilaciones de producción se completen
    // incluso si su proyecto tiene errores de ESLint.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // !! ADVERTENCIA !!
    // Peligrosamente permite que las compilaciones de producción se completen
    // incluso si su proyecto tiene errores de tipo.
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
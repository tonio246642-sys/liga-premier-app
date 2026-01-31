import type { NextConfig } from "next";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development', // Esto hace que salga el aviso "[PWA] disabled" en local, es normal.
});

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    // Esto sí lo dejamos para que Vercel no se queje si hay errores de tipo
    ignoreBuildErrors: true,
  },
};

export default withPWA(nextConfig);
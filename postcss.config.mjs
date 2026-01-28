/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    '@tailwindcss/postcss': {}, // <--- ESTE ES EL CAMBIO CLAVE
    autoprefixer: {},
  },
};

export default config;
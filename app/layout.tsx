import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

// 1. Configuración de Metadatos y PWA
export const metadata: Metadata = {
  title: "Liga Premier",
  description: "Estadísticas y calendario en tiempo real",
  manifest: "/manifest.json", // <--- Conecta el archivo que creamos
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Liga Premier",
  },
  icons: {
    apple: "/icon-192.png", // Icono para iPhone
  },
};

// 2. Configuración Visual (Zoom y Colores)
export const viewport: Viewport = {
  themeColor: "#000000", // Color de la barra de estado en Android
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // IMPORTANTE: Evita que hagan zoom en inputs (sensación nativa)
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}
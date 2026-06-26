import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mister Luka",
  description: "Sistema operativo del restaurante",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            style: { background: '#2B211C', color: '#FBF3E7', borderRadius: '10px' },
            success: { iconTheme: { primary: '#D9A441', secondary: '#2B211C' } },
            error:   { iconTheme: { primary: '#B5402E', secondary: '#FBF3E7' } },
          }}
        />
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { GoogleOAuthProvider } from "@react-oauth/google";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: {
    default: "SnapFind AI — AI-Powered Event Photo Finder",
    template: "%s | SnapFind AI",
  },
  description:
    "Find your photos instantly with AI face recognition. Photographers upload event photos, guests scan their face, and SnapFind AI delivers their photos in seconds.",
  keywords: ["event photos", "face recognition", "AI photo finder", "photographer", "event photography"],
  openGraph: {
    title: "SnapFind AI — AI-Powered Event Photo Finder",
    description: "Find your photos instantly with AI face recognition.",
    type: "website",
    siteName: "SnapFind AI",
  },
  twitter: {
    card: "summary_large_image",
    title: "SnapFind AI — AI-Powered Event Photo Finder",
    description: "Find your photos instantly with AI face recognition.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased`}>
        <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''}>
          <AuthProvider>{children}</AuthProvider>
        </GoogleOAuthProvider>
      </body>
    </html>
  );
}


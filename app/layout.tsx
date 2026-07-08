import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Geist, Geist_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Jawan Investments",
  description: "Family Office Platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en-GB" className={`${geistSans.variable} ${geistMono.variable} h-full`}>
        <body className="min-h-full font-sans antialiased">
          <TooltipProvider>
            {children}
            <Toaster />
          </TooltipProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}

import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { DM_Sans, JetBrains_Mono } from "next/font/google";
import { AppToaster } from "@/components/providers/toaster";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Signage Menu",
  description: "Multi-tenant digital signage dashboard",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`${dmSans.variable} ${jetbrainsMono.variable} h-full antialiased`}
      >
        <body className="min-h-full font-sans text-zinc-900 antialiased">
          {children}
          <AppToaster />
        </body>
      </html>
    </ClerkProvider>
  );
}

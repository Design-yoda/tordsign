import type { Metadata } from "next";
import "./globals.css";
import { AppHeader } from "@/components/app-header";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Tord Sign",
  description: "Lean e-signature MVP for upload, send, sign, and complete.",
  icons: {
    icon: "/Favicon.png",
    shortcut: "/Favicon.png",
    apple: "/Favicon.png"
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={cn("font-sans antialiased")}>
        <AppHeader />
        {children}
      </body>
    </html>
  );
}

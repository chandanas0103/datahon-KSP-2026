import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "KSP Crime Intelligence AI — Karnataka State Police",
  description:
    "Karnataka State Police Datathon 2026: Advanced Tactical Crime Intelligence Command Center powered by Text-to-SQL AI.",
  icons: {
    icon: "/ksp_logo.jpg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="antialiased bg-background text-foreground min-h-screen">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
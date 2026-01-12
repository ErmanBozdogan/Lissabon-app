import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lisbon Trip Planner",
  description: "Private travel planning app for Lisbon trip",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}

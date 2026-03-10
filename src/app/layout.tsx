import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CA Assisted Living Intel | Facility Capacity Dashboard",
  description:
    "California Assisted Living facility intelligence — capacity, locations, and analytics across 1,300+ RCFE facilities.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

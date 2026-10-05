import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "Creative Compliance Hub",
    template: "%s · Creative Compliance Hub",
  },
  description:
    "Pre-publication compliance workflow for marketing creatives at regulated operators.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="min-h-full text-sm">{children}</body>
    </html>
  );
}

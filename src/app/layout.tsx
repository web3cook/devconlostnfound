import type { Metadata } from "next";
import { Suspense } from "react";
import { Poppins } from "next/font/google";
import { Header, HeaderFallback } from "@/components/header";
import { Footer } from "@/components/footer";
import { BRAND } from "@/lib/config";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: { default: `${BRAND.product} · ${BRAND.name}`, template: `%s · ${BRAND.name} ${BRAND.product}` },
  description: `Lost something at ${BRAND.name}? Browse items handed in at the Info Desk, or visit the desk to report a loss.`,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${poppins.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <Suspense fallback={<HeaderFallback />}>
          <Header />
        </Suspense>
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}


import type { Metadata } from "next";
import { Suspense } from "react";
import { Poppins } from "next/font/google";
import { Header, HeaderFallback } from "@/components/header";
import { Footer } from "@/components/footer";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: { default: "Lost & Found · Devcon", template: "%s · Devcon Lost & Found" },
  description:
    "Lost something at Devcon? Browse items handed in at the Info Desk or report what you've lost.",
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


import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { CartProvider } from "@/lib/CartContext";

export const metadata: Metadata = {
  title: "NextJs Blog",
  description: "A blog built with Next.js and Tailwind CSS",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (
    <html lang="en">      
      <body>
        <CartProvider>
          <header>
            <Navigation/>
          </header>

          <main>
            {children}
          </main>
        </CartProvider>
        <Footer/>
      </body>
    </html>
  )
}

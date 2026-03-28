import type { Metadata } from "next";
import { Geist, Geist_Mono, Anton, Lilita_One, Montserrat, League_Spartan, Poppins } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const anton = Anton({
  variable: "--font-anton",
  subsets: ["latin"],
  weight: "400",
});

const lilitaOne = Lilita_One({
  variable: "--font-lilita",
  subsets: ["latin"],
  weight: "400",
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const leagueSpartan = League_Spartan({
  variable: "--font-league",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "600"],
});

export const metadata: Metadata = {
  title: "FacelessFlow AI",
  description: "AI-Powered Faceless Video Generation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} ${anton.variable} ${lilitaOne.variable} ${montserrat.variable} ${leagueSpartan.variable} ${poppins.variable} antialiased`}
      >
        {children}
        <Toaster theme="dark" position="top-center" richColors />
      </body>
    </html>
  );
}

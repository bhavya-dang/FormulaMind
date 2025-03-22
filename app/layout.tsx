import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "./context/ThemeContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "FormulaMind",
  description: "Your AI-powered Formula 1 companion",
  openGraph: {
    title: "FormulaMind",
    description: "FormulaMind | our AI-powered Formula 1 companion",
    url: "https://formulamind.vercel.app",
    siteName: "FormulaMind",
    images: [
      {
        url: "https://github.com/bhavya-dang/my-website/blob/master/public/racecar.svg?raw=true", // Use a valid absolute URL for the image
        width: 800,
        height: 600,
        alt: "f1",
      },
    ],
    locale: "en_IN",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/racecar.svg" sizes="any" />
      </head>
      <body className={inter.className}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}

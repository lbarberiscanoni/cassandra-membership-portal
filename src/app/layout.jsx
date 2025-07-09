import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

/* ------------------ fonts ------------------ */
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/* ------------------ metadata ------------------ */
export const metadata = {
  title: "Cassandra Membership Portal",
  description: "Join and vote on open-source fintech research",
};

/* ------------------ root layout ------------------ */
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {children}
      </body>
    </html>
  );
}

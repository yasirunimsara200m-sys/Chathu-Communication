import { DM_Sans } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";

const sans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
});

export const metadata = {
  title: "Chathu Communication — POS",
  description: "Point of Sale & Retail Management System for Chathu Communication",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${sans.variable} font-sans antialiased bg-ink-950 text-paper-50`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}

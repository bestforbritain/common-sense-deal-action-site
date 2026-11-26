import type { Metadata } from "next";
import { Barlow } from "next/font/google";
import { copy } from "@/content/copy";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import "./globals.css";

// Barlow is licensed under the SIL Open Font Licence; next/font self-hosts it,
// so visitors' browsers never contact Google.
const barlow = Barlow({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: copy.meta.title,
  description: copy.meta.description,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-GB" className={barlow.variable}>
      <body>
        <a className="skip-link" href="#main">
          {copy.skipLink}
        </a>
        <SiteHeader />
        <main id="main">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}

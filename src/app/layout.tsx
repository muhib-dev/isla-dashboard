import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

// Single family for UI, headings, data and IDs. Hierarchy comes from 400/500/600.
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: { default: "ISLA School Hub", template: "%s · ISLA School Hub" },
  description:
    "School profiles, jobs, analytics and billing for ISLA member schools.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${poppins.variable} antialiased`}
    >
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

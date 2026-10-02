import "./globals.css";

export const metadata = {
  title: "LocalEco | Sustainable Shopping Signals",
  description:
    "Compare Google Shopping listings using AI-estimated sustainability evidence.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}

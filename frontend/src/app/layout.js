import "./globals.css";

export const metadata = {
  title: "AI Meeting in ERPNext",
  description: "AI Meeting & ERPNext Task Sync",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}

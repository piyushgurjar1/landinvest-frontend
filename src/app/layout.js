import "./globals.css";

export const metadata = {
  title: "LandInvestAI – AI-Powered Land Due Diligence",
  description:
    "Automated land acquisition due diligence tool. Analyze APNs, evaluate market value, and make data-driven auction bidding decisions.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}

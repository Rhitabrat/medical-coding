import "./globals.css";

export const metadata = {
  title: "Medical Coding Assistant",
  description: "Prototype chat app for ICD code lookup"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
import type { Metadata } from "next";
import { Press_Start_2P, JetBrains_Mono } from "next/font/google";
import { UserProvider } from "./context";
import Nav from "./components/Nav";
import "./globals.css";

const pressStart2P = Press_Start_2P({
  weight: "400",
  variable: "--font-press-start",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Arcade Vault",
  description: "Plataforma online de juegos arcade retro",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${pressStart2P.variable} ${jetbrainsMono.variable}`}>
      <body>
        <div className="av-bg" />
        <div className="av-noise" />
        <div id="root">
          <UserProvider>
            <Nav />
            <main className="av-main">{children}</main>
          </UserProvider>
        </div>
      </body>
    </html>
  );
}

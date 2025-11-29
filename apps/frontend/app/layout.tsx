import { SessionProvider } from "@/components/auth/session-provider";
import { ModalProvider } from "@/components/layout/modal-context";
import { QueryClientProvider } from "@/components/layout/query-client-provider";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { SidebarProvider } from "@/components/ui/sidebar";
import { SettingsModal } from "@/components/auth/settings-modal";
import type { Metadata } from "next";
import localFont from "next/font/local";
import { cookies } from "next/headers";
import { Toaster } from "sonner";
import "./globals.css";

const monumentGrotesk = localFont({
  variable: "--font-monument-sans",
  display: "swap",
  src: [
    {
      path: "./fonts/ABCMonumentGrotesk-Regular-Trial.otf",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/ABCMonumentGrotesk-Medium-Trial.otf",
      weight: "500",
      style: "normal",
    },
    {
      path: "./fonts/ABCMonumentGrotesk-Bold-Trial.otf",
      weight: "700",
      style: "normal",
    },
  ],
});

const monumentGroteskMono = localFont({
  variable: "--font-monument-mono",
  display: "swap",
  src: [
    {
      path: "./fonts/ABCMonumentGroteskMono-Regular-Trial.otf",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/ABCMonumentGroteskMono-Medium-Trial.otf",
      weight: "500",
      style: "normal",
    },
    {
      path: "./fonts/ABCMonumentGroteskMono-Bold-Trial.otf",
      weight: "700",
      style: "normal",
    },
  ],
});

const departureMono = localFont({
  src: "./fonts/DepartureMono-Regular.woff2",
  variable: "--font-departure-mono",
});

const cybertruckFont = localFont({
  src: "./fonts/Cybertruck-Font.ttf",
  variable: "--font-cybertruck",
});

export const metadata: Metadata = {
  title: "Opulent OS",
  description:
    "An open-source background agent and web interface to build, debug, and understand code.",
  icons: {
    icon: [
      {
        url: "/shadow-black.svg",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/shadow.svg",
        media: "(prefers-color-scheme: dark)",
      },
    ],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value === "true";

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${monumentGrotesk.variable} ${monumentGroteskMono.variable} ${departureMono.variable} ${cybertruckFont.variable} overscroll-none antialiased`}
      >
        <QueryClientProvider>
          <ThemeProvider
            attribute="class"
            forcedTheme="dark"
            disableTransitionOnChange
          >
            <SessionProvider>
              <ModalProvider>
                {/* SidebarProvider also provides a TooltipProvider inside */}
                <SidebarProvider defaultOpen={defaultOpen}>
                  {/* Don't render the sidebar here; we have individual layouts for route groups to render different variants of the sidebar */}
                  {children}
                  <SettingsModal />
                  <Toaster />
                </SidebarProvider>
              </ModalProvider>
            </SessionProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </body>
    </html>
  );
}

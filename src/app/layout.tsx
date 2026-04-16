import type { Metadata } from "next";
import { Geist, Geist_Mono, Montserrat } from "next/font/google";
import "./globals.css";
import {
  ClerkProvider,
  Show,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";
import { cn } from "@/src/shadcnui/lib/utils";

const montserrat = Montserrat({ subsets: ["latin"], variable: "--font-sans" });
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Korevel Xenon",
  description: "Korevel Xenon",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isDev = process.env.CLERK_ENABLED === "false";
  console.log(isDev, process.env.CLERK_ENABLED);

  // Define the Header content separately so we can reuse it
  const Header = () => (
    <header className="flex justify-end items-center p-4 gap-4 h-16">
      {isDev ? (
        /* Mock UI for Development */
        <div className="flex gap-4 items-center">
          <span className="text-xs text-orange-500 font-mono">
            [Auth Disabled]
          </span>
          <div
            className="h-8 w-8 rounded-full bg-neutral-200 animate-pulse"
            title="Mock User Button"
          />
        </div>
      ) : (
        /* Real Clerk UI for Production */
        <>
          <Show when="signed-out">
            <SignInButton />
            <SignUpButton>
              <button className="bg-[#6c47ff] text-white rounded-full font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 cursor-pointer">
                Sign Up
              </button>
            </SignUpButton>
          </Show>
          <Show when="signed-in">
            <UserButton />
          </Show>
        </>
      )}
    </header>
  );

  return (
    <html
      lang="en"
      className={cn(
        "h-full",
        "antialiased",
        geistSans.variable,
        geistMono.variable,
        "font-sans",
        montserrat.variable,
      )}
    >
      <body className="min-h-full flex flex-col">
        {isDev ? (
          /* DEV MODE: No ClerkProvider, No Clerk logic */
          <>
            <Header />
            {children}
          </>
        ) : (
          /* PROD/STAGING MODE: Full Clerk integration */
          <ClerkProvider>
            <Header />
            {children}
          </ClerkProvider>
        )}
      </body>
    </html>
  );
}

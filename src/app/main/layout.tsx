import {
  ClerkProvider,
  Show,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isDev = process.env.CLERK_ENABLED === "false";

  const Header = () => (
    <header className="flex justify-end items-center p-4 gap-4 h-16 border-b">
      {isDev ? (
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
        <>
          <Show when="signed-out">
            <div className="flex gap-2">
              <SignInButton />
              <SignUpButton>
                <button className="bg-[#6c47ff] text-white rounded-full font-medium text-sm h-10 px-4 cursor-pointer">
                  Sign Up
                </button>
              </SignUpButton>
            </div>
          </Show>
          <Show when="signed-in">
            <UserButton />
          </Show>
        </>
      )}
    </header>
  );

  const LayoutContent = (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">{children}</main>
    </div>
  );

  if (isDev) {
    return LayoutContent;
  }

  return <ClerkProvider>{LayoutContent}</ClerkProvider>;
}

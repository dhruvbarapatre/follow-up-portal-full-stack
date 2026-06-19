import { useRouter } from "next/router";
import { useSelector } from "react-redux";
import { useEffect, useState } from "react";

const PUBLIC_ROUTES = ["/login", "/sign-up"];

export default function RouteGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const auth = useSelector((s: any) => s.auth);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    // Check authorization on path change or login status change
    authCheck(router.asPath);

    // Hide children content when starting a route change to prevent visual flash of guarded pages
    const hideContent = () => setAuthorized(false);
    router.events.on("routeChangeStart", hideContent);
    router.events.on("routeChangeComplete", authCheck);

    return () => {
      router.events.off("routeChangeStart", hideContent);
      router.events.off("routeChangeComplete", authCheck);
    };
  }, [auth?.isLoggedIn, router.asPath]);

  function authCheck(url: string) {
    const path = url.split("?")[0];
    const isPublic = PUBLIC_ROUTES.includes(path);
    const isLoggedIn = auth?.isLoggedIn;

    if (!isLoggedIn && !isPublic) {
      setAuthorized(false);
      router.push({
        pathname: "/login",
        query: { returnUrl: router.asPath },
      });
    } else if (isLoggedIn && isPublic) {
      // Redirect logged in users away from public pages (like login/signup) to home
      setAuthorized(false);
      router.push("/");
    } else {
      setAuthorized(true);
    }
  }

  // Show a premium dark spinner while checking route authorization status
  if (!authorized) {
    return (
      <div className="min-h-screen w-full bg-zinc-950 flex flex-col items-center justify-center text-white">
        <div className="relative w-12 h-12 flex items-center justify-center">
          <div className="absolute inset-0 border-4 border-zinc-800 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-t-indigo-500 border-r-indigo-500/30 border-b-indigo-500/10 border-l-indigo-500/50 rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

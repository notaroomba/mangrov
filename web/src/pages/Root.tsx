import { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";

import Sidebar from "../components/Sidebar";
import MobileNav from "../components/MobileNav";
import { AnimatePresence } from "motion/react";
import { useAuth } from "../hooks/useAuth";
import { UnreadMessagesProvider } from "../hooks/useUnreadMessages";

export default function Root() {
  const { isSignedIn, pending } = useAuth();

  const location = useLocation();
  const navigate = useNavigate();

  const showSidebar = ![
    "/",
    "/about",
    "/terms-of-service",
    "/privacy-policy",
    "/reset-password",
    "/auth/action",
  ].includes(location.pathname);

  useEffect(() => {
    if (
      !pending &&
      !isSignedIn &&
      ![
        "/",
        "/about",
        "/terms-of-service",
        "/privacy-policy",
        "/reset-password",
        "/auth/action",
      ].includes(location.pathname)
    ) {
      navigate("/");
    }
  }, [isSignedIn, location.pathname, pending]);

  return (
    <UnreadMessagesProvider>
      <div className="min-h-screen font-inter bg-transparent-950 text-white">
        {/* <AnimatePresence>
          {spinnerVisible && location.pathname !== "/" && (
            <GlobalSpinner
              key="global-spinner"
              onDone={() => setSpinnerVisible(false)}
            />
          )}
        </AnimatePresence> */}

        {/* Desktop Sidebar */}
        {showSidebar && (
          <div className="hidden lg:block">
            <Sidebar />
          </div>
        )}

        {/* Mobile Navigation */}
        {showSidebar && (
          <div className="lg:hidden">
            <MobileNav />
          </div>
        )}

        {/* Main Content */}
        <main
          className={`min-h-screen overflow-y-auto ${
            showSidebar ? "lg:pl-20" : ""
          }`}
        >
          <AnimatePresence mode="wait">
            <Outlet key={location.pathname} />
          </AnimatePresence>
        </main>
      </div>
    </UnreadMessagesProvider>
  );
}

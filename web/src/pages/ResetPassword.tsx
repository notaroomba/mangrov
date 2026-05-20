import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";
import { forgetPassword } from "../lib/auth-client";
import { useNavigate } from "react-router";
import PageWrapper from "../components/PageWrapper";
import ImageStrip from "../components/ImageStrip";
import useWindowSize from "../hooks/useWindowSize";

const primaryBtn =
  "bg-primary text-primary-foreground hover:bg-primary/80 cursor-pointer transition-all duration-200 active:scale-95 uppercase tracking-widest font-bold disabled:opacity-40 disabled:cursor-not-allowed py-3 sm:py-2 text-base sm:text-sm w-full rounded-md";
const mutedInput =
  "rounded-md bg-muted px-3 py-3 sm:py-2 text-base sm:text-base outline-none focus:ring-2 ring-primary/80 transition-all duration-200 w-full";

const wrapperAnim = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isValidEmail = (e: string) => emailRegex.test(e);

export default function ResetPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [width, height] = useWindowSize();
  const [stripData] = useState(() => {
    const direction = Math.random() > 0.5 ? "left" : "right";
    const buffer = 200;
    return {
      start: {
        x:
          direction === "left"
            ? -buffer - Math.random() * 200
            : width + buffer + Math.random() * 200,
        y: -buffer,
      },
      end: {
        x:
          direction === "left"
            ? width + buffer + Math.random() * 200
            : -buffer - Math.random() * 200,
        y: height + buffer,
      },
    };
  });

  const handleResetPassword = async () => {
    if (!isValidEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const redirectTo = `${window.location.origin}/auth/action?mode=resetPassword`;
      const { error: apiError } = await forgetPassword({
        email,
        redirectTo,
      });
      if (apiError) {
        setError(apiError.message ?? "Failed to send reset email. Please try again");
      } else {
        setSent(true);
      }
    } catch (err) {
      console.error("Reset password error:", err);
      setError("Failed to send reset email. Please try again");
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    navigate("/");
  };

  return (
    <>
      <PageWrapper className="relative h-screen overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <ImageStrip
            start={stripData.start}
            end={stripData.end}
            speed={12}
            className="absolute bottom-0 left-0 opacity-25 w-full h-screen"
            imgHeightTW="h-32 sm:h-40 md:h-44"
            imgWidthTW="w-44 sm:w-52 md:w-56"
          />
        </div>

        <div className="relative z-10 min-h-screen flex flex-col justify-center px-4 sm:px-6">
          <div className="mx-auto w-full max-w-sm">
            <motion.button
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              onClick={handleBackToLogin}
              className="flex items-center gap-2 text-white/70 hover:text-white transition-colors mb-8 cursor-pointer"
            >
              <ArrowLeft size={20} />
              <span className="text-sm">Back to Sign In</span>
            </motion.button>

            <motion.img
              src="/icon.png"
              alt="logo"
              className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-6"
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, ease: "backOut" }}
            />

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-500/20 text-red-400 text-sm sm:text-base rounded-md px-3 py-2 mb-6"
                role="alert"
              >
                {error}
              </motion.div>
            )}

            {!sent ? (
              <motion.div {...wrapperAnim}>
                <h1 className="text-2xl sm:text-3xl font-extrabold mb-2 text-white text-center">
                  Reset Password
                </h1>
                <p className="text-sm sm:text-base mb-8 text-white/70 text-center">
                  Enter your email address and we'll send you a link to reset
                  your password.
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm sm:text-base text-left mb-2 text-white/80">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail
                        className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50"
                        size={18}
                      />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          setError(null);
                        }}
                        className={`pl-10 ${mutedInput}`}
                        placeholder="you@example.com"
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={handleResetPassword}
                    className={primaryBtn}
                    disabled={!isValidEmail(email) || loading}
                  >
                    {loading ? "Sending..." : "Send Reset Link"}
                  </motion.button>
                </div>

                <div className="mt-6 text-center">
                  <p className="text-xs text-white/50">
                    Remember your password?{" "}
                    <button
                      onClick={handleBackToLogin}
                      className="text-primary hover:text-primary/80 transition-colors cursor-pointer"
                    >
                      Sign in
                    </button>
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div {...wrapperAnim}>
                <div className="text-center">
                  <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="w-8 h-8 text-primary" />
                  </div>

                  <h1 className="text-2xl sm:text-3xl font-extrabold mb-4 text-white">
                    Check Your Email
                  </h1>

                  <p className="text-sm sm:text-base mb-6 text-white/70">
                    We've sent a password reset link to{" "}
                    <span className="text-primary font-semibold">{email}</span>
                  </p>

                  <div className="bg-neutral-900/50 rounded-lg p-4 mb-6">
                    <p className="text-xs text-white/50 leading-relaxed">
                      Click the link in your email to reset your password. If
                      you don't see it, check your spam folder.
                    </p>
                  </div>

                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={handleBackToLogin}
                    className="w-full rounded-md py-3 bg-neutral-800 text-white hover:bg-neutral-700 transition-colors cursor-pointer"
                  >
                    Back to Sign In
                  </motion.button>

                  <div className="mt-4">
                    <button
                      onClick={() => {
                        setSent(false);
                        setEmail("");
                        setError(null);
                      }}
                      className="text-sm text-primary hover:text-primary/80 transition-colors cursor-pointer"
                    >
                      Send to a different email
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </PageWrapper>
    </>
  );
}

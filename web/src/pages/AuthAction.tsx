import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CheckCircle, XCircle, Loader2, ArrowLeft } from "lucide-react";
import { resetPassword, verifyEmail } from "../lib/auth-client";
import { useNavigate, useSearchParams } from "react-router";
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

export default function AuthAction() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [action, setAction] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

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

  useEffect(() => {
    const handleAuthAction = async () => {
      const mode = searchParams.get("mode");
      const token = searchParams.get("token");

      if (!mode || !token) {
        setError("Invalid action link. Please try requesting a new one.");
        setLoading(false);
        return;
      }

      setAction(mode);

      try {
        switch (mode) {
          case "resetPassword":
            setLoading(false);
            break;

          case "verifyEmail": {
            const { error: apiError } = await verifyEmail({ query: { token } });
            if (apiError) {
              setError(apiError.message ?? "Verification failed.");
            } else {
              setSuccess(true);
            }
            setLoading(false);
            break;
          }

          default:
            setError("Unknown action type.");
            setLoading(false);
        }
      } catch (err) {
        console.error("Auth action error:", err);
        setError("An error occurred. Please try again.");
        setLoading(false);
      }
    };

    handleAuthAction();
  }, [searchParams]);

  const handlePasswordReset = async () => {
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = searchParams.get("token");
      if (!token) {
        setError("Invalid reset code.");
        setLoading(false);
        return;
      }
      const { error: apiError } = await resetPassword({
        newPassword,
        token,
      });
      if (apiError) {
        setError(apiError.message ?? "Failed to reset password.");
      } else {
        setSuccess(true);
      }
    } catch (err) {
      console.error("Password reset error:", err);
      setError("Failed to reset password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    navigate("/");
  };

  const getActionTitle = () => {
    switch (action) {
      case "resetPassword":
        return "Reset Password";
      case "verifyEmail":
        return "Verify Email";
      default:
        return "Account Action";
    }
  };

  const getActionDescription = () => {
    switch (action) {
      case "resetPassword":
        return "Enter your new password below.";
      case "verifyEmail":
        return "Your email has been verified successfully!";
      default:
        return "";
    }
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

            {loading ? (
              <motion.div {...wrapperAnim} className="text-center">
                <div className="flex justify-center mb-4">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold mb-2 text-white">
                  Processing...
                </h1>
                <p className="text-sm sm:text-base text-white/70">
                  Please wait while we process your request.
                </p>
              </motion.div>
            ) : error ? (
              <motion.div {...wrapperAnim} className="text-center">
                <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <XCircle className="w-8 h-8 text-red-500" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold mb-4 text-white">
                  Error
                </h1>
                <p className="text-sm sm:text-base mb-6 text-white/70">{error}</p>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleBackToLogin}
                  className="w-full rounded-md py-3 bg-neutral-800 text-white hover:bg-neutral-700 transition-colors cursor-pointer"
                >
                  Back to Sign In
                </motion.button>
              </motion.div>
            ) : success ? (
              <motion.div {...wrapperAnim} className="text-center">
                <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-8 h-8 text-primary" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold mb-4 text-white">
                  Success!
                </h1>
                <p className="text-sm sm:text-base mb-6 text-white/70">
                  {getActionDescription()}
                </p>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleBackToLogin}
                  className="w-full rounded-md py-3 bg-primary text-white hover:bg-primary/80 transition-colors cursor-pointer"
                >
                  Continue to Sign In
                </motion.button>
              </motion.div>
            ) : action === "resetPassword" ? (
              <motion.div {...wrapperAnim}>
                <h1 className="text-2xl sm:text-3xl font-extrabold mb-2 text-white text-center">
                  {getActionTitle()}
                </h1>
                <p className="text-sm sm:text-base mb-6 text-white/70 text-center">
                  {getActionDescription()}
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm sm:text-base text-left mb-2 text-white/80">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        setError(null);
                      }}
                      className={mutedInput}
                      placeholder="••••••••"
                    />
                  </div>

                  <div>
                    <label className="block text-sm sm:text-base text-left mb-2 text-white/80">
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setError(null);
                      }}
                      className={mutedInput}
                      placeholder="••••••••"
                    />
                  </div>

                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={handlePasswordReset}
                    className={primaryBtn}
                    disabled={!newPassword || !confirmPassword || loading}
                  >
                    {loading ? "Resetting..." : "Reset Password"}
                  </motion.button>
                </div>
              </motion.div>
            ) : null}
          </div>
        </div>
      </PageWrapper>
    </>
  );
}

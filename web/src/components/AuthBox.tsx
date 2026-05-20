import { useState } from "react";
import { Mail, ChevronDown, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Select, { components, type StylesConfig } from "react-select";
import countryList from "react-select-country-list";
import type { AuthStageType } from "../utils/types";
import { INTERESTS, LANGUAGES } from "../utils/constants";
import BackButton from "./BackButton";
import GreenSpinner from "./GreenSpinner";
import { authClient } from "../lib/auth-client";
import { useNavigate } from "react-router";
import { useAuth } from "../hooks/useAuth";
import { isValidUsername } from "../utils/helpers";
import { checkUsernameExists } from "../utils/firebaseHelpers";

const primaryBtn =
  "bg-primary text-primary-foreground hover:bg-primary/80 cursor-pointer transition-all duration-200 active:scale-95 uppercase tracking-widest font-bold disabled:opacity-40 disabled:cursor-not-allowed py-3 sm:py-2 text-base sm:text-sm";
const mutedInput =
  "rounded-md bg-muted px-3 py-3 sm:py-2 text-base sm:text-base outline-none focus:ring-2 ring-primary/80 transition-all duration-200 w-full";

const wrapperAnim = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

const darkSelectStyles: StylesConfig = {
  control: (base) => ({
    ...base,
    background: "#1b1b1b",
    border: "none",
    minHeight: "2.6rem",
    cursor: "pointer",
  }),
  singleValue: (b) => ({ ...b, color: "#fff" }),
  input: (b) => ({ ...b, color: "#fff" }),
  placeholder: (b) => ({ ...b, color: "#888" }),
  menu: (b) => ({ ...b, background: "#1b1b1b" }),
  option: (b, s) => ({
    ...b,
    background: s.isFocused ? "#2a2a2a" : "#1b1b1b",
    color: "#fff",
    cursor: "pointer",
  }),
  indicatorSeparator: () => ({ display: "none" }),
};

const DropdownIndicator = (props: any) => (
  <components.DropdownIndicator {...props}>
    <ChevronDown size={18} className="text-muted-foreground" />
  </components.DropdownIndicator>
);

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isValidEmail = (e: string) => emailRegex.test(e);

const isStrongPassword = (password: string) =>
  /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(password);

export default function AuthBox() {
  const navigate = useNavigate();
  const [stage, setStage] = useState<AuthStageType>("email");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [country, setCountry] = useState<{
    label: string;
    value: string;
  } | null>(null);
  const [language, setLanguage] = useState<{
    label: string;
    value: string;
  } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [password, setPassword] = useState("");
  const [isExistingUser, setIsExistingUser] = useState(false);
  const [errors, setErrors] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const emailValid = isValidEmail(email);
  const basicValid =
    name.trim().length > 1 &&
    username.trim().length > 2 &&
    isValidUsername(username) &&
    country &&
    language;
  const interestsValid = selected.size > 0;
  const passwordStrong = isStrongPassword(password);

  const { user, pending } = useAuth();

  const handleSignInChoice = () => {
    if (!emailValid) return setErrors("Please enter a valid email address");
    setIsExistingUser(true);
    setStage("verify");
  };

  const handleSignUpChoice = () => {
    if (!emailValid) return setErrors("Please enter a valid email address");
    setIsExistingUser(false);
    setStage("basic");
  };

  const handleBasicContinue = async () => {
    if (!basicValid) {
      if (!name.trim() || !username.trim() || !country || !language) {
        return setErrors("Fill out all required fields");
      }
      if (!isValidUsername(username)) {
        return setErrors(
          "Username can only contain letters, numbers, and underscores"
        );
      }
      return setErrors("Fill out all required fields");
    }

    const usernameExists = await checkUsernameExists(username);
    if (usernameExists) {
      setErrors("Username already exists. Please choose a different one.");
      return;
    }

    setStage("interests");
  };

  const handleInterestsContinue = () => {
    if (!interestsValid) return setErrors("Select at least one interest");
    setStage("verify");
  };

  const handlePasswordSubmit = async () => {
    if (!passwordStrong)
      return setErrors(
        "Password must be at least 8 characters, include one uppercase, one number, and one special character"
      );

    setSubmitting(true);
    try {
      if (isExistingUser) {
        const { error } = await authClient.signIn.email({ email, password });
        if (error) {
          setErrors(error.message ?? "Authentication failed.");
          return;
        }
      } else {
        const { error } = await authClient.signUp.email({
          email,
          password,
          name,
          username,
          country: country?.value || "",
          language: language?.value || "",
          interests: Array.from(selected),
        } as any);
        if (error) {
          setErrors(error.message ?? "Sign up failed.");
          return;
        }
      }
      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      setErrors("Authentication failed. Please check your credentials.");
    } finally {
      setSubmitting(false);
    }
  };

  const goToDashboard = () => {
    navigate("/dashboard");
  };

  return (
    <div className="mx-auto w-full max-w-sm px-4 py-8 sm:px-6 sm:py-12 text-center">
      <motion.img
        src="/icon.png"
        alt="logo"
        className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-4 sm:mb-6"
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "backOut" }}
      />

      {pending ? (
        <div className="flex justify-center items-center h-24">
          <GreenSpinner />
        </div>
      ) : user ? (
        <motion.div {...wrapperAnim} className="mt-4">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold mb-2 text-white">
            Welcome
          </h2>
          <p className="text-sm sm:text-base mb-6 text-white/70">
            Continue to your <span className="text-primary">dashboard</span>.
          </p>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={goToDashboard}
            className={`w-full rounded-md py-2 ${primaryBtn}`}
          >
            Go to Dashboard
          </motion.button>
        </motion.div>
      ) : (
        <>
          {errors && (
            <div
              className="bg-red-500/20 text-destructive text-sm sm:text-base rounded-md px-3 py-2 mb-4"
              role="alert"
            >
              {errors}
            </div>
          )}

          {stage !== "email" && (
            <BackButton
              onClick={() => {
                if (stage === "basic") {
                  setStage("email");
                } else if (stage === "interests") {
                  setStage("basic");
                } else if (stage === "verify") {
                  setStage(isExistingUser ? "email" : "interests");
                }
              }}
            />
          )}

          <AnimatePresence mode="wait">
            {stage === "email" && (
              <motion.div key="email" {...wrapperAnim}>
                <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold mb-2 text-white">
                  Welcome
                </h2>
                <p className="text-sm sm:text-base mb-6 text-white/70">
                  Enter your <span className="text-primary">email</span> to
                  continue.
                </p>

                <label className="block text-sm sm:text-base text-left mb-1">
                  Email
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
                      setErrors(null);
                    }}
                    className={`pl-10 w-full ${mutedInput}`}
                    placeholder="you@example.com"
                  />
                </div>
                <motion.button
                  onClick={handleSignInChoice}
                  className={`mt-6 w-full rounded-md py-2 ${primaryBtn}`}
                  disabled={!emailValid}
                >
                  Sign in
                </motion.button>
                <motion.button
                  onClick={handleSignUpChoice}
                  className="mt-3 w-full rounded-md py-2 text-sm text-primary hover:text-primary/80 transition-colors cursor-pointer border border-primary/30 hover:bg-primary/10"
                  disabled={!emailValid}
                >
                  Create new account
                </motion.button>
              </motion.div>
            )}

            {stage === "basic" && (
              <motion.div key="basic" {...wrapperAnim}>
                <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold mb-2 text-white">
                  Basic Info
                </h2>
                <p className="text-sm sm:text-base mb-6 text-white/70">
                  Let us get to <span className="text-primary">know</span> you
                  better.
                </p>
                <label className="block text-sm sm:text-base text-left mb-1">
                  Name
                </label>
                <input
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setErrors(null);
                  }}
                  placeholder="John Doe"
                  className={`w-full mb-3 ${mutedInput}`}
                />

                <label className="block text-sm sm:text-base text-left mb-1">
                  Username
                </label>
                <input
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setErrors(null);
                  }}
                  placeholder="johndoe123"
                  className={`w-full mb-3 ${mutedInput} ${
                    username && !isValidUsername(username)
                      ? "border-red-500 focus:border-red-500"
                      : username && isValidUsername(username)
                      ? "border-green-500 focus:border-green-500"
                      : ""
                  }`}
                />
                {username && !isValidUsername(username) && (
                  <p className="text-red-500 text-xs mb-3">
                    Username can only contain letters, numbers, and underscores
                  </p>
                )}
                {!username && (
                  <p className="text-neutral-400 text-xs mb-3">
                    Only letters, numbers, and underscores allowed
                  </p>
                )}

                <label className="block text-sm sm:text-base text-left mb-1">
                  Country
                </label>
                <Select
                  instanceId="country"
                  options={countryList().getData()}
                  value={country}
                  onChange={(v) => {
                    setCountry(v as any);
                    setErrors(null);
                  }}
                  placeholder="Select country"
                  styles={darkSelectStyles}
                  components={{ DropdownIndicator }}
                  className="mb-3 text-left w-full"
                  menuShouldScrollIntoView={false}
                />

                <label className="block text-sm sm:text-base text-left mb-1">
                  Language
                </label>
                <Select
                  instanceId="language"
                  options={LANGUAGES}
                  value={language}
                  onChange={(val) => {
                    setLanguage(val as any);
                    setErrors(null);
                  }}
                  placeholder="Select language"
                  styles={darkSelectStyles}
                  components={{ DropdownIndicator }}
                  className="mb-3 text-left w-full"
                />

                <motion.button
                  onClick={handleBasicContinue}
                  className={`mt-8 w-full rounded-md py-2 ${primaryBtn}`}
                  disabled={!basicValid}
                >
                  Continue
                </motion.button>
              </motion.div>
            )}

            {stage === "interests" && (
              <motion.div key="interests" {...wrapperAnim}>
                <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold mb-2 text-white">
                  Interests
                </h2>
                <p className="text-sm sm:text-base mb-6 text-white/70">
                  These help us{" "}
                  <span className="text-primary">personalize</span> your
                  experience.
                </p>
                <input
                  type="text"
                  placeholder="Search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full mb-4 ${mutedInput}`}
                />
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 max-h-64 sm:max-h-72 overflow-y-auto pr-1">
                  {INTERESTS.filter(({ label }) =>
                    label.toLowerCase().includes(searchTerm.toLowerCase())
                  ).map(({ id, label, img }) => {
                    const isSelected = selected.has(id);
                    return (
                      <div
                        key={id}
                        onClick={() => {
                          setSelected((prev) => {
                            const next = new Set(prev);
                            next.has(id) ? next.delete(id) : next.add(id);
                            return next;
                          });
                          setErrors(null);
                        }}
                        className={`relative cursor-pointer rounded-xl overflow-hidden border-2 ${
                          isSelected ? "border-primary" : "border-transparent"
                        }`}
                      >
                        <img
                          src={img}
                          alt={label}
                          className="w-full h-16 sm:h-20 md:h-24 object-cover"
                        />
                        {isSelected && (
                          <div className="absolute top-1 right-1 bg-primary p-1 rounded-full">
                            <Check size={14} className="text-white" />
                          </div>
                        )}
                        <p className="text-xs sm:text-sm mt-1 sm:mt-2 px-1 pb-2 truncate">
                          {label}
                        </p>
                      </div>
                    );
                  })}
                </div>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleInterestsContinue}
                  className={`w-full rounded-md py-2 mt-6 ${primaryBtn}`}
                  disabled={!interestsValid}
                >
                  Continue
                </motion.button>
              </motion.div>
            )}

            {stage === "verify" && (
              <motion.div key="verify" {...wrapperAnim}>
                <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold mb-2 text-white">
                  {" "}
                  {isExistingUser ? "Enter Password" : "Create Password"}
                </h2>
                <p className="text-sm sm:text-base mb-6 text-white/70">
                  {isExistingUser
                    ? "Welcome back, please enter your password."
                    : "Create a strong password to finish signing up."}
                </p>
                <label className="block text-sm sm:text-base text-left mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrors(null);
                  }}
                  className={`w-full mb-4 ${mutedInput}`}
                  placeholder="••••••••"
                />
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handlePasswordSubmit}
                  className={`w-full rounded-md py-2 ${primaryBtn}`}
                  disabled={!password || submitting}
                >
                  {submitting ? "Working…" : "Continue"}
                </motion.button>
                {isExistingUser && (
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => {
                      navigate("/reset-password");
                    }}
                    className="w-full mt-3 text-sm text-primary hover:text-primary/80 transition-colors cursor-pointer py-2 px-4 rounded-md hover:bg-primary/10 border border-primary/20"
                  >
                    Forgot your password?
                  </motion.button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}

import { useState } from "react";
import { motion } from "framer-motion";
import {
  X,
  ChevronDown,
  Check,
  UploadCloud,
  User as UserIcon,
} from "lucide-react";
import { api, uploadFile } from "../lib/api";
import countryList from "react-select-country-list";
import Select, { components, type StylesConfig } from "react-select";
import { LANGUAGES, INTERESTS } from "../utils/constants";
import GreenSpinner from "./GreenSpinner";
import { isValidUsername } from "../utils/helpers";
import { checkUsernameExists } from "../utils/firebaseHelpers";
import { useAuth } from "../hooks/useAuth";

const primaryBtn =
  "bg-primary text-primary-foreground hover:bg-primary/80 cursor-pointer transition-all duration-200 active:scale-95 uppercase tracking-widest font-bold disabled:opacity-40 disabled:cursor-not-allowed rounded-md";
const mutedInput =
  "rounded-md bg-muted px-3 py-2 text-sm outline-none focus:ring-2 ring-primary/80 transition-all duration-200";

const wrapperAnim = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.9 },
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

export default function EditProfileModal({
  initialData,
  setData,
  onClose,
}: {
  initialData: {
    displayName?: string;
    username?: string;
    country?: any;
    language?: any;
    interests?: string[];
    avatar?: string;
  };
  setData: (data: any) => void;
  onClose: () => void;
}) {
  const [displayName, setDisplayName] = useState(
    initialData?.displayName || ""
  );
  const [username, setUsername] = useState(initialData?.username || "");
  const [country, setCountry] = useState(initialData?.country || null);
  const [language, setLanguage] = useState(initialData?.language || null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selected, setSelected] = useState(
    new Set(initialData?.interests || [])
  );
  const [avatar, setAvatar] = useState(initialData?.avatar || "");
  const [errors, setErrors] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const { user, refresh } = useAuth();

  const handleSubmit = async () => {
    if (!displayName.trim()) return setErrors("Name is required");
    if (!username.trim()) return setErrors("Username is required");
    if (username.trim().length < 3)
      return setErrors("Username must be at least 3 characters");
    if (!isValidUsername(username))
      return setErrors(
        "Username can only contain letters, numbers, and underscores"
      );

    setLoading(true);
    if (!user) {
      setErrors("You must be logged in.");
      setLoading(false);
      return;
    }

    const usernameExists = await checkUsernameExists(username, user.uid);
    if (usernameExists) {
      setErrors("Username already exists. Please choose a different one.");
      setLoading(false);
      return;
    }

    let photoURL = avatar;
    if (pendingFile) {
      const { publicUrl } = await uploadFile(pendingFile, "avatar");
      photoURL = publicUrl;
    }

    const payload = {
      name: displayName,
      username,
      avatar: photoURL,
      country: country?.value || initialData.country || null,
      language: language?.value || initialData.language || null,
      interests: Array.from(selected),
    };

    try {
      await api.patch("/api/users/me", payload);
      setData({ ...payload, displayName });
      await refresh();
    } catch (err) {
      console.error(err);
      setErrors("Failed to update profile. Please try again.");
      setLoading(false);
      return;
    }

    setLoading(false);
    onClose();
  };

  const handleImageUpload = (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setAvatar(reader.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <motion.div
      {...wrapperAnim}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6"
    >
      <motion.div
        key="modal"
        {...wrapperAnim}
        transition={{ duration: 0.25 }}
        className="bg-neutral-900 text-white w-full max-w-2xl rounded-xl relative p-5 sm:p-6 h-full flex flex-col"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 cursor-pointer hover:bg-neutral-800 p-2 rounded-xl transition-colors"
        >
          <X size={24} />
        </button>

        <h2 className="text-2xl font-bold mb-1 text-primary">Edit Profile</h2>
        <p className="text-sm mb-4 text-muted-foreground">
          Update your profile information.
        </p>

        <div className="flex items-center gap-4 mb-5">
          <label htmlFor="avatar" className="relative cursor-pointer shrink-0">
            {avatar ? (
              <img
                src={avatar}
                className="w-16 h-16 rounded-full object-cover border"
                alt="Avatar"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center border">
                <UserIcon className="text-muted-foreground" size={28} />
              </div>
            )}
            <div className="absolute bottom-0 right-0 p-1 bg-primary rounded-full">
              <UploadCloud size={14} />
            </div>
            <input
              id="avatar"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
          </label>
          <input
            className={`${mutedInput} w-full`}
            value={displayName}
            onChange={(e) => {
              setDisplayName(e.target.value);
              setErrors(null);
            }}
            placeholder="Your name"
          />
        </div>

        <div className="mb-5">
          <label className="block text-sm mb-1">Username</label>
          <input
            className={`${mutedInput} w-full ${
              username && !isValidUsername(username)
                ? "border-red-500 focus:border-red-500"
                : username && isValidUsername(username)
                ? "border-green-500 focus:border-green-500"
                : ""
            }`}
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              setErrors(null);
            }}
            placeholder="johndoe123"
          />
          {username && !isValidUsername(username) && (
            <p className="text-red-500 text-xs mt-1">
              Username can only contain letters, numbers, and underscores
            </p>
          )}
          {!username && (
            <p className="text-neutral-400 text-xs mt-1">
              Only letters, numbers, and underscores allowed
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          <div>
            <label className="block text-sm mb-1">Country</label>
            <Select
              instanceId="country"
              options={countryList().getData()}
              value={
                typeof country === "string"
                  ? countryList()
                      .getData()
                      .find((c) => c.value === initialData.country)
                  : country
              }
              onChange={(v) => {
                setCountry(v as any);
                setErrors(null);
              }}
              placeholder="Select country"
              styles={darkSelectStyles}
              components={{ DropdownIndicator }}
              menuShouldScrollIntoView={false}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Language</label>
            <Select
              instanceId="language"
              options={LANGUAGES}
              value={
                typeof language === "string"
                  ? LANGUAGES.find((l) => l.value === initialData.language)
                  : language
              }
              onChange={(val) => {
                setLanguage(val as any);
                setErrors(null);
              }}
              placeholder="Select language"
              styles={darkSelectStyles}
              components={{ DropdownIndicator }}
              menuShouldScrollIntoView={false}
            />
          </div>
        </div>

        <h3 className="text-xl font-semibold mb-1">Interests</h3>
        <p className="text-sm mb-3">
          These help us <span className="text-primary">personalize</span> your
          experience.
        </p>

        <input
          type="text"
          placeholder="Search interests"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={`w-full mb-3 ${mutedInput}`}
        />

        <div className="flex-grow overflow-y-auto pr-1 mb-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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
                    className="w-full h-20 object-cover"
                  />
                  {isSelected && (
                    <div className="absolute top-1 right-1 bg-primary p-1 rounded-full">
                      <Check size={14} className="text-white" />
                    </div>
                  )}
                  <p className="text-xs mt-2 px-1 pb-2 truncate text-center">
                    {label}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {errors && <p className="text-red-500 text-sm mb-3">{errors}</p>}

        <div className="flex justify-center">
          {loading ? (
            <GreenSpinner />
          ) : (
            <button
              onClick={handleSubmit}
              className={`${primaryBtn} px-6 py-2 text-sm`}
              disabled={loading}
            >
              Save Changes
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

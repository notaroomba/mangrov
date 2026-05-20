import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeftRight, PlusCircle } from "lucide-react";
import PageWrapper from "../components/PageWrapper";
import ImageStrip from "../components/ImageStrip";
import useWindowSize from "../hooks/useWindowSize";
import AddBox from "../components/AddBox";
import MobileNav from "../components/MobileNav";

const wrapperAnim = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

const OPTIONS: Array<{
  id: "post" | "trade";
  title: string;
  blurb: string;
  Icon: typeof PlusCircle;
}> = [
  {
    id: "post",
    title: "ADD POST",
    blurb: "List a product in the store — title, photos, price, and quantity.",
    Icon: PlusCircle,
  },
  {
    id: "trade",
    title: "ADD TRADE",
    blurb: "Offer an item for barter — match with someone who wants to swap.",
    Icon: ArrowLeftRight,
  },
];

export default function AddPage() {
  const [stage, setStage] = useState<"select" | "form">("select");
  const [type, setType] = useState<"post" | "trade" | null>(null);

  const buffer = 200;
  const [width, height] = useWindowSize();

  const randomX = (direction: "left" | "right", which: "start" | "end") => {
    if (direction === "left") {
      return which === "start"
        ? -buffer - Math.random() * 200
        : width + buffer + Math.random() * 200;
    }
    return which === "start"
      ? width + buffer + Math.random() * 200
      : -buffer - Math.random() * 200;
  };

  const [stripData, setStripData] = useState(() => {
    const direction = Math.random() > 0.5 ? "left" : "right";
    return {
      start: { x: randomX(direction, "start"), y: -buffer },
      end: { x: randomX(direction, "end"), y: height + buffer },
    };
  });

  const handlePickType = (id: "post" | "trade") => {
    setType(id);
    setStage("form");
  };

  const handleHoverOption = (id: "post" | "trade") => {
    const direction = id === "post" ? "left" : "right";
    setStripData({
      start: { x: randomX(direction, "start"), y: -buffer },
      end: { x: randomX(direction, "end"), y: height + buffer },
    });
  };

  // AddBox calls setStage("select") on success — also reset type so the picker
  // shows fresh next time.
  const setStageFromBox = (next: "select" | "form") => {
    setStage(next);
    if (next === "select") setType(null);
  };

  return (
    <>
      <PageWrapper className="relative h-screen overflow-hidden">
        <AnimatePresence mode="wait">
          {stage === "select" && (
            <motion.div
              key="select"
              {...wrapperAnim}
              className="flex flex-col md:flex-row items-stretch justify-center h-screen p-6 gap-6 text-white"
            >
              {OPTIONS.map(({ id, title, blurb, Icon }) => (
                <button
                  key={id}
                  onMouseEnter={() => handleHoverOption(id)}
                  onClick={() => handlePickType(id)}
                  className="flex-1 rounded-2xl bg-neutral-900 hover:bg-neutral-800 transition hover:border-primary border-2 border-transparent cursor-pointer flex flex-col items-center justify-center gap-4 px-6 py-12 hover:scale-[1.02] duration-300"
                >
                  <Icon className="w-12 h-12 text-primary" />
                  <div className="text-3xl md:text-4xl font-bold tracking-wide">
                    {title}
                  </div>
                  <p className="text-sm md:text-base text-neutral-400 max-w-xs text-center">
                    {blurb}
                  </p>
                </button>
              ))}
            </motion.div>
          )}

          {stage === "form" && type && (
            <AddBox key="form" type={type} setStage={setStageFromBox} />
          )}
        </AnimatePresence>
      </PageWrapper>

      <div className="lg:hidden">
        <MobileNav />
      </div>

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
    </>
  );
}

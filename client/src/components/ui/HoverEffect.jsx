import React, { useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "../../utils/cn";

export const HoverEffect = ({ items, className }) => {
  let [hoveredIndex, setHoveredIndex] = useState(null);

  return (
    <div className={cn("grid grid-cols-1 sm:grid-cols-2 gap-5", className)}>
      {items.map((item, idx) => (
        <Link
          to={item?.link}
          key={item?.link}
          className="relative group block p-1 h-full w-full"
          onMouseEnter={() => setHoveredIndex(idx)}
          onMouseLeave={() => setHoveredIndex(null)}
        >
          <AnimatePresence>
            {hoveredIndex === idx && (
              <motion.span
                className="absolute inset-0 h-full w-full bg-indigo-500/[0.08] block rounded-2xl border border-indigo-500/20"
                layoutId="hoverBackground"
                initial={{ opacity: 0 }}
                animate={{
                  opacity: 1,
                  transition: { duration: 0.15 },
                }}
                exit={{
                  opacity: 0,
                  transition: { duration: 0.15, delay: 0.2 },
                }}
              />
            )}
          </AnimatePresence>
          <Card className={item.color}>
            <div className="space-y-4">
              <div className="inline-block p-3 rounded-xl bg-gray-900/60 border border-gray-850 relative z-30">
                {item.icon}
              </div>
              <CardTitle>{item.title}</CardTitle>
              <CardDescription>{item.description}</CardDescription>
            </div>
            <div className="mt-6 inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-gray-900 hover:bg-gray-850 border border-gray-800 text-sm font-semibold text-gray-300 hover:text-white transition w-full relative z-30">
              {item.btnText}
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
};

export const Card = ({ className, children }) => {
  return (
    <div
      className={cn(
        "rounded-2xl h-full w-full p-6 overflow-hidden glass border border-gray-800/80 shadow-md relative z-20 transition duration-300 flex flex-col justify-between bg-gradient-to-br",
        className
      )}
    >
      {children}
    </div>
  );
};

export const CardTitle = ({ className, children }) => {
  return (
    <h3 className={cn("text-lg font-bold text-gray-100 tracking-wide mt-4", className)}>
      {children}
    </h3>
  );
};

export const CardDescription = ({ className, children }) => {
  return (
    <p className={cn("mt-2 text-sm text-gray-450 leading-relaxed", className)}>
      {children}
    </p>
  );
};

export default HoverEffect;

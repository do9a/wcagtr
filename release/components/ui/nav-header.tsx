"use client";

import React, { useRef, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type CursorPosition = {
  left: number;
  width: number;
  opacity: number;
};

type NavItem = {
  label: string;
  href: string;
};

type NavHeaderProps = {
  items?: NavItem[];
  className?: string;
};

const adminPanelUrl =
  process.env.NEXT_PUBLIC_ADMIN_PANEL_URL ?? "https://admin.wcagtr.com";
const customerPanelUrl =
  process.env.NEXT_PUBLIC_CUSTOMER_PANEL_URL ?? "https://customer.wcagtr.com";

const defaultItems: NavItem[] = [
  { label: "Home", href: "#" },
  { label: "Özellikler", href: "#features" },
  { label: "Admin Giriş", href: adminPanelUrl },
  { label: "Customer Giriş", href: customerPanelUrl },
  { label: "İletişim", href: "#contact" },
];

function NavHeader({ items = defaultItems, className }: NavHeaderProps) {
  const [position, setPosition] = useState<CursorPosition>({
    left: 0,
    width: 0,
    opacity: 0,
  });
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  return (
    <ul
      className={cn(
        "relative mx-auto flex w-fit flex-wrap justify-center rounded-full border border-border bg-background/80 p-1 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/70",
        className,
      )}
      onMouseLeave={() => {
        setPosition((pv) => ({ ...pv, opacity: 0 }));
        setActiveIndex(null);
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setPosition((pv) => ({ ...pv, opacity: 0 }));
          setActiveIndex(null);
        }
      }}
    >
      {items.map((item, index) => (
        <Tab
          key={item.label}
          href={item.href}
          isActive={activeIndex === index}
          onActivate={() => setActiveIndex(index)}
          setPosition={setPosition}
        >
          {item.label}
        </Tab>
      ))}

      <Cursor position={position} />
    </ul>
  );
}

type TabProps = {
  children: React.ReactNode;
  href: string;
  isActive: boolean;
  onActivate: () => void;
  setPosition: React.Dispatch<React.SetStateAction<CursorPosition>>;
};

const Tab = ({ children, href, isActive, onActivate, setPosition }: TabProps) => {
  const ref = useRef<HTMLLIElement>(null);

  const updatePosition = () => {
    if (!ref.current) return;
    onActivate();

    const { width } = ref.current.getBoundingClientRect();
    setPosition({
      width,
      opacity: 1,
      left: ref.current.offsetLeft,
    });
  };

  return (
    <li
      ref={ref}
      onMouseEnter={updatePosition}
      onFocus={updatePosition}
      className="relative z-10"
    >
      <a
        href={href}
        className={cn(
          "relative block cursor-pointer rounded-full px-3 py-1.5 text-xs uppercase transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 md:px-5 md:py-3 md:text-sm",
          isActive
            ? "text-background"
            : "text-foreground/80 hover:text-foreground focus-visible:text-foreground",
        )}
      >
        {children}
      </a>
    </li>
  );
};

const Cursor = ({ position }: { position: CursorPosition }) => {
  return (
    <motion.li
      animate={position}
      transition={{ type: "spring", stiffness: 360, damping: 30 }}
      className="pointer-events-none absolute z-0 h-7 rounded-full bg-foreground md:h-12"
    />
  );
};

export default NavHeader;

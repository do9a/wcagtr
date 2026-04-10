"use client";

import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";

type SubMenuItem = {
  label: string;
  description: string;
  icon: React.ElementType;
  href?: string;
};

type SubMenu = {
  title: string;
  items: SubMenuItem[];
};

type NavItem = {
  id: number;
  label: string;
  subMenus?: SubMenu[];
  link?: string;
};

type Props = {
  navItems: NavItem[];
  loginHref?: string;
};

export function DropdownNavigation({ navItems, loginHref = "/giris" }: Props) {
  const [openMenu, setOpenMenu] = React.useState<string | null>(null);
  const [isHover, setIsHover] = useState<number | null>(null);

  const handleHover = (menuLabel: string | null) => {
    setOpenMenu(menuLabel);
  };

  return (
    <nav aria-label="Ana navigasyon" className="w-full">
      <div className="mx-auto flex w-full items-center justify-between rounded-2xl border border-border bg-background/80 p-2 shadow-sm backdrop-blur">
        <ul className="relative flex flex-wrap items-center gap-1">
          {navItems.map((navItem) => (
            <li
              key={navItem.label}
              className="relative"
              onMouseEnter={() => handleHover(navItem.subMenus ? navItem.label : null)}
              onMouseLeave={() => handleHover(null)}
              onFocus={() => handleHover(navItem.subMenus ? navItem.label : null)}
              onBlur={(event) => {
                if (
                  !event.currentTarget.contains(event.relatedTarget as Node | null)
                ) {
                  handleHover(null);
                }
              }}
            >
              {navItem.subMenus ? (
                <button
                  type="button"
                  className="relative z-10 flex cursor-pointer items-center justify-center gap-1 rounded-full px-4 py-2 text-sm text-muted-foreground transition-colors duration-300 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                  onMouseEnter={() => setIsHover(navItem.id)}
                  onMouseLeave={() => setIsHover(null)}
                  onFocus={() => setIsHover(navItem.id)}
                  onBlur={() => setIsHover(null)}
                  aria-expanded={openMenu === navItem.label}
                >
                  <span>{navItem.label}</span>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform duration-300 ${
                      openMenu === navItem.label ? "rotate-180" : ""
                    }`}
                  />
                  {(isHover === navItem.id || openMenu === navItem.label) && (
                    <motion.span
                      layoutId="hover-bg"
                      className="absolute inset-0 -z-10 size-full bg-primary/10"
                      style={{ borderRadius: 999 }}
                    />
                  )}
                </button>
              ) : (
                <a
                  href={navItem.link ?? "#"}
                  className="relative z-10 flex cursor-pointer items-center justify-center gap-1 rounded-full px-4 py-2 text-sm text-muted-foreground transition-colors duration-300 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                  onMouseEnter={() => setIsHover(navItem.id)}
                  onMouseLeave={() => setIsHover(null)}
                  onFocus={() => setIsHover(navItem.id)}
                  onBlur={() => setIsHover(null)}
                >
                  <span>{navItem.label}</span>
                  {isHover === navItem.id && (
                    <motion.span
                      layoutId="hover-bg"
                      className="absolute inset-0 -z-10 size-full bg-primary/10"
                      style={{ borderRadius: 999 }}
                    />
                  )}
                </a>
              )}

              <AnimatePresence>
                {openMenu === navItem.label && navItem.subMenus && (
                  <div className="absolute left-0 top-full z-40 w-auto pt-2">
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.98 }}
                      transition={{ duration: 0.18 }}
                      className="w-max rounded-2xl border border-border bg-background p-4 shadow-lg"
                    >
                      <div className="flex w-fit shrink-0 space-x-9 overflow-hidden">
                        {navItem.subMenus.map((sub) => (
                          <motion.div layout className="w-full" key={sub.title}>
                            <h3 className="mb-4 text-sm font-medium capitalize text-muted-foreground">
                              {sub.title}
                            </h3>
                            <ul className="space-y-5">
                              {sub.items.map((item) => {
                                const Icon = item.icon;
                                return (
                                  <li key={item.label}>
                                    <a
                                      href={item.href ?? "#"}
                                      className="group flex items-start space-x-3 rounded-lg p-1"
                                    >
                                      <div className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border text-foreground transition-colors duration-300 group-hover:bg-accent group-hover:text-accent-foreground">
                                        <Icon className="h-5 w-5 flex-none" />
                                      </div>
                                      <div className="w-max leading-5">
                                        <p className="text-sm font-medium text-foreground">
                                          {item.label}
                                        </p>
                                        <p className="text-xs text-muted-foreground transition-colors duration-300 group-hover:text-foreground">
                                          {item.description}
                                        </p>
                                      </div>
                                    </a>
                                  </li>
                                );
                              })}
                            </ul>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </li>
          ))}
        </ul>

        <a
          href={loginHref}
          className="rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background transition-colors hover:bg-foreground/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
        >
          Giriş
        </a>
      </div>
    </nav>
  );
}

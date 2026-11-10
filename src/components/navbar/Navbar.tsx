"use client";

import Container from "../Container";
import Logo from "./Logo";
import Search from "./Search";
import UserMenu from "./UserMenu";
import { ThemeToggle } from "./ThemeToggle";
import type { CurrentUser } from "@/actions/getCurrentUser";

interface NavbarProps {
  currentUser?: CurrentUser | null;
}

const Navbar: React.FC<NavbarProps> = ({ currentUser }) => {
  return (
    <div className="fixed w-full bg-white/80 dark:bg-slate-950/80 backdrop-blur-md z-10 shadow-sm border-b border-slate-200 dark:border-slate-800 transition-colors duration-300">
      <div className="py-3">
        <Container>
          <div className="flex flex-row items-center justify-between gap-3 md:gap-0">
            <Logo />
            <Search />
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <UserMenu currentUser={currentUser} />
            </div>
          </div>
        </Container>
      </div>
    </div>
  );
};

export default Navbar;

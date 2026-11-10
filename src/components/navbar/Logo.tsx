"use client";

import { useRouter } from "next/navigation";

const Logo = () => {
  const router = useRouter();

  return (
    <div
      onClick={() => router.push("/")}
      className="flex items-center cursor-pointer transition-opacity hover:opacity-80"
    >
      <img
        alt="Tracal Logo"
        className="w-auto h-8 md:h-12 object-contain shrink-0"
        src="/logo.png"
      />
      <span className="hidden sm:block ml-2 font-bold text-xl md:text-2xl text-[var(--primary)] tracking-wide">Tracal</span>
    </div>
  );
};

export default Logo;

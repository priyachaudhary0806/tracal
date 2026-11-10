"use client";

import Container from "../Container";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Waves,       // Beach
  Mountain,    // Mountain
  Building2,   // City
  TreePine,    // Village
} from "lucide-react";

export const categories = [
  {
    label: "Beach",
    icon: Waves,
    description: "This property is near the beach or coastal area!",
  },
  {
    label: "Mountain",
    icon: Mountain,
    description: "This property is in the mountains or hill station!",
  },
  {
    label: "City",
    icon: Building2,
    description: "This property is in an urban city area!",
  },
  {
    label: "Village",
    icon: TreePine,
    description: "This property is in a rural village or countryside!",
  },
];

const Categories = () => {
  const params = useSearchParams();
  const category = params?.get("category");
  const pathname = usePathname();

  const isMainPage = pathname === "/";
  if (!isMainPage) {
    return null;
  }

  return (
    <Container>
      <div className="pt-4 flex flex-row items-center justify-between overflow-x-auto gap-2">
        {categories.map((item) => (
          <div
            key={item.label}
            className={`flex flex-col items-center justify-center gap-2 p-3 border-b-2 hover:text-slate-800 dark:hover:text-slate-200 transition cursor-pointer min-w-[80px]
              ${
                category === item.label
                  ? "border-[var(--primary)] text-[var(--primary)]"
                  : "border-transparent text-slate-500"
              }
            `}
            onClick={() => {
              const url = new URL(window.location.href);
              if (category === item.label) {
                url.searchParams.delete("category");
              } else {
                url.searchParams.set("category", item.label);
              }
              window.location.href = url.pathname + url.search;
            }}
          >
            <item.icon size={26} strokeWidth={1.5} />
            <div className="font-medium text-sm whitespace-nowrap">{item.label}</div>
          </div>
        ))}
      </div>
    </Container>
  );
};

export default Categories;

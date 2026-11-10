"use client";

import { Search as SearchIcon } from "lucide-react";

const Search = () => {
  return (
    <div
      className="border-[1px] border-slate-200 dark:border-slate-700 flex-1 max-w-[160px] sm:max-w-none sm:flex-initial md:w-auto py-2 rounded-full shadow-sm hover:shadow-md transition cursor-pointer bg-white dark:bg-slate-900"
    >
      <div className="flex flex-row items-center justify-between">
        <div className="text-sm font-semibold px-3 sm:px-6 text-slate-800 dark:text-slate-200 truncate">
          Anywhere
        </div>
        <div className="hidden sm:block text-sm font-semibold px-6 border-x-[1px] border-slate-200 dark:border-slate-700 flex-1 text-center text-slate-800 dark:text-slate-200">
          Any Week
        </div>
        <div className="text-sm pl-3 sm:pl-6 pr-2 text-slate-500 dark:text-slate-400 flex flex-row items-center gap-3 shrink-0">
          <div className="hidden sm:block">Add Guests</div>
          <div className="p-2 justify-center flex bg-rose-500 rounded-full text-white">
            <SearchIcon size={14} strokeWidth={3} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Search;

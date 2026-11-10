"use client";

interface MenuItemProps {
  onClick: () => void;
  label: string;
}

const MenuItem: React.FC<MenuItemProps> = ({ onClick, label }) => {
  return (
    <div
      onClick={onClick}
      className="px-4 py-3 hover:bg-slate-100 dark:hover:bg-slate-800 transition font-semibold text-slate-800 dark:text-slate-200"
    >
      {label}
    </div>
  );
};

export default MenuItem;

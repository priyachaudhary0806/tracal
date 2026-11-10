import { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color?: string;
  sub?: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon: Icon, color = "text-purple-600", sub }) => (
  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col gap-3">
    <div className="flex items-center justify-between">
      <span className="text-sm font-semibold text-neutral-500">{label}</span>
      <Icon size={18} className={color} />
    </div>
    <div className="text-3xl font-extrabold text-slate-800 dark:text-slate-200">
      {typeof value === "number" ? value.toLocaleString("en-IN") : value}
    </div>
    {sub && <div className="text-xs text-neutral-400">{sub}</div>}
  </div>
);

export default StatCard;

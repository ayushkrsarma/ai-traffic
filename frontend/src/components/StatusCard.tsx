import { LucideIcon } from 'lucide-react';
import { cn } from '../utils/cn';

interface StatusCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  color?: 'blue' | 'green' | 'red' | 'purple';
  theme?: 'dark' | 'light';
}

const StatusCard = ({ title, value, icon: Icon, trend, trendUp, color = 'blue', theme = 'dark' }: StatusCardProps) => {
  const colors = {
    blue: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
    green: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
    red: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
    purple: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
  };

  return (
    <div className="glass-card p-5 flex flex-col gap-3 relative overflow-hidden group transition-all duration-300">
      <div className={cn(
        "absolute top-0 left-0 w-1 h-full opacity-50",
        color === 'blue' ? "bg-blue-500" : color === 'green' ? "bg-emerald-500" : color === 'purple' ? "bg-purple-500" : "bg-rose-500"
      )} />
      <div className="flex justify-between items-start">
        <div className={cn("p-2 rounded-lg border", colors[color])}>
          <Icon className="w-5 h-5" />
        </div>
        {trend && (
          <span className={cn(
            "text-xs font-bold px-2 py-0.5 rounded-full border",
            trendUp 
                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" 
                : "bg-rose-500/10 text-rose-600 border-rose-500/20"
          )}>
            {trend}
          </span>
        )}
      </div>
      <div>
        <h3 className={cn(
            "text-sm font-semibold tracking-wide uppercase text-[10px]",
            theme === 'dark' ? "text-zinc-500" : "text-zinc-400"
        )}>{title}</h3>
        <p className={cn(
            "text-2xl font-bold mt-1 font-mono tracking-tight",
            theme === 'dark' ? "text-white" : "text-zinc-900"
        )}>{value}</p>
      </div>
      <div className="absolute -right-4 -bottom-4 opacity-[0.05] group-hover:scale-110 transition-transform">
        <Icon size={80} />
      </div>
    </div>
  );
};

export default StatusCard;

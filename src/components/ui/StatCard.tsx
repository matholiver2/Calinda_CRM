import { Card } from "@/components/ui/Card";
import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  icon: Icon,
  color = "#DC2626",
  hint,
}: {
  label: string;
  value: React.ReactNode;
  icon: LucideIcon;
  color?: string;
  hint?: string;
}) {
  return (
    <Card accentColor={color} className="p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-fg-muted">{label}</p>
          <p className="mt-1.5 text-2xl font-bold tracking-tight text-fg">{value}</p>
          {hint && <p className="mt-1 text-xs text-fg-subtle">{hint}</p>}
        </div>
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${color}1f`, color }}
        >
          <Icon className="h-4.5 w-4.5" />
        </div>
      </div>
    </Card>
  );
}

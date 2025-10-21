import { Badge } from "@/components/ui/badge";
import { Status } from "@prisma/client";
import { cn } from "@/lib/utils";

const statusColors: Partial<Record<Status, string>> = {
  [Status.NEW]: "bg-slate-200 text-slate-900",
  [Status.CONFIRMED]: "bg-blue-100 text-blue-900",
  [Status.CUTTING]: "bg-amber-100 text-amber-900",
  [Status.SEWING]: "bg-amber-200 text-amber-950",
  [Status.EMBROIDERY]: "bg-purple-100 text-purple-900",
  [Status.PRESSING]: "bg-emerald-100 text-emerald-900",
  [Status.QC]: "bg-cyan-100 text-cyan-900",
  [Status.DISPATCHED]: "bg-indigo-100 text-indigo-900",
  [Status.AT_BRANCH]: "bg-sky-100 text-sky-900",
  [Status.FITTING]: "bg-teal-100 text-teal-900",
  [Status.ALTERATION]: "bg-rose-100 text-rose-900",
  [Status.READY_FOR_PICKUP]: "bg-lime-100 text-lime-900",
  [Status.DELIVERED]: "bg-green-200 text-green-900",
  [Status.CLOSED]: "bg-slate-300 text-slate-900",
};

type StatusPillProps = {
  status: Status;
  className?: string;
};

export function StatusPill({ status, className }: StatusPillProps) {
  return (
    <Badge className={cn("rounded-full px-3 py-1 text-xs font-semibold", statusColors[status], className)}>
      {status.replace(/_/g, " ")}
    </Badge>
  );
}

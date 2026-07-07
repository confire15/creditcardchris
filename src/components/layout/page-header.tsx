import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type PageHeaderProps = {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("mb-8 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between", className)}>
      <div className="min-w-0">
        <h1 className="text-page-title">{title}</h1>
        {description && <div className="mt-2 text-sm text-muted-foreground sm:text-base">{description}</div>}
      </div>
      {actions && (
        <div className="flex flex-row items-center gap-2 sm:flex-shrink-0 sm:justify-end">
          {actions}
        </div>
      )}
    </div>
  );
}

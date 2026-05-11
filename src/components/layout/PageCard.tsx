import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageCardProps {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function PageHeader({ title, description, actions }: Omit<PageCardProps, "children">) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          <span className="bg-gradient-primary bg-clip-text text-transparent">{title}</span>
        </h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function PageCard({ title, description, actions, children, className }: PageCardProps) {
  return (
    <section className={cn("glass rounded-2xl p-5 shadow-soft transition-base sm:p-6", className)}>
      {(title || actions) && (
        <header className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {title && <h2 className="text-lg font-semibold">{title}</h2>}
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

export function EmptyStudent() {
  return (
    <div className="glass rounded-2xl p-10 text-center shadow-soft">
      <p className="text-lg font-semibold">Belum ada siswa aktif</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Tambahkan siswa lewat tombol <kbd className="rounded bg-muted px-1.5">+</kbd> di kanan atas.
      </p>
    </div>
  );
}

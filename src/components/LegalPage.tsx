import { Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";

export function LegalPage({
  title,
  updated,
  sections,
}: {
  title: string;
  updated: string;
  sections: { heading: string; body: string }[];
}) {
  return (
    <main className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/90 px-4 py-3 backdrop-blur">
        <Link to="/" className="-ml-2 flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary" aria-label="Go back">
          <ChevronLeft className="size-5" />
        </Link>
        <h1 className="text-lg font-semibold">{title}</h1>
      </header>
      <div className="mx-auto max-w-lg px-5 py-6">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{updated}</p>
        <div className="mt-6 space-y-6">
          {sections.map((s) => (
            <section key={s.heading}>
              <h2 className="text-sm font-semibold">{s.heading}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}

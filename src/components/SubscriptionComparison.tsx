import { BarChart3, BookOpen, Check, FlaskConical, Trophy, X } from "lucide-react";

export function SubscriptionComparison() {
  return (
    <section aria-label="Plan comparison" className="space-y-4 border-t pt-6">
      <div><h2 className="text-xl tracking-normal">What changes when you upgrade?</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">The practice tools are shared. The paid differences are ad-free access and your level of support.</p></div>
      <table className="w-full table-fixed text-left text-xs">
        <caption className="sr-only">Compare Free, Basic, Pro and Elite features</caption>
        <thead><tr className="border-b"><th className="w-[36%] py-3 font-medium text-muted-foreground">Included</th>{["Free", "Basic", "Pro", "Elite"].map(t => <th key={t} className="py-3 text-center font-semibold">{t}</th>)}</tr></thead>
        <tbody>
          {["Practice tools", "Learning & challenges", "Stats & progress"].map(label => <tr key={label} className="border-b"><th className="py-3 pr-2 font-normal leading-relaxed">{label}</th>{[0, 1, 2, 3].map(i => <td key={i} className="py-3 text-center"><Check className="mx-auto size-4 text-bull" aria-label="Included" /></td>)}</tr>)}
          <tr className="border-b"><th className="py-3 pr-2 font-normal">Ad-free</th>{[false, false, true, true].map((included, i) => <td key={i} className="py-3 text-center">{included ? <Check className="mx-auto size-4 text-bull" aria-label="Included" /> : <X className="mx-auto size-4 text-muted-foreground" aria-label="Not included" />}</td>)}</tr>
          <tr className="border-b"><th className="py-3 pr-2 font-normal">Paid support</th>{["None", "Basic", "Higher", "Highest"].map(t => <td key={t} className="py-3 text-center text-[10px]">{t}</td>)}</tr>
        </tbody>
      </table>
      <div className="space-y-4 pt-2">
        <h3 className="text-sm tracking-normal">Your shared practice toolkit</h3>
        {[
          { Icon: BookOpen, name: "Trade Journal & Practice Center", text: "Record your trade reasoning, review weekly summaries and track practice streaks and milestones." },
          { Icon: FlaskConical, name: "Strategy Lab", text: "Write your entry, exit and risk rules and review simulated trades linked to your strategies." },
          { Icon: BarChart3, name: "Performance analytics", text: "Review results over time, risk habits, buy versus sell performance and your best and worst symbols." },
          { Icon: Trophy, name: "Challenges & progress", text: "Take part in available challenges and work towards XP, levels and milestones through practice." },
        ].map(({ Icon, name, text }) => <div key={name} className="flex items-start gap-3"><Icon className="mt-1 size-5 shrink-0 text-primary" /><div><p className="text-sm font-semibold">{name}</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{text}</p></div></div>)}
        <p className="text-xs font-medium text-primary">Available on Free, Basic, Pro and Elite.</p>
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">Subscriptions do not increase analysis limits, add virtual funds or guarantee trading results. Existing usage limits still apply.</p>
    </section>
  );
}
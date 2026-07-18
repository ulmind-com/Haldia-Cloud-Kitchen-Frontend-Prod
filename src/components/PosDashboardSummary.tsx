import { useQuery } from "@tanstack/react-query";
import { posApi } from "@/api/axios";
import { Store, Globe, Receipt, Loader2, User } from "lucide-react";

const money = (n: number) => `₹${(n || 0).toFixed(2)}`;
const todayRange = () => {
  const d = new Date(); d.setHours(0, 0, 0, 0);
  return { from: d.toISOString(), to: new Date().toISOString() };
};

type Report = {
  offline: {
    totalSales: number; billCount: number;
    bills: { billNumber: string; tableName: string; total: number; paymentMethod: string; settledBy: string; settledAt: string }[];
  };
  online: { totalSales: number; orderCount: number };
};

// Offline POS summary + settled-bill feed for the main dashboard (today).
const PosDashboardSummary = () => {
  const { data, isLoading } = useQuery<Report>({
    queryKey: ["pos-report", "dashboard-today"],
    queryFn: async () => (await posApi.getReport(todayRange())).data,
  });

  const online = data?.online.totalSales || 0;
  const offline = data?.offline.totalSales || 0;
  const combined = online + offline;
  const bills = data?.offline.bills?.slice().reverse() || [];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-foreground">Today · Online vs Offline</h3>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-primary"><Store className="h-4 w-4" /> Offline (POS)</div>
          <p className="mt-2 text-2xl font-black text-foreground">{money(offline)}</p>
          <p className="text-xs text-muted-foreground">{data?.offline.billCount || 0} settled bills</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground"><Globe className="h-4 w-4" /> Online (App)</div>
          <p className="mt-2 text-2xl font-black text-foreground">{money(online)}</p>
          <p className="text-xs text-muted-foreground">{data?.online.orderCount || 0} orders</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground"><Receipt className="h-4 w-4" /> Combined</div>
          <p className="mt-2 text-2xl font-black text-foreground">{money(combined)}</p>
          <p className="text-xs text-muted-foreground">total sales today</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <h4 className="mb-3 flex items-center gap-2 font-bold text-foreground"><Receipt className="h-4 w-4 text-primary" /> Settled Offline Bills (today)</h4>
        {isLoading ? (
          <div className="flex justify-center py-8 text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…</div>
        ) : bills.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No offline bills settled today yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="pb-2">Bill</th><th className="pb-2">Table</th><th className="pb-2">Date &amp; Time</th>
                  <th className="pb-2">Payment</th><th className="pb-2">Settled by</th><th className="pb-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {bills.map((b) => (
                  <tr key={b.billNumber} className="border-b border-border/50">
                    <td className="py-2 font-medium text-foreground">{b.billNumber}</td>
                    <td className="py-2">{b.tableName}</td>
                    <td className="py-2 text-muted-foreground">{b.settledAt ? new Date(b.settledAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                    <td className="py-2"><span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold">{b.paymentMethod}</span></td>
                    <td className="py-2"><span className="inline-flex items-center gap-1"><User className="h-3 w-3 text-muted-foreground" /> {b.settledBy || "—"}</span></td>
                    <td className="py-2 text-right font-semibold text-foreground">{money(b.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default PosDashboardSummary;

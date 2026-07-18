import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { menuApi, posApi } from "@/api/axios";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  ChefHat, Search, Plus, Minus, Trash2, Printer, Pencil, X, Loader2,
  ClipboardList, Utensils, CheckCircle2,
} from "lucide-react";

type Variant = { name: string; price: number };
type Product = { _id: string; name: string; variants: Variant[]; category?: { name: string }; isAvailable?: boolean };
type TableT = { _id: string; name: string; status: string; category?: { name: string } };
type TicketItem = { product: string; name: string; variant: string; price: number; quantity: number };
type Kot = {
  _id: string; kotNumber: string; notes?: string; createdAt: string;
  table: { _id: string; name: string; category?: { name: string } } | null;
  createdBy?: { name: string; role: string };
  items: TicketItem[];
};

const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow transition-all hover:brightness-110 disabled:opacity-50";
const keyOf = (p: string, v: string) => `${p}__${v}`;

// ── Kitchen ticket print (NO prices) ──
const printKot = (kot: Kot) => {
  const rows = kot.items
    .map(
      (it) =>
        `<tr><td class="q">${it.quantity} ×</td><td class="n">${it.name}${
          it.variant && it.variant !== "Standard" ? ` <small>(${it.variant})</small>` : ""
        }</td></tr>`
    )
    .join("");
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${kot.kotNumber}</title>
  <style>
    * { font-family: 'Courier New', monospace; }
    body { width: 280px; margin: 0 auto; padding: 8px; color:#000; }
    h2,h3 { text-align:center; margin:2px 0; }
    .muted { text-align:center; font-size:12px; }
    hr { border:none; border-top:1px dashed #000; margin:8px 0; }
    table { width:100%; border-collapse:collapse; }
    td { padding:3px 0; vertical-align:top; font-size:15px; }
    td.q { width:42px; font-weight:bold; }
    td.n { font-weight:bold; }
    small { font-weight:normal; }
    .notes { font-size:13px; margin-top:6px; }
  </style></head><body>
    <h2>KITCHEN ORDER</h2>
    <h3>${kot.kotNumber}</h3>
    <div class="muted">Table: <b>${kot.table?.name || "-"}</b>${kot.table?.category?.name ? " · " + kot.table.category.name : ""}</div>
    <div class="muted">${new Date(kot.createdAt).toLocaleString("en-IN")}</div>
    ${kot.createdBy?.name ? `<div class="muted">By: ${kot.createdBy.name}</div>` : ""}
    <hr/>
    <table>${rows}</table>
    ${kot.notes ? `<hr/><div class="notes"><b>Notes:</b> ${kot.notes}</div>` : ""}
    <hr/>
    <div class="muted">*** Kitchen Copy ***</div>
    <script>window.onload=function(){window.print();setTimeout(function(){window.close();},300);}</script>
  </body></html>`;
  const w = window.open("", "_blank", "width=340,height=600");
  if (!w) { toast.error("Please allow pop-ups to print the KOT"); return; }
  w.document.write(html);
  w.document.close();
};

const KotTerminal = () => {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"new" | "open">("new");
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("All");

  const [tableId, setTableId] = useState("");
  const [items, setItems] = useState<Record<string, TicketItem>>({});
  const [notes, setNotes] = useState("");
  const [editingKot, setEditingKot] = useState<Kot | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: menu = [], isLoading: menuLoading } = useQuery<Product[]>({
    queryKey: ["menu-all"],
    queryFn: async () => (await menuApi.getMenu()).data,
  });
  const { data: tables = [] } = useQuery<TableT[]>({
    queryKey: ["pos-tables"],
    queryFn: async () => (await posApi.getTables()).data,
  });
  const { data: openKots = [], isLoading: kotsLoading } = useQuery<Kot[]>({
    queryKey: ["pos-kots"],
    queryFn: async () => (await posApi.getKots({ status: "open" })).data,
  });

  const categories = useMemo(() => {
    const s = new Set<string>();
    menu.forEach((m) => m.category?.name && s.add(m.category.name));
    return ["All", ...Array.from(s)];
  }, [menu]);

  const filteredMenu = useMemo(
    () =>
      menu.filter(
        (m) =>
          (cat === "All" || m.category?.name === cat) &&
          m.name.toLowerCase().includes(search.toLowerCase())
      ),
    [menu, cat, search]
  );

  const availableTables = tables.filter((t) => t.status === "available");
  const ticket = Object.values(items);
  const totalQty = ticket.reduce((s, i) => s + i.quantity, 0);

  const addItem = (p: Product, variant: Variant | null) => {
    const vName = variant?.name || "Standard";
    const price = variant?.price ?? 0;
    const k = keyOf(p._id, vName);
    setItems((prev) => {
      const existing = prev[k];
      return {
        ...prev,
        [k]: existing
          ? { ...existing, quantity: existing.quantity + 1 }
          : { product: p._id, name: p.name, variant: vName, price, quantity: 1 },
      };
    });
  };
  const changeQty = (k: string, delta: number) => {
    setItems((prev) => {
      const it = prev[k];
      if (!it) return prev;
      const q = it.quantity + delta;
      if (q <= 0) { const cp = { ...prev }; delete cp[k]; return cp; }
      return { ...prev, [k]: { ...it, quantity: q } };
    });
  };

  const resetTicket = () => {
    setItems({}); setNotes(""); setTableId(""); setEditingKot(null);
  };

  const startEdit = (kot: Kot) => {
    const map: Record<string, TicketItem> = {};
    kot.items.forEach((it) => { map[keyOf(it.product, it.variant)] = { ...it }; });
    setItems(map);
    setNotes(kot.notes || "");
    setTableId(kot.table?._id || "");
    setEditingKot(kot);
    setTab("new");
  };

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["pos-kots"] });
    qc.invalidateQueries({ queryKey: ["pos-tables"] });
  };

  const submit = async () => {
    if (!editingKot && !tableId) { toast.error("Select a table first"); return; }
    if (ticket.length === 0) { toast.error("Add at least one item"); return; }
    setSaving(true);
    try {
      const payloadItems = ticket.map((i) => ({ product: i.product, variant: i.variant, quantity: i.quantity }));
      if (editingKot) {
        const res = await posApi.updateKot(editingKot._id, { items: payloadItems, notes });
        toast.success("KOT updated");
        printKot(res.data);
      } else {
        const res = await posApi.createKot({ tableId, items: payloadItems, notes });
        toast.success("KOT created 🍳");
        printKot(res.data);
      }
      resetTicket();
      refresh();
      setTab("open");
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Could not save KOT");
    } finally {
      setSaving(false);
    }
  };

  const del = async (kot: Kot) => {
    if (!confirm(`Delete ${kot.kotNumber} and free ${kot.table?.name || "the table"}?`)) return;
    try {
      await posApi.deleteKot(kot._id);
      toast.success("KOT deleted, table freed");
      refresh();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Could not delete KOT");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
          <ChefHat className="h-6 w-6 text-primary" /> KOT Terminal
        </h1>
        <div className="inline-flex rounded-xl border border-border bg-card p-1 text-sm font-semibold">
          <button onClick={() => setTab("new")} className={`rounded-lg px-4 py-1.5 ${tab === "new" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
            {editingKot ? "Edit KOT" : "New KOT"}
          </button>
          <button onClick={() => setTab("open")} className={`rounded-lg px-4 py-1.5 ${tab === "open" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
            Open KOTs ({openKots.length})
          </button>
        </div>
      </div>

      {tab === "new" ? (
        <div className="grid gap-5 lg:grid-cols-3">
          {/* Menu picker */}
          <div className="lg:col-span-2 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products…"
                className="w-full rounded-xl border border-border bg-background py-3 pl-10 pr-4 text-sm outline-none focus:border-primary" />
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <button key={c} onClick={() => setCat(c)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${cat === c ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-foreground"}`}>
                  {c}
                </button>
              ))}
            </div>
            {menuLoading ? (
              <div className="flex justify-center py-16 text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading menu…</div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {filteredMenu.map((p) => {
                  const multi = (p.variants?.length || 0) > 1;
                  return (
                    <div key={p._id} className="rounded-xl border border-border bg-card p-3">
                      <div className="font-bold text-foreground">{p.name}</div>
                      {multi ? (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {p.variants.map((v) => (
                            <button key={v.name} onClick={() => addItem(p, v)}
                              className="rounded-lg border border-primary/40 bg-primary/5 px-2 py-1 text-[11px] font-semibold text-primary hover:bg-primary/10">
                              + {v.name}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <button onClick={() => addItem(p, p.variants?.[0] || null)} className={btnPrimary + " mt-2 w-full py-1.5 text-xs"}>
                          <Plus className="h-3.5 w-3.5" /> Add
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Ticket builder */}
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-bold text-foreground"><Utensils className="h-4 w-4 text-primary" /> {editingKot ? editingKot.kotNumber : "New Ticket"}</h2>
              {(ticket.length > 0 || editingKot) && (
                <button onClick={resetTicket} className="text-xs font-semibold text-muted-foreground hover:text-foreground">Reset</button>
              )}
            </div>

            {editingKot ? (
              <div className="mb-3 rounded-lg bg-primary/10 px-3 py-2 text-xs font-medium text-primary">
                Table: {editingKot.table?.name} (locked while editing)
              </div>
            ) : (
              <select value={tableId} onChange={(e) => setTableId(e.target.value)}
                className="mb-3 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary">
                <option value="">Select an available table…</option>
                {availableTables.map((t) => (
                  <option key={t._id} value={t._id}>{t.name}{t.category?.name ? ` · ${t.category.name}` : ""}</option>
                ))}
              </select>
            )}
            {!editingKot && availableTables.length === 0 && (
              <p className="mb-3 text-xs text-amber-600">No available tables. Free/clean a table first.</p>
            )}

            {ticket.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">No items yet. Tap products to add.</div>
            ) : (
              <div className="space-y-2">
                {ticket.map((it) => (
                  <div key={keyOf(it.product, it.variant)} className="flex items-center justify-between gap-2 rounded-lg border border-border px-2.5 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{it.name}</p>
                      {it.variant !== "Standard" && <p className="text-[11px] text-muted-foreground">{it.variant}</p>}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => changeQty(keyOf(it.product, it.variant), -1)} className="rounded-md border border-border p-1 hover:bg-muted"><Minus className="h-3.5 w-3.5" /></button>
                      <span className="w-6 text-center text-sm font-bold">{it.quantity}</span>
                      <button onClick={() => changeQty(keyOf(it.product, it.variant), 1)} className="rounded-md border border-border p-1 hover:bg-muted"><Plus className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes for kitchen (optional)…" rows={2}
              className="mt-3 w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />

            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total items</span>
              <span className="font-bold text-foreground">{totalQty}</span>
            </div>
            <button onClick={submit} disabled={saving} className={btnPrimary + " mt-3 w-full"}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
              {editingKot ? "Update & Print KOT" : "Create & Print KOT"}
            </button>
          </div>
        </div>
      ) : (
        // Open KOTs list
        <div>
          {kotsLoading ? (
            <div className="flex justify-center py-16 text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…</div>
          ) : openKots.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border py-16 text-center">
              <ClipboardList className="mx-auto h-10 w-10 text-muted-foreground/50" />
              <p className="mt-3 text-sm text-muted-foreground">No open KOTs. Create one from the New KOT tab.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {openKots.map((kot) => (
                <motion.div key={kot._id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground">{kot.kotNumber}</span>
                    <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[11px] font-semibold text-red-600">
                      {kot.table?.name || "—"}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {kot.table?.category?.name} · {new Date(kot.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                    {kot.createdBy?.name ? ` · ${kot.createdBy.name}` : ""}
                  </p>
                  <div className="mt-2 space-y-1 border-t border-border pt-2 text-sm">
                    {kot.items.map((it, i) => (
                      <div key={i} className="flex justify-between text-foreground">
                        <span className="truncate">{it.name}{it.variant !== "Standard" ? ` (${it.variant})` : ""}</span>
                        <span className="font-bold">×{it.quantity}</span>
                      </div>
                    ))}
                  </div>
                  {kot.notes && <p className="mt-2 rounded bg-muted px-2 py-1 text-[11px] text-muted-foreground">📝 {kot.notes}</p>}
                  <div className="mt-3 flex gap-1.5">
                    <button onClick={() => printKot(kot)} className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg border border-border py-1.5 text-xs font-semibold hover:bg-muted"><Printer className="h-3.5 w-3.5" /> Print</button>
                    <button onClick={() => startEdit(kot)} className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg border border-border py-1.5 text-xs font-semibold hover:bg-muted"><Pencil className="h-3.5 w-3.5" /> Edit</button>
                    <button onClick={() => del(kot)} className="inline-flex items-center justify-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-500/10"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default KotTerminal;

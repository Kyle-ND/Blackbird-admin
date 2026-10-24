import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus, Pencil, Trash2, Clock, Scissors, Tag, RotateCcw, FolderCog, Check, X as XIcon } from "lucide-react";
import { api, money, toSastDateKey } from "../../lib/api";
import { S, Modal, Toggle, groupByCategory, ListSkeleton } from "./ui";

const emptyForm = {
  name: "", category_id: "", newCategory: "", duration_minutes: "", price: "", description: "",
  is_active: true, promo_on: false, promo_price: "", promo_start: "", promo_end: "",
};

function promoLabel(s) {
  if (!s.promo_price) return null;
  const end = s.promo_end ? new Date(s.promo_end).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Africa/Johannesburg" }) : null;
  const start = s.promo_start ? new Date(s.promo_start).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Africa/Johannesburg" }) : null;
  if (s.is_on_promo) return `Promo R${money(s.promo_price)}${end ? ` until ${end}` : ""}`;
  if (s.promo_start && new Date(s.promo_start) > new Date()) return `Promo R${money(s.promo_price)} from ${start}`;
  return `Promo ended`;
}

const toDateInput = (iso) => (iso ? toSastDateKey(new Date(iso)) : "");

export default function ServicesManager({ showToast, onChanged }) {
  // Keep callbacks in refs so `load` stays stable (parents pass inline arrows).
  const callbacks = useRef({ showToast, onChanged });
  callbacks.current = { showToast, onChanged };
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [editing, setEditing] = useState(null); // null | "new" | service
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [showCategories, setShowCategories] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [svc, cats] = await Promise.all([api("/services/?include_inactive=true"), api("/categories/")]);
      setServices(svc);
      setCategories(cats);
      callbacks.current.onChanged?.(svc.filter((s) => s.is_active), cats);
    } catch (err) {
      callbacks.current.showToast("error", err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const visible = useMemo(() => services.filter((s) => showArchived || s.is_active), [services, showArchived]);
  const grouped = useMemo(() => groupByCategory(visible), [visible]);
  const archivedCount = services.filter((s) => !s.is_active).length;

  const openNew = () => {
    setForm({ ...emptyForm, category_id: categories[0]?.id || "" });
    setEditing("new");
  };

  const openEdit = (s) => {
    setForm({
      name: s.name, category_id: s.category_id || "", newCategory: "", duration_minutes: String(s.duration_minutes), price: money(s.price),
      description: s.description || "", is_active: s.is_active, promo_on: !!s.promo_price, promo_price: s.promo_price ? money(s.promo_price) : "",
      promo_start: toDateInput(s.promo_start), promo_end: toDateInput(s.promo_end),
    });
    setEditing(s);
  };

  const save = async (e) => {
    e?.preventDefault?.();
    const name = form.name.trim();
    const duration = parseInt(form.duration_minutes, 10);
    const price = parseFloat(form.price);
    if (!name) return showToast("error", "Service name is required");
    if (!form.category_id && !form.newCategory.trim()) return showToast("error", "Choose or create a category");
    if (Number.isNaN(duration) || duration <= 0) return showToast("error", "Duration must be a positive number of minutes");
    if (Number.isNaN(price) || price < 0) return showToast("error", "Enter a valid price");

    const payload = { name, duration_minutes: duration, price, description: form.description.trim() || null, is_active: form.is_active };
    if (form.category_id === "__new__" || (!form.category_id && form.newCategory.trim())) payload.category = form.newCategory.trim();
    else payload.category_id = form.category_id;

    if (form.promo_on) {
      const promo = parseFloat(form.promo_price);
      if (Number.isNaN(promo) || promo <= 0) return showToast("error", "Enter the promo price");
      if (promo >= price) return showToast("error", "Promo price must be lower than the regular price");
      payload.promo_price = promo;
      payload.promo_start = form.promo_start || null;
      payload.promo_end = form.promo_end || null;
    } else if (editing !== "new" && editing?.promo_price) {
      payload.clear_promo = true;
    }

    setSaving(true);
    try {
      if (editing === "new") {
        await api("/services/", { method: "POST", body: payload });
        showToast("success", "Service created");
      } else {
        await api(`/services/${editing.id}`, { method: "PATCH", body: payload });
        showToast("success", "Service updated");
      }
      setEditing(null);
      await load();
    } catch (err) {
      showToast("error", err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (s) => {
    try {
      const res = await api(`/services/${s.id}`, { method: "DELETE" });
      showToast("success", res.archived ? `"${s.name}" archived (it has booking history)` : `"${s.name}" deleted`);
      setConfirmDelete(null);
      await load();
    } catch (err) {
      showToast("error", err.message);
    }
  };

  const restore = async (s) => {
    try {
      await api(`/services/${s.id}`, { method: "PATCH", body: { is_active: true } });
      showToast("success", `"${s.name}" restored`);
      await load();
    } catch (err) {
      showToast("error", err.message);
    }
  };

  const endPromo = async (s) => {
    try {
      await api(`/services/${s.id}`, { method: "PATCH", body: { clear_promo: true } });
      showToast("success", "Promotion ended");
      await load();
    } catch (err) {
      showToast("error", err.message);
    }
  };

  return (
    <div className="space-y-6" data-testid="services-manager">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm text-muted cursor-pointer">
          <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} className="accent-plum" />
          Show archived {archivedCount ? `(${archivedCount})` : ""}
        </label>
        <div className="flex gap-2">
          <button onClick={() => setShowCategories(true)} className={`${S.btnSmall} ${S.btnSmallGold} px-4 py-2.5`} data-testid="manage-categories">
            <FolderCog className="w-4 h-4" /> Categories
          </button>
          <button onClick={openNew} className={S.btnTop} data-testid="add-service">
            <Plus className="w-4 h-4" /> Add Service
          </button>
        </div>
      </div>

      {loading ? (
        <div className="pt-2"><ListSkeleton rows={4} height="h-20" /></div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="text-center py-20">
          <Scissors className="w-10 h-10 text-bronze mx-auto mb-3" />
          <p className="text-muted text-sm">No services yet</p>
          <button onClick={openNew} className="mt-3 text-xs font-medium text-plum">+ Add your first service</button>
        </div>
      ) : (
        Object.entries(grouped).map(([category, items]) => (
          <div key={category}>
            <div className="flex items-center gap-3 mb-3">
              <p className={S.sectionTitle}>{category}</p>
              <div className="flex-1 h-px bg-gold/15" />
              <span className="text-[10px] text-bark/30 font-medium">{items.length} {items.length === 1 ? "service" : "services"}</span>
            </div>
            <div className="space-y-2">
              {items.map((s) => {
                const promo = promoLabel(s);
                return (
                  <div key={s.id} data-testid="service-row" data-service-name={s.name}
                    className={`${S.statCard} rounded-xl overflow-hidden ${s.is_active ? "" : "opacity-60"}`}>
                    <div className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 hover:bg-white/80 transition-all">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-plum/8 border border-plum/10 flex items-center justify-center flex-shrink-0">
                          <Scissors className="w-4 h-4 text-plum" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-ink flex items-center gap-2 flex-wrap">
                            {s.name}
                            {!s.is_active && <span className="text-[10px] px-2 py-0.5 rounded-full bg-bark/10 text-bark">Archived</span>}
                            {promo && (
                              <span className={`text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 ${s.is_on_promo ? "bg-plum/10 text-plum border border-plum/20" : "bg-gold/10 text-bark"}`}>
                                <Tag className="w-3 h-3" /> {promo}
                              </span>
                            )}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-muted">
                            <Clock className="w-3 h-3 text-bark/30" /> {s.duration_minutes} min
                            {s.description && <span className="truncate max-w-[280px]">· {s.description}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          {s.is_on_promo ? (
                            <>
                              <p className="font-semibold text-plum text-base" data-testid="service-price">R{money(s.effective_price)}</p>
                              <p className="text-xs line-through text-muted">R{money(s.price)}</p>
                            </>
                          ) : (
                            <p className="font-semibold text-bronze text-base" data-testid="service-price">R{money(s.price)}</p>
                          )}
                        </div>
                        {s.is_on_promo && (
                          <button onClick={() => endPromo(s)} className={`${S.btnSmall} ${S.btnSmallGold}`} title="End promotion now">End promo</button>
                        )}
                        {s.is_active ? (
                          <>
                            <button onClick={() => openEdit(s)} className={`${S.btnSmall} ${S.btnSmallPurple}`} data-testid="service-edit">
                              <Pencil className="w-3 h-3" /> Edit
                            </button>
                            <button onClick={() => setConfirmDelete(s)} className={`${S.btnSmall} ${S.btnSmallRed}`} data-testid="service-delete" title="Delete" aria-label={`Delete ${s.name}`}>
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </>
                        ) : (
                          <button onClick={() => restore(s)} className={`${S.btnSmall} ${S.btnSmallGreen}`}>
                            <RotateCcw className="w-3 h-3" /> Restore
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}

      {/* ── Add / edit modal ── */}
      {editing && (
        <Modal title={editing === "new" ? "Add Service" : `Edit ${editing.name}`} onClose={() => setEditing(null)} width="max-w-lg" testId="service-modal">
          <form onSubmit={save} className="space-y-4">
            <div>
              <label className={S.label} htmlFor="svc-name">Service name</label>
              <input id="svc-name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className={S.input} placeholder="e.g. Gel Manicure" />
            </div>
            <div>
              <label className={S.label} htmlFor="svc-category">Category</label>
              <select id="svc-category" value={form.category_id} onChange={(e) => setForm((p) => ({ ...p, category_id: e.target.value }))} className={S.input}>
                <option value="">Select a category…</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                <option value="__new__">+ New category…</option>
              </select>
              {form.category_id === "__new__" && (
                <input value={form.newCategory} onChange={(e) => setForm((p) => ({ ...p, newCategory: e.target.value }))} className={`${S.input} mt-2`} placeholder="New category name" autoFocus />
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={S.label} htmlFor="svc-price">Price (R)</label>
                <input id="svc-price" type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))} className={S.input} placeholder="350.00" />
              </div>
              <div>
                <label className={S.label} htmlFor="svc-duration">Duration (min)</label>
                <input id="svc-duration" type="number" min="5" step="5" value={form.duration_minutes} onChange={(e) => setForm((p) => ({ ...p, duration_minutes: e.target.value }))} className={S.input} placeholder="60" />
              </div>
            </div>
            <div>
              <label className={S.label} htmlFor="svc-desc">Description (shown on the website)</label>
              <textarea id="svc-desc" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} className={`${S.input} resize-none h-20`} placeholder="Optional" />
            </div>

            <div className="p-4 rounded-xl bg-cream border border-gold/20 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-ink flex items-center gap-2"><Tag className="w-4 h-4 text-plum" /> Promotion</p>
                  <p className="text-xs text-muted">Temporary price shown on the website between the dates below.</p>
                </div>
                <Toggle on={form.promo_on} onChange={(v) => setForm((p) => ({ ...p, promo_on: v }))} label="Promotion on" />
              </div>
              {form.promo_on && (
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className={S.label} htmlFor="svc-promo-price">Promo price</label>
                    <input id="svc-promo-price" type="number" min="0" step="0.01" value={form.promo_price} onChange={(e) => setForm((p) => ({ ...p, promo_price: e.target.value }))} className={S.input} placeholder="299.00" />
                  </div>
                  <div>
                    <label className={S.label} htmlFor="svc-promo-start">Starts</label>
                    <input id="svc-promo-start" type="date" value={form.promo_start} onChange={(e) => setForm((p) => ({ ...p, promo_start: e.target.value }))} className={S.input} />
                  </div>
                  <div>
                    <label className={S.label} htmlFor="svc-promo-end">Ends</label>
                    <input id="svc-promo-end" type="date" value={form.promo_end} onChange={(e) => setForm((p) => ({ ...p, promo_end: e.target.value }))} className={S.input} />
                  </div>
                </div>
              )}
            </div>

            {editing !== "new" && (
              <div className="flex items-center gap-3 p-3 bg-cream rounded-xl">
                <span className="text-xs font-semibold tracking-widest uppercase text-muted">Visible</span>
                <Toggle on={form.is_active} onChange={(v) => setForm((p) => ({ ...p, is_active: v }))} label="Visible on website" />
                <span className="text-xs text-muted">{form.is_active ? "Bookable and shown on the website" : "Hidden / archived"}</span>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setEditing(null)} className={S.btnSecondary}>Cancel</button>
              <button type="submit" disabled={saving} className={S.btnPrimary} data-testid="service-save">{saving ? "Saving…" : editing === "new" ? "Create Service" : "Save Changes"}</button>
            </div>
          </form>
        </Modal>
      )}

      {confirmDelete && (
        <Modal title="Delete service?" onClose={() => setConfirmDelete(null)} testId="confirm-delete">
          <p className="text-sm text-bark mb-6">
            <strong>{confirmDelete.name}</strong> will be removed from the website and booking screens.
            If it has booking history it is archived instead, so past bookings keep their details.
          </p>
          <div className="flex gap-3">
            <button onClick={() => setConfirmDelete(null)} className={S.btnSecondary}>Keep it</button>
            <button onClick={() => remove(confirmDelete)} className={`${S.btnPrimary} !bg-berry hover:!bg-berry-dark`} data-testid="confirm-delete-yes">Delete</button>
          </div>
        </Modal>
      )}

      {showCategories && (
        <CategoriesModal categories={categories} onClose={() => setShowCategories(false)} onChanged={load} showToast={showToast} />
      )}
    </div>
  );
}

function CategoriesModal({ categories, onClose, onChanged, showToast }) {
  const [newName, setNewName] = useState("");
  const [renaming, setRenaming] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleting, setDeleting] = useState(null);
  const [moveTo, setMoveTo] = useState("");

  const add = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      await api("/categories/", { method: "POST", body: { name: newName.trim() } });
      setNewName("");
      showToast("success", "Category added");
      await onChanged();
    } catch (err) { showToast("error", err.message); }
  };

  const rename = async (c) => {
    if (!renameValue.trim() || renameValue.trim() === c.name) return setRenaming(null);
    try {
      await api(`/categories/${c.id}`, { method: "PATCH", body: { name: renameValue.trim() } });
      setRenaming(null);
      showToast("success", "Category renamed");
      await onChanged();
    } catch (err) { showToast("error", err.message); }
  };

  const remove = async (c) => {
    try {
      const qs = c.service_count > 0 ? `?move_to=${moveTo}` : "";
      if (c.service_count > 0 && !moveTo) return showToast("error", "Choose where to move its services");
      await api(`/categories/${c.id}${qs}`, { method: "DELETE" });
      setDeleting(null);
      setMoveTo("");
      showToast("success", "Category deleted");
      await onChanged();
    } catch (err) { showToast("error", err.message); }
  };

  return (
    <Modal title="Categories" onClose={onClose} width="max-w-lg" testId="categories-modal">
      <form onSubmit={add} className="flex gap-2 mb-5">
        <input value={newName} onChange={(e) => setNewName(e.target.value)} className={S.input} placeholder="New category name" data-testid="category-new-name" />
        <button type="submit" className="px-4 rounded-xl bg-plum text-white text-sm font-medium" data-testid="category-add">Add</button>
      </form>
      <div className="divide-y divide-[#D4AF87]/10">
        {categories.map((c) => (
          <div key={c.id} className="py-3 flex items-center justify-between gap-3" data-testid="category-row" data-category-name={c.name}>
            {renaming === c.id ? (
              <div className="flex items-center gap-2 flex-1">
                <input autoFocus value={renameValue} onChange={(e) => setRenameValue(e.target.value)} className={S.inlineInput} data-testid="category-rename-input"
                  onKeyDown={(e) => { if (e.key === "Enter") rename(c); if (e.key === "Escape") setRenaming(null); }} />
                <button onClick={() => rename(c)} className={`${S.btnSmall} ${S.btnSmallGreen}`} aria-label="Save name"><Check className="w-3.5 h-3.5" /></button>
                <button onClick={() => setRenaming(null)} className={`${S.btnSmall} ${S.btnSmallGold}`} aria-label="Cancel rename"><XIcon className="w-3.5 h-3.5" /></button>
              </div>
            ) : (
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink">{c.name}</p>
                <p className="text-xs text-muted">{c.service_count} active {c.service_count === 1 ? "service" : "services"}</p>
              </div>
            )}
            {renaming !== c.id && (
              <div className="flex items-center gap-2">
                <button onClick={() => { setRenaming(c.id); setRenameValue(c.name); }} className={`${S.btnSmall} ${S.btnSmallPurple}`} data-testid="category-rename"><Pencil className="w-3 h-3" /> Rename</button>
                <button onClick={() => { setDeleting(c.id === deleting ? null : c.id); setMoveTo(""); }} className={`${S.btnSmall} ${S.btnSmallRed}`} data-testid="category-delete" aria-label={`Delete category ${c.name}`}><Trash2 className="w-3 h-3" /></button>
              </div>
            )}
            {deleting === c.id && (
              <div className="w-full mt-2 p-3 rounded-xl bg-berry/10 border border-berry/20 text-xs text-berry space-y-2">
                {c.service_count > 0 ? (
                  <>
                    <p>Move its {c.service_count} service(s) to:</p>
                    <select value={moveTo} onChange={(e) => setMoveTo(e.target.value)} className={S.inlineInput} data-testid="category-move-to">
                      <option value="">Choose…</option>
                      {categories.filter((o) => o.id !== c.id).map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                    </select>
                  </>
                ) : <p>Delete the empty category “{c.name}”?</p>}
                <div className="flex gap-2">
                  <button onClick={() => remove(c)} className={`${S.btnSmall} ${S.btnSmallRed}`} data-testid="category-delete-confirm">Delete</button>
                  <button onClick={() => setDeleting(null)} className={`${S.btnSmall} ${S.btnSmallGold}`}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        ))}
        {categories.length === 0 && <p className="py-6 text-sm text-muted text-center">No categories yet</p>}
      </div>
    </Modal>
  );
}

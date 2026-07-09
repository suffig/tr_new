import { useState } from 'react';
import Icon from '../../icons/Icon';
import { getCatalog, setRating, addTeam, removeTeam } from '../../../utils/fc26Catalog';
import toast from 'react-hot-toast';

const fmtRating = (r) => (r == null ? '—' : r.toFixed(1).replace('.', ','));

function Stars({ rating, size = 12 }) {
  if (rating == null) return <span className="text-[10px] text-text-tertiary">Nat.-Team</span>;
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => {
        const fill = Math.max(0, Math.min(1, rating - (i - 1)));
        return (
          <span key={i} className="relative inline-block" style={{ width: size, height: size }}>
            <span className="absolute inset-0 text-border-medium"><Icon name="star" size={size} strokeWidth={2} /></span>
            {fill > 0 && <span className="absolute inset-0 overflow-hidden text-system-yellow" style={{ width: `${fill * 100}%` }}><Icon name="starFilled" size={size} strokeWidth={0} /></span>}
          </span>
        );
      })}
    </span>
  );
}

export default function TeamCatalogTab() {
  const [catalog, setCatalog] = useState(getCatalog);
  const [search, setSearch] = useState('');
  const [addName, setAddName] = useState('');
  const [addRating, setAddRating] = useState(3);
  const [addNational, setAddNational] = useState(false);
  const [addWomen, setAddWomen] = useState(false);

  const refresh = () => setCatalog(getCatalog());

  const q = search.trim().toLowerCase();
  const filtered = q ? catalog.filter((t) => t.name.toLowerCase().includes(q)) : catalog;
  const shown = filtered.slice(0, 120);

  const editRating = (name, next) => { setRating(name, next); refresh(); };

  const onAdd = () => {
    const name = addName.trim();
    if (!name) { toast.error('Bitte einen Teamnamen eingeben.'); return; }
    if (catalog.some((t) => t.name.toLowerCase() === name.toLowerCase())) { toast.error('Team existiert bereits.'); return; }
    addTeam({ name, rating: addNational ? null : addRating, women: addWomen, national: addNational });
    setAddName(''); refresh();
    toast.success(`„${name}" hinzugefügt`);
  };

  const onRemove = (name) => {
    if (!window.confirm(`„${name}" aus dem Katalog entfernen?`)) return;
    removeTeam(name); refresh();
    toast.success(`„${name}" entfernt`);
  };

  return (
    <div className="p-4 pb-20">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-text-primary mb-1 inline-flex items-center gap-2">
          <Icon name="trophy" size={18} strokeWidth={2.2} className="text-system-orange" />FC26-Team-Katalog
        </h3>
        <p className="text-text-muted text-sm">Ratings bearbeiten, Teams hinzufügen oder entfernen. Änderungen werden lokal &amp; in der Datenbank gespeichert.</p>
      </div>

      {/* Add new team */}
      <div className="modern-card mb-4">
        <div className="section-label mb-2">Team hinzufügen</div>
        <input value={addName} onChange={(e) => setAddName(e.target.value)} placeholder="Teamname…"
          className="form-input mb-2" />
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <button type="button" onClick={() => setAddNational((v) => !v)} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${addNational ? 'bg-system-blue text-white' : 'bg-bg-tertiary text-text-secondary'}`}>Nationalteam</button>
          <button type="button" onClick={() => setAddWomen((v) => !v)} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${addWomen ? 'bg-system-pink text-white' : 'bg-bg-tertiary text-text-secondary'}`}>Frauen</button>
          {!addNational && (
            <div className="inline-flex items-center gap-1.5 ml-auto">
              <button type="button" onClick={() => setAddRating((r) => Math.max(0.5, r - 0.5))} className="w-7 h-7 rounded-lg bg-bg-tertiary text-text-secondary font-semibold">−</button>
              <span className="inline-flex items-center gap-1 min-w-[52px] justify-center"><Icon name="starFilled" size={13} strokeWidth={0} className="text-system-yellow" /><span className="font-bold tabular-nums text-sm">{fmtRating(addRating)}</span></span>
              <button type="button" onClick={() => setAddRating((r) => Math.min(5, r + 0.5))} className="w-7 h-7 rounded-lg bg-bg-tertiary text-text-secondary font-semibold">+</button>
            </div>
          )}
        </div>
        <button onClick={onAdd} className="btn-brand w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl">
          <Icon name="plus" size={16} strokeWidth={2.2} />Hinzufügen
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none"><Icon name="search" size={18} strokeWidth={2} /></span>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Team suchen…"
          className="w-full pl-11 pr-3 py-3 bg-bg-secondary border border-border-light rounded-xl text-sm text-text-primary placeholder-text-tertiary focus:outline-none" />
      </div>

      <div className="text-xs text-text-tertiary px-1 mb-2">{filtered.length} Teams{shown.length < filtered.length ? ` · zeige ${shown.length}` : ''}</div>

      <div className="space-y-1.5">
        {shown.map((t) => (
          <div key={t.name} className="flex items-center justify-between gap-2 bg-bg-tertiary rounded-xl px-3 py-2">
            <div className="min-w-0">
              <div className="text-sm font-medium text-text-primary truncate">{t.name}</div>
              <div className="mt-0.5 flex items-center gap-1.5"><Stars rating={t.rating} /><span className="text-[11px] text-text-tertiary tabular-nums">{fmtRating(t.rating)}</span></div>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {t.rating == null ? (
                <button onClick={() => editRating(t.name, 3)} className="text-[11px] px-2 py-1.5 rounded-lg bg-bg-secondary border border-border-light text-text-secondary">Rating +</button>
              ) : (
                <>
                  <button onClick={() => editRating(t.name, Math.max(0.5, t.rating - 0.5))} className="w-7 h-7 rounded-lg bg-bg-secondary border border-border-light text-text-secondary font-semibold">−</button>
                  <button onClick={() => editRating(t.name, Math.min(5, t.rating + 0.5))} className="w-7 h-7 rounded-lg bg-bg-secondary border border-border-light text-text-secondary font-semibold">+</button>
                  <button onClick={() => editRating(t.name, null)} title="Rating entfernen" className="w-7 h-7 rounded-lg bg-bg-secondary border border-border-light text-text-tertiary text-xs">∅</button>
                </>
              )}
              <button onClick={() => onRemove(t.name)} aria-label="Team entfernen" className="w-7 h-7 rounded-lg btn-soft btn-soft-red flex items-center justify-center">
                <Icon name="trash" size={14} strokeWidth={2} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

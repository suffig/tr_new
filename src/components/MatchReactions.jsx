import { useCallback, useEffect, useState } from 'react';
import Icon from './icons/Icon';
import { supabaseDb } from '../utils/supabase';
import { hapticLight } from '../utils/feedback';

// Reaktionen & kurzer Kommentar zu einem Spiel.
//
// Die Tabelle match_reactions ist optional (db/match_reactions.sql). Solange
// sie fehlt, blendet sich die Komponente komplett aus, statt Fehler zu zeigen —
// niemand soll wegen eines fehlenden Zusatzfeatures kaputte Karten sehen.

const REACTIONS = [
  { emoji: '👏', label: 'Stark' },
  { emoji: '😤', label: 'Ärgerlich' },
  { emoji: '🍀', label: 'Glück gehabt' },
  { emoji: '🤡', label: 'Blamage' },
  { emoji: '🔥', label: 'Weltklasse' },
];

const MAX_COMMENT = 140;

/** Fehler, die bedeuten "Tabelle gibt es (noch) nicht". */
function isMissingTable(error) {
  if (!error) return false;
  const msg = `${error.message || ''} ${error.code || ''}`.toLowerCase();
  return msg.includes('does not exist')
    || msg.includes('not found')
    || msg.includes('schema cache')
    || error.code === '42p01';
}

export default function MatchReactions({ matchId, userEmail }) {
  const [rows, setRows] = useState([]);
  const [available, setAvailable] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState('');
  const [editingComment, setEditingComment] = useState(false);

  const load = useCallback(async () => {
    if (matchId == null) return;
    setLoading(true);
    try {
      const { data, error } = await supabaseDb.select('match_reactions', '*', {
        eq: { match_id: matchId },
        skipFifaFilter: true,
      });
      if (error) {
        setAvailable(!isMissingTable(error));
        setRows([]);
      } else {
        setRows(data || []);
      }
    } catch (e) {
      setAvailable(!isMissingTable(e));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  useEffect(() => { load(); }, [load]);

  const mine = rows.find((r) => r.user_email === userEmail) || null;
  const others = rows.filter((r) => r.user_email !== userEmail);

  useEffect(() => {
    setDraft(mine?.comment || '');
  }, [mine?.comment]);

  const persist = async (patch) => {
    if (!userEmail || matchId == null) return;
    setSaving(true);
    try {
      if (mine) {
        const { error } = await supabaseDb.update(
          'match_reactions',
          { ...patch, updated_at: new Date().toISOString() },
          mine.id
        );
        if (error) throw error;
      } else {
        const { error } = await supabaseDb.insert('match_reactions', {
          match_id: matchId,
          user_email: userEmail,
          emoji: null,
          comment: null,
          ...patch,
        });
        if (error) throw error;
      }
      await load();
    } catch (e) {
      if (isMissingTable(e)) setAvailable(false);
      // Sonst still: eine fehlgeschlagene Reaktion darf den Spieltag nicht stoeren.
      console.warn('[Reaktionen] konnten nicht gespeichert werden:', e?.message || e);
    } finally {
      setSaving(false);
    }
  };

  const toggleEmoji = (emoji) => {
    hapticLight();
    persist({ emoji: mine?.emoji === emoji ? null : emoji });
  };

  const saveComment = () => {
    const text = draft.trim().slice(0, MAX_COMMENT);
    setEditingComment(false);
    if (text === (mine?.comment || '')) return;
    persist({ comment: text || null });
  };

  if (!available) return null;
  if (loading && rows.length === 0) {
    return <div className="text-caption2 text-text-tertiary px-1 py-2">Reaktionen werden geladen …</div>;
  }

  return (
    <div className="pt-1">
      {/* Auswahl */}
      <div className="flex flex-wrap items-center gap-1.5">
        {REACTIONS.map((r) => {
          const active = mine?.emoji === r.emoji;
          return (
            <button
              key={r.emoji}
              type="button"
              onClick={(e) => { e.stopPropagation(); toggleEmoji(r.emoji); }}
              disabled={saving}
              aria-label={r.label}
              aria-pressed={active}
              title={r.label}
              className={`btn-compact px-2.5 py-1 rounded-full text-base leading-none transition-colors ${
                active
                  ? 'bg-system-green/20 ring-1 ring-system-green/40'
                  : 'bg-bg-tertiary hover:bg-bg-hover'
              }`}
            >
              {r.emoji}
            </button>
          );
        })}

        {!editingComment && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setEditingComment(true); }}
            className="btn-compact ml-auto inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-bg-tertiary text-text-secondary text-caption1 hover:bg-bg-hover transition-colors"
          >
            <Icon name="edit" size={13} strokeWidth={2.2} />
            {mine?.comment ? 'Ändern' : 'Kommentieren'}
          </button>
        )}
      </div>

      {/* Kommentar schreiben */}
      {editingComment && (
        <div className="mt-2 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <input
            type="text"
            value={draft}
            maxLength={MAX_COMMENT}
            autoFocus
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveComment();
              if (e.key === 'Escape') { setDraft(mine?.comment || ''); setEditingComment(false); }
            }}
            placeholder="Kurzer Kommentar …"
            className="form-input flex-1 !py-2 text-sm"
          />
          <button type="button" onClick={saveComment} disabled={saving} className="btn-primary btn-sm">
            OK
          </button>
        </div>
      )}

      {/* Eigener Kommentar */}
      {!editingComment && mine?.comment && (
        <p className="mt-2 text-footnote text-text-secondary">
          <span className="text-text-tertiary">Du:</span> {mine.comment}
        </p>
      )}

      {/* Reaktionen der anderen Person */}
      {others.filter((o) => o.emoji || o.comment).map((o) => (
        <div key={o.id} className="mt-2 flex items-start gap-2 text-footnote">
          {o.emoji && <span className="text-base leading-none flex-shrink-0">{o.emoji}</span>}
          <p className="text-text-secondary min-w-0">
            <span className="text-text-tertiary">{(o.user_email || '').split('@')[0]}:</span>{' '}
            {o.comment || <span className="text-text-tertiary">hat reagiert</span>}
          </p>
        </div>
      ))}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { RotateCcw, Archive as ArchiveIcon } from 'lucide-react';

export default function ArchivePage() {
  const [items, setItems] = useState([]);

  const load = () => api.getArchived().then(setItems).catch(() => {});
  useEffect(() => { load(); }, []);

  const restore = async (id) => {
    await api.restoreHabit(id);
    setItems((p) => p.filter((x) => x.id !== id));
  };

  return (
    <div className="page archive">
      <div className="empty-state" style={{ padding: '24px 0' }}>
        <ArchiveIcon size={48} style={{ color: 'var(--text-dim)' }} />
        <h3>Архив привычек</h3>
        <p>Удалённые привычки. Можно восстановить.</p>
      </div>

      {items.length === 0 ? (
        <div className="empty-state" style={{ padding: '20px' }}>
          <p className="muted">Архив пуст</p>
        </div>
      ) : (
        <div className="archive-list">
          {items.map((h) => (
            <div key={h.id} className="archive-row">
              <span className="archive-emoji">{h.emoji}</span>
              <div className="archive-info">
                <strong>{h.title}</strong>
                <span className="muted small">🏆 Рекорд: {h.best_streak}</span>
              </div>
              <button className="primary-btn ghost-btn archive-restore" onClick={() => restore(h.id)}>
                <RotateCcw size={14} /> Восстановить
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

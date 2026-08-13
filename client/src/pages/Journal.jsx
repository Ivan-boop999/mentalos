import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Plus, Trash2, BookOpen, Lock } from 'lucide-react';

export default function JournalPage() {
  const [entries, setEntries] = useState([]);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [locked, setLocked] = useState(true);
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  const load = () => api.getJournal().then(setEntries).catch(() => {});

  // BiometricManager: приватный доступ к дневнику (FaceID/отпечаток)
  useEffect(() => {
    const wa = window.Telegram?.WebApp;
    const bm = wa?.BiometricManager;
    if (bm) {
      try {
        bm.initBiometric();
        setBiometricAvailable(bm.isBiometricAvailable);
        if (bm.isBiometricAvailable && !bm.isAccessRequested) {
          bm.requestBiometricAccess({ reason: 'Разрешите доступ для защиты дневника' });
        }
      } catch {}
    }
    // Если биометрия недоступна — открываем сразу
    if (!bm?.isBiometricAvailable) setLocked(false);
  }, []);

  const unlock = () => {
    const wa = window.Telegram?.WebApp;
    const bm = wa?.BiometricManager;
    if (bm?.isBiometricAvailable && bm.isAccessGranted) {
      bm.authenticate('Откройте дневник', (ok) => { if (ok) { setLocked(false); load(); } });
    } else {
      setLocked(false); // фолбэк — без биометрии
      load();
    }
  };

  useEffect(() => { if (!locked) load(); }, [locked]);

  if (locked && biometricAvailable) {
    return (
      <div className="page journal">
        <div className="empty-state">
          <Lock size={56} style={{ color: 'var(--accent)', marginBottom: 14 }} />
          <h3>Дневник заблокирован</h3>
          <p>Твой дневник защищён биометрией</p>
          <button className="primary-btn" onClick={unlock}>🔓 Открыть с FaceID/отпечатком</button>
        </div>
      </div>
    );
  }

  const submit = async () => {
    if (!content.trim()) return;
    await api.createJournal({ title: title.trim() || null, content: content.trim() });
    setTitle(''); setContent(''); setOpen(false);
    load();
  };

  const remove = async (id) => {
    if (!confirm('Удалить запись?')) return;
    await api.deleteJournal(id);
    load();
  };

  return (
    <div className="page journal">
      <button className="primary-btn" style={{ marginBottom: 16 }} onClick={() => setOpen((v) => !v)}>
        <Plus size={18} /> {open ? 'Закрыть' : 'Новая запись'}
      </button>

      {open && (
        <div className="journal-form glass">
          <input className="input" placeholder="Заголовок (необязательно)" value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea className="input" placeholder="Что у тебя на уме?" value={content} onChange={(e) => setContent(e.target.value)} rows={5} />
          <button className="primary-btn" onClick={submit} disabled={!content.trim()}>Сохранить запись</button>
        </div>
      )}

      {entries.length === 0 ? (
        <div className="empty-state">
          <BookOpen size={56} style={{ color: 'var(--text-dim)', marginBottom: 14 }} />
          <h3>Дневник пуст</h3>
          <p>Записывай мысли, инсайты, благодарности — что угодно.</p>
        </div>
      ) : (
        <div className="journal-list">
          {entries.map((e) => (
            <div key={e.id} className="journal-entry">
              <div className="journal-head">
                <div>
                  {e.title && <strong>{e.title}</strong>}
                  <span className="muted small">{new Date(e.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                </div>
                <button className="icon-action danger" onClick={() => remove(e.id)}><Trash2 size={16} /></button>
              </div>
              <p className="journal-content">{e.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import { useEffect, useState, useCallback } from 'react';
import { api } from '../api/client';
import PetCreature from '../components/PetCreature.jsx';
import { ArrowLeft, MapPin, Gift, Clock, Sparkles, Pencil, Check } from 'lucide-react';
import { useTelegram } from '../hooks/useTelegram';
import { useSound } from '../hooks/useSound';

const STAGE_LABEL = { egg: '🥚 Яйцо', baby: '👶 Малыш', teen: '🧒 Подросток', adult: '🌟 Взрослый' };
const TRAIT_LABEL = { curious: '🔍 Любопытный', gentle: '🤗 Милый', sassy: '😏 Дерзкий' };
const EVENT_LABEL = {
  hatch: '🐣 Вылупился', evolve: '✨ Эволюционировал', adventure: '🗺️ Приключение',
  birthday: '🎂 День рождения', visit: '🐾 Визит друга', new_pet: '🎉 Новый питомец', item: '🎁 Получил предмет',
};

export default function PetPage({ onBack }) {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('home');
  const [tapText, setTapText] = useState('');
  const [emojiMap, setEmojiMap] = useState({});
  const [busy, setBusy] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const { hapticFeedback } = useTelegram();
  const { play } = useSound();

  const load = useCallback(async () => {
    try {
      const [petData, shop] = await Promise.all([api.getPet(), api.getCompanionShop().catch(() => [])]);
      setData(petData);
      setNameDraft(petData?.pet?.name || '');
      // Динамическая карта эмодзи предметов (для экипировки на SVG)
      const m = {};
      for (const item of shop || []) m[item.code] = item.emoji;
      setEmojiMap(m);
    } catch (e) { console.error('PetPage load:', e); }
  }, []);
  useEffect(() => { load(); }, [load]);

  if (!data) return <div className="page"><div className="empty-state">Загрузка…</div></div>;

  const { pet, equipped, adventure, species, collection, events, balance, shopBonusAvailable } = data;
  const xpProgress = pet.xpToNext > pet.xpForThis
    ? Math.round(((pet.xp - pet.xpForThis) / (pet.xpToNext - pet.xpForThis)) * 100) : 0;

  const onZoneTap = (text) => {
    setTapText(text);
    hapticFeedback('light');
    play('pop');
    setTimeout(() => setTapText(''), 1500);
  };

  const startAdventure = async () => {
    setBusy(true);
    try { await api.startAdventure(); hapticFeedback('medium'); play('pop'); load(); }
    catch (e) { alert('❌ ' + e.message); }
    setBusy(false);
  };

  const claimAdv = async () => {
    setBusy(true);
    try {
      const r = await api.claimAdventure();
      alert(`🎁 ${pet.name} принёс: ${r.rewardLabel}`);
      hapticFeedback('heavy'); play('success'); load();
    } catch (e) { alert('❌ ' + e.message); }
    setBusy(false);
  };

  const switchPet = async (code) => {
    setBusy(true);
    try { await api.switchPet(code); hapticFeedback('medium'); play('success'); load(); }
    catch (e) { alert('❌ ' + e.message); }
    setBusy(false);
  };

  const buySpecies = async (code, title, price) => {
    if (!confirm(`Купить «${title}» за ${price} 🪙?`)) return;
    setBusy(true);
    try {
      await api.buyPet(code);
      alert(`🎉 ${title} теперь твой!`);
      hapticFeedback('heavy'); play('success'); load();
    } catch (e) { alert('❌ ' + e.message); }
    setBusy(false);
  };

  const saveName = async () => {
    if (!nameDraft.trim()) return;
    try { await api.renamePet(nameDraft.trim()); setRenaming(false); load(); play('success'); }
    catch (e) { alert('❌ ' + e.message); }
  };

  const advLeft = adventure?.returnsAt ? Math.max(0, Math.ceil((new Date(adventure.returnsAt) - Date.now()) / 60000)) : 0;

  return (
    <div className="page pet-page">
      {/* Шапка */}
      <div className="pet-page-header">
        <button className="icon-btn" onClick={onBack}><ArrowLeft size={22} /></button>
        <div className="pet-page-title" onClick={() => setRenaming(true)} style={{ cursor: 'pointer' }}>
          {renaming ? (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input
                className="input" style={{ padding: '6px 10px', fontSize: 14, maxWidth: 140 }}
                value={nameDraft} onChange={(e) => setNameDraft(e.target.value)}
                maxLength={20} autoFocus onKeyDown={(e) => e.key === 'Enter' && saveName()}
              />
              <button className="icon-btn" style={{ width: 32, height: 32 }} onClick={saveName}><Check size={16} /></button>
            </div>
          ) : (
            <>
              <strong>{pet.name} <Pencil size={12} style={{ opacity: 0.4, display: 'inline' }} /></strong>
              <span>{pet.speciesEmoji} {STAGE_LABEL[pet.stage]} · Lv {pet.level}</span>
            </>
          )}
        </div>
        <div className="cs-balance">🪙 {balance}</div>
      </div>

      {/* Табы */}
      <div className="seg-control pet-tabs">
        <button className={`seg-btn ${tab === 'home' ? 'active' : ''}`} onClick={() => setTab('home')}>🏠 Дом</button>
        <button className={`seg-btn ${tab === 'collection' ? 'active' : ''}`} onClick={() => setTab('collection')}>🐾 Коллекция</button>
        <button className={`seg-btn ${tab === 'diary' ? 'active' : ''}`} onClick={() => setTab('diary')}>📖 Дневник</button>
      </div>

      {/* === ДОМ === */}
      {tab === 'home' && (
        <>
          <div className="pet-stage-container glass">
            {pet.isBirthday && <div className="pet-birthday-banner">🎂 Сегодня День Рождения!</div>}
            <PetCreature
              stage={pet.stage} species={pet.species} colors={pet.colors}
              mood={pet.mood} size={220} equipped={equipped} emojiMap={emojiMap}
              onZoneTap={onZoneTap}
            />
            {tapText && <div className="pet-reaction-bubble">{tapText}</div>}
          </div>

          <div className="pet-stats-row">
            <div className="pet-stat-chip">
              <span>😊 Настроение</span>
              <strong>{pet.mood >= 70 ? 'Отличное' : pet.mood >= 40 ? 'Норм' : 'Скучает'}</strong>
            </div>
            <div className="pet-stat-chip">
              <span>🎭 Характер</span>
              <strong>{TRAIT_LABEL[pet.trait] || pet.trait}</strong>
            </div>
          </div>

          <div className="pet-xp-block glass">
            <div className="pet-xp-label">Рост: {pet.xp} / {pet.xpToNext} XP</div>
            <div className="companion-xp-bar">
              <div className="companion-xp-fill" style={{ width: `${xpProgress}%` }} />
            </div>
            {pet.stage === 'egg' && (
              <div className="hatch-hint">🐣 Вылупится через ~{Math.max(1, Math.ceil((50 - pet.xp) / 15))} отметок</div>
            )}
          </div>

          {pet.stage !== 'egg' && (
            <div className="pet-adventure-block glass">
              {!adventure && <button className="adventure-btn" onClick={startAdventure} disabled={busy}><MapPin size={16} /> Отправить в приключение</button>}
              {adventure?.status === 'active' && (
                <div className="adventure-status"><Clock size={14} /> В пути · {advLeft >= 60 ? `${Math.floor(advLeft / 60)} ч ${advLeft % 60} м` : `${advLeft} мин`}</div>
              )}
              {adventure?.canClaim && <button className="adventure-btn claim" onClick={claimAdv} disabled={busy}><Gift size={16} /> Забрать находку!</button>}
            </div>
          )}

          {shopBonusAvailable && (
            <button className="primary-btn ghost-btn" style={{ marginBottom: 12 }} onClick={async () => {
              try { await api.claimShopDailyBonus(); play('success'); load(); } catch (e) {}
            }}><Sparkles size={16} /> Ежедневный бонус (+10 🪙)</button>
          )}
        </>
      )}

      {/* === КОЛЛЕКЦИЯ === */}
      {tab === 'collection' && (
        <div className="pet-collection">
          <h3 className="card-title">Мои питомцы ({collection.length}/{species.length})</h3>
          <div className="pet-collection-grid">
            {species.map((s) => {
              const col = collection.find((c) => c.species_code === s.code);
              const owned = !!col;
              const active = col?.is_active;
              return (
                <div key={s.code} className={`pet-card-species ${active ? 'active' : ''} ${!owned ? 'locked' : ''}`}>
                  <div className="pet-species-emoji" style={{ filter: owned ? 'none' : 'grayscale(1) opacity(0.4)' }}>{s.emoji}</div>
                  <div className="pet-species-title">{s.title}</div>
                  {active && <div className="pet-species-badge">Активный</div>}
                  {!owned && s.price > 0 && (
                    <button className="shop-buy-btn" disabled={busy || balance < s.price} onClick={() => buySpecies(s.code, s.title, s.price)}>🪙 {s.price}</button>
                  )}
                  {!owned && s.price === 0 && (
                    <button className="shop-buy-btn" disabled={busy} onClick={() => buySpecies(s.code, s.title, 0)}>Получить</button>
                  )}
                  {owned && !active && (
                    <button className="cs-btn equip-btn" onClick={() => switchPet(s.code)}>Выбрать</button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* === ДНЕВНИК === */}
      {tab === 'diary' && (
        <div className="pet-diary">
          <h3 className="card-title">📖 История {pet.name}</h3>
          {events.length === 0 ? (
            <div className="empty-state" style={{ padding: 20 }}><p>Пока пусто. Отмечай привычки — появятся события!</p></div>
          ) : (
            <div className="pet-timeline">
              {events.map((e, i) => (
                <div key={i} className="pet-timeline-item">
                  <div className="pet-timeline-dot" />
                  <div className="pet-timeline-body">
                    <strong>{EVENT_LABEL[e.type] || e.type}</strong>
                    <span className="muted small">{new Date(e.at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                    {e.data?.gift && <span className="pet-timeline-gift">{e.data.gift}</span>}
                    {e.data?.stage && <span className="pet-timeline-stage">→ {STAGE_LABEL[e.data.stage]}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

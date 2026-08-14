import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Sparkles, Save } from 'lucide-react';

const TYPES = [
  { v: 'spark', label: '✨ Спарк' },
  { v: 'leaf', label: '🌿 Листик' },
  { v: 'drop', label: '💧 Капелька' },
  { v: 'flame', label: '🔥 Огонёк' },
];
const TRAITS = [
  { v: 'curious', label: '🔍 Любопытный' },
  { v: 'gentle', label: '🤗 Милый' },
  { v: 'sassy', label: '😏 Дерзкий' },
];

/**
 * Companion Shop v2: настройки питомца (имя/тип) + магазин с надеть/СНЯТЬ.
 */
export default function CompanionShopPage() {
  const [shop, setShop] = useState([]);
  const [inv, setInv] = useState({ equipped: {}, owned: [] });
  const [balance, setBalance] = useState(0);
  const [pet, setPet] = useState({ name: '', type: 'spark', stage: 'egg' });
  const [nameDraft, setNameDraft] = useState('');
  const [typeDraft, setTypeDraft] = useState('spark');
  const [traitDraft, setTraitDraft] = useState('curious');
  const [savedMsg, setSavedMsg] = useState('');

  const load = async () => {
    try {
      const [s, i, r, c] = await Promise.all([
        api.getCompanionShop(), api.getCompanionInventory(), api.getReferral(), api.getCompanion(),
      ]);
      setShop(s);
      setInv(i);
      setBalance(r.balance);
      setPet(c);
      setNameDraft(c.name || '');
      setTypeDraft(c.type || 'spark');
      setTraitDraft(c.trait || 'curious');
    } catch {}
  };
  useEffect(() => { load(); }, []);

  const savePet = async () => {
    try {
      await api.updateCompanion({ name: nameDraft.trim(), type: typeDraft, trait: traitDraft });
      setSavedMsg('✅ Сохранено');
      setTimeout(() => setSavedMsg(''), 2000);
      load();
    } catch (e) { alert('❌ ' + e.message); }
  };

  const dailyBonus = async () => {
    try {
      const res = await api.claimShopDailyBonus();
      alert(`🎁 Ежедневный бонус: 🪙 +${res.amount}!`);
      load();
    } catch (e) { alert('❌ ' + e.message); }
  };

  const buy = async (code) => {
    if (!confirm('Купить предмет?')) return;
    try { await api.buyCompanionItem(code); load(); }
    catch (e) { alert('❌ ' + e.message); }
  };

  const equipToggle = async (code, category) => {
    try { await api.equipCompanionItem(code, category); load(); }
    catch (e) { alert('❌ ' + e.message); }
  };

  const ownedCodes = new Set(inv.owned.map((o) => o.item_code));

  const grouped = shop.reduce((acc, item) => { (acc[item.category] ||= []).push(item); return acc; }, {});
  const catLabels = { hat: '🎩 Головные уборы', glasses: '🕶️ Очки', accessory: '✨ Аксессуары', home: '🏠 Домик (фон)' };

  return (
    <div className="page companion-shop">
      <div className="cs-hero glass">
        <Sparkles size={28} style={{ color: 'var(--accent)' }} />
        <h2>Мой питомец</h2>
        <div className="cs-balance">🪙 {balance}</div>
      </div>

      {/* НАСТРОЙКИ ПИТОМЦА (имя + тип + черта) */}
      <div className="pet-settings glass">
        <h3 className="card-title">Настройки</h3>
        <label className="field-label">Имя питомца</label>
        <input
          className="input"
          value={nameDraft}
          onChange={(e) => setNameDraft(e.target.value)}
          maxLength={20}
          placeholder="Например: Пушок"
        />
        <label className="field-label">Кто он?</label>
        <div className="seg-control">
          {TYPES.map((t) => (
            <button key={t.v} type="button" className={`seg-btn ${typeDraft === t.v ? 'active' : ''}`} onClick={() => setTypeDraft(t.v)}>
              {t.label}
            </button>
          ))}
        </div>
        <label className="field-label">Характер (влияет на реплики)</label>
        <div className="seg-control">
          {TRAITS.map((t) => (
            <button key={t.v} type="button" className={`seg-btn ${traitDraft === t.v ? 'active' : ''}`} onClick={() => setTraitDraft(t.v)}>
              {t.label}
            </button>
          ))}
        </div>
        <button className="primary-btn" onClick={savePet} disabled={!nameDraft.trim() || (nameDraft.trim() === pet.name && typeDraft === pet.type && traitDraft === pet.trait)}>
          <Save size={16} /> {savedMsg || 'Сохранить'}
        </button>
        {pet.stage === 'egg' && (
          <p className="hint">🥚 Питомец ещё в яйце — предметы станут видны после вылупления. Каждая отметка привычки приближает его!</p>
        )}
      </div>

      {/* Ежедневная бесплатка */}
      <button className="primary-btn ghost-btn daily-bonus-btn" onClick={dailyBonus} disabled={!pet.shopBonusAvailable}>
        🎁 {pet.shopBonusAvailable ? 'Забрать ежедневный бонус (+10 🪙)' : 'Бонус получен — заходи завтра!'}
      </button>

      {Object.entries(grouped).map(([cat, items]) => (
        <div key={cat}>
          <h3 className="card-title">{catLabels[cat] || cat}</h3>
          <div className="cs-grid">
            {items.map((item) => {
              const owned = ownedCodes.has(item.code);
              const equipped = inv.equipped[cat] === item.code;
              return (
                <div key={item.code} className={`cs-item ${equipped ? 'equipped' : ''}`}>
                  <div className="cs-item-emoji">{item.emoji}</div>
                  <div className="cs-item-title">{item.title}</div>
                  {equipped ? (
                    <button className="cs-btn equipped-btn" onClick={() => equipToggle(item.code, cat)}>Снять</button>
                  ) : owned ? (
                    <button className="cs-btn equip-btn" onClick={() => equipToggle(item.code, cat)}>Надеть</button>
                  ) : (
                    <button className="cs-btn buy-btn" onClick={() => buy(item.code)} disabled={balance < item.price}>
                      🪙 {item.price}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

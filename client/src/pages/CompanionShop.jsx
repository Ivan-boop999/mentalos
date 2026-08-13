import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Sparkles } from 'lucide-react';

/**
 * Companion Shop — кастомизация компаньона: шапки, очки, аксессуары.
 */
export default function CompanionShopPage() {
  const [shop, setShop] = useState([]);
  const [inv, setInv] = useState({ equipped: {}, owned: [] });
  const [balance, setBalance] = useState(0);

  const load = async () => {
    try {
      const [s, i, r] = await Promise.all([api.getCompanionShop(), api.getCompanionInventory(), api.getReferral()]);
      setShop(s);
      setInv(i);
      setBalance(r.balance);
    } catch {}
  };
  useEffect(() => { load(); }, []);

  const ownedCodes = new Set(inv.owned.map((o) => o.item_code));

  const buy = async (code) => {
    if (!confirm('Купить предмет?')) return;
    try { await api.buyCompanionItem(code); load(); }
    catch (e) { alert('❌ ' + e.message); }
  };

  const equip = async (code, category) => {
    try { await api.equipCompanionItem(code, category); load(); }
    catch (e) { alert('❌ ' + e.message); }
  };

  const grouped = shop.reduce((acc, item) => { (acc[item.category] ||= []).push(item); return acc; }, {});
  const catLabels = { hat: '🎩 Головные уборы', glasses: '🕶️ Очки', accessory: '✨ Аксессуары' };

  return (
    <div className="page companion-shop">
      <div className="cs-hero glass">
        <Sparkles size={28} style={{ color: 'var(--accent)' }} />
        <h2>Магазин компаньона</h2>
        <div className="cs-balance">🪙 {balance}</div>
      </div>

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
                    <button className="cs-btn equipped-btn" disabled>✓ Надето</button>
                  ) : owned ? (
                    <button className="cs-btn equip-btn" onClick={() => equip(item.code, cat)}>Надеть</button>
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

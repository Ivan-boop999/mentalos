import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Gift, Copy, Check, Users, ShoppingBag, Sparkles } from 'lucide-react';

export default function ReferralPage({ tg, onChange }) {
  const [tab, setTab] = useState('refer'); // refer | shop
  const [data, setData] = useState(null);
  const [shop, setShop] = useState([]);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const [r, s] = await Promise.all([api.getReferral(), api.getShop()]);
      setData(r);
      setShop(s);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const copyLink = () => {
    navigator.clipboard?.writeText(data.shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const shareTelegram = () => {
    const url = `https://t.me/share/url?url=${encodeURIComponent(data.shareUrl)}&text=${encodeURIComponent('🧠 Трекер привычек MentalOS — давай развивать полезные привычки вместе! +50 бонусов тебе в подарок 🎁')}`;
    window.open(url, '_blank');
  };

  const buy = async (code) => {
    if (!confirm('Купить этот товар?')) return;
    try {
      const res = await api.buyItem(code);
      alert(`✅ ${res.alreadyOwned ? 'Активировано' : 'Куплено'}: ${res.item.title}\nОстаток бонусов: ${res.balance}`);
      load();
      onChange?.();
    } catch (e) {
      alert('❌ ' + e.message);
    }
  };

  if (loading || !data) return <div className="page"><div className="empty-state">Загрузка…</div></div>;

  return (
    <div className="page referral">
      <div className="bonus-balance-card">
        <div className="bonus-balance-label">🪙 Твои бонусы</div>
        <div className="bonus-balance-amount">{data.balance}</div>
        <div className="bonus-balance-actions">
          <button className="bonus-action-btn" onClick={() => setTab('refer')}><Gift size={15} /> Заработать</button>
          <button className="bonus-action-btn" onClick={() => setTab('shop')}><ShoppingBag size={15} /> Потратить</button>
        </div>
      </div>

      <div className="seg-control" style={{ marginBottom: 16 }}>
        <button className={`seg-btn ${tab === 'refer' ? 'active' : ''}`} onClick={() => setTab('refer')}>🎁 Приглашать</button>
        <button className={`seg-btn ${tab === 'shop' ? 'active' : ''}`} onClick={() => setTab('shop')}>🛍️ Магазин</button>
      </div>

      {tab === 'refer' && (
        <>
          <div className="share-link-card">
            <div className="share-link-label">Твоя персональная ссылка</div>
            <div className="share-link-row">
              <input className="share-link-input" value={data.shareUrl} readOnly />
              <button className="copy-btn" onClick={copyLink}>
                {copied ? <><Check size={14} /> OK</> : <><Copy size={14} /> Копировать</>}
              </button>
            </div>
            <button className="primary-btn" style={{ marginTop: 10 }} onClick={shareTelegram}>
              <Sparkles size={16} /> Поделиться в Telegram
            </button>
          </div>

          <div className="rules-card">
            <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 14 }}>💎 Правила начисления</div>
            <div className="rules-row"><span>За каждого приглашённого друга</span><strong>+{data.rules.perReferral}</strong></div>
            <div className="rules-row"><span>Приветственный бонус другу</span><strong>+{data.rules.welcomeBonus}</strong></div>
            <div className="rules-row"><span>За каждую отметку привычки</span><strong>+{data.rules.perCheckin}</strong></div>
          </div>

          <h3 className="card-title"><Users size={16} /> Приглашённые ({data.invited.length})</h3>
          {data.invited.length === 0 ? (
            <p className="settings-hint">Пока никого не пригласил. Поделись ссылкой — и получишь +{data.rules.perReferral} бонусов за каждого друга!</p>
          ) : (
            <div className="invited-list">
              {data.invited.map((r) => (
                <div className="invited-row" key={r.id}>
                  <div className="invited-avatar">{(r.username || '?')[0].toUpperCase()}</div>
                  <div className="invited-info">
                    <strong>@{r.username || 'друг'}</strong>
                    <span>{new Date(r.joined_at).toLocaleDateString('ru-RU')}</span>
                  </div>
                  <div className="invited-bonus">+{data.rules.perReferral}</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'shop' && (
        <>
          <h3 className="card-title">🛍️ Магазин</h3>
          <div className="shop-grid">
            {shop.map((item) => {
              const canAfford = data.balance >= item.price;
              return (
                <div key={item.code} className="shop-item">
                  <div className="shop-emoji">{item.emoji}</div>
                  <div className="shop-title">{item.title}</div>
                  <div className="shop-desc">{item.desc}</div>
                  <div className="shop-price">🪙 {item.price}</div>
                  <button className="shop-buy-btn" disabled={!canAfford} onClick={() => buy(item.code)}>
                    {canAfford ? 'Купить' : 'Не хватает'}
                  </button>
                </div>
              );
            })}
          </div>
          <p className="settings-hint" style={{ marginTop: 16 }}>
            💡 Зарабатывай бонусы: отмечай привычки, веди серии, приглашай друзей — и открывай новые темы, бейджи и premium-функции.
          </p>
        </>
      )}
    </div>
  );
}

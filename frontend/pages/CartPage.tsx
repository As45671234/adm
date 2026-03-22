import React, { useMemo, useState } from 'react';
import { sendOrder } from '../services/api';
import { CartItem } from '../types';
import { Link, useNavigate } from 'react-router-dom';
import { getUnitLabel } from '../services/pricing';

interface CartPageProps {
  cart: CartItem[];
  removeFromCart: (cartKey: string) => void;
  updateQuantity: (cartKey: string, quantity: number) => void;
  clearCart: () => void;
}

const CartPage: React.FC<CartPageProps> = ({ cart, removeFromCart, updateQuantity, clearCart }) => {
  const navigate = useNavigate();
  const [isOrdering, setIsOrdering] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [comment, setComment] = useState('');
  const [notice, setNotice] = useState<null | { type: 'success' | 'error'; title: string; message: string }>(null);

  const total = useMemo(
    () => cart.reduce((sum, item) => sum + Number(item.unitPrice || 0) * Number(item.quantity || 0), 0),
    [cart]
  );

  const handleQtyStep = (item: CartItem, direction: -1 | 1) => {
    const step = item.pricingMode === 'piece' ? 1 : 0.1;
    const min = item.pricingMode === 'piece' ? 1 : 0.1;
    const next = Math.max(min, Number((item.quantity + direction * step).toFixed(2)));
    updateQuantity(item.cartKey, next);
  };

  const formatMetricDims = (item: CartItem) => {
    if (!item.metrics) return '';
    const parts = [item.metrics.widthM, item.metrics.heightM];
    return parts.map((value) => `${Number(value).toLocaleString('ru-RU', { maximumFractionDigits: 3 })} м`).join(' × ');
  };

  const handleOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    setIsOrdering(true);
    try {
      await sendOrder({
        customerName,
        customerPhone,
        address: customerAddress,
        comment,
        items: cart.map((item) => ({
          id: item.id,
          name: item.name,
          sku: item.sku,
          unit: item.unit,
          image: item.image,
          quantity: item.quantity,
          pricingMode: item.pricingMode,
          unitPrice: item.unitPrice,
          metrics: item.metrics,
          lineTotal: Number(item.unitPrice || 0) * Number(item.quantity || 0),
        })),
        total,
      });

      clearCart();
      setCustomerName('');
      setCustomerPhone('');
      setCustomerAddress('');
      setComment('');
      setNotice({
        type: 'success',
        title: 'Заявка принята',
        message: 'Менеджер скоро свяжется с вами.',
      });
    } catch (e: any) {
      setNotice({
        type: 'error',
        title: 'Не удалось отправить заявку',
        message: e?.message || 'Попробуйте еще раз через минуту.',
      });
    } finally {
      setIsOrdering(false);
    }
  };

  const closeNotice = () => {
    const success = notice?.type === 'success';
    setNotice(null);
    if (success) navigate('/');
  };

  const noticeModal = notice ? (
    <div className="fixed inset-0 z-[120] bg-zinc-900/55 backdrop-blur-sm flex items-center justify-center p-4" onClick={closeNotice}>
      <div
        className="w-full max-w-md rounded-3xl p-7 shadow-2xl border"
        style={{
          background: 'var(--adm-paper)',
          borderColor: notice.type === 'success' ? '#a3e635' : '#fca5a5',
          boxShadow: '0 20px 44px rgba(0,0,0,0.25)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: notice.type === 'success' ? '#ecfccb' : '#fee2e2' }}
          >
            <i
              className={`fas ${notice.type === 'success' ? 'fa-check' : 'fa-exclamation'}`}
              style={{ color: notice.type === 'success' ? '#3f6212' : '#991b1b' }}
            ></i>
          </div>

          <div className="flex-grow">
            <h3 className="text-2xl font-black text-zinc-900 tracking-tight">{notice.title}</h3>
            <p className="text-sm mt-2 leading-relaxed text-zinc-600">{notice.message}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={closeNotice}
          className="mt-6 w-full py-3 rounded-2xl font-black uppercase tracking-wider text-sm"
          style={{ background: 'var(--adm-ink)', color: 'var(--adm-paper)' }}
        >
          Понятно
        </button>
      </div>
    </div>
  ) : null;

  if (cart.length === 0) {
    return (
      <>
        <div className="container mx-auto px-6 py-32 text-center">
          <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8 text-3xl" style={{ background: 'var(--adm-bg-soft)', color: 'var(--adm-accent)' }}>
            <i className="fas fa-shopping-basket"></i>
          </div>
          <h1 className="text-4xl font-black text-[var(--adm-ink)] mb-6 uppercase tracking-tighter">Корзина пуста</h1>
          <p className="text-[var(--adm-ink-soft)] mb-10 max-w-md mx-auto">Добавьте товары из каталога, чтобы оформить заявку.</p>
          <Link
            to="/catalog"
            className="inline-block px-10 py-4 font-bold rounded-2xl transition-all shadow-xl uppercase tracking-widest text-sm"
            style={{ background: 'var(--adm-accent)', color: '#0d0b07' }}
          >
            Перейти в каталог
          </Link>
        </div>
        {noticeModal}
      </>
    );
  }

  return (
    <div className="container mx-auto px-6 py-12">
      <h1 className="text-4xl font-black text-[var(--adm-ink)] mb-12 uppercase tracking-tighter">Оформление заявки</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
        <div className="lg:col-span-2 space-y-4">
          {cart.map((item) => (
            <div
              key={item.cartKey}
              className="bg-[var(--adm-paper)] p-6 rounded-3xl border border-[var(--adm-border)] flex flex-col md:flex-row items-center gap-8"
            >
              <div className="w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0" style={{ background: 'var(--adm-bg-soft)' }}>
                <img
                  src={item.image ? item.image : '/logos/logoadm.jpg'}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex-grow">
                <div className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--adm-accent)' }}>{item.segment || item.brandOrGroup}</div>
                <h3 className="text-lg font-bold text-[var(--adm-ink)] line-clamp-1">{item.name}</h3>
                <div className="text-sm text-[var(--adm-ink-soft)] mt-1">
                  {item.unitPrice
                    ? `${item.unitPrice.toLocaleString()} ₸ / ${getUnitLabel(item.pricingMode)}`
                    : 'По запросу'}
                </div>
                {item.metrics ? (
                  <div className="mt-2 text-xs text-[var(--adm-ink-soft)] space-y-1">
                    <div>
                      Размеры: <span className="font-semibold text-[var(--adm-ink)]">{formatMetricDims(item)}</span>
                    </div>
                    <div>
                      Площадь: <span className="font-semibold text-[var(--adm-ink)]">{Number(item.metrics.quantity).toLocaleString('ru-RU', { maximumFractionDigits: 3 })} {item.metrics.unit}</span>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="flex items-center gap-4 p-2 rounded-2xl" style={{ background: 'var(--adm-bg-soft)' }}>
                <button
                  onClick={() => handleQtyStep(item, -1)}
                  className="w-10 h-10 rounded-xl hover:bg-[var(--adm-paper)] text-[var(--adm-ink)] font-bold transition-all"
                >
                  <i className="fas fa-minus"></i>
                </button>
                <input
                  type="number"
                  className="w-20 text-center font-black text-[var(--adm-ink)] bg-transparent"
                  min={item.pricingMode === 'piece' ? 1 : 0.1}
                  step={item.pricingMode === 'piece' ? 1 : 0.1}
                  value={item.quantity}
                  onChange={(e) => {
                    const raw = Number(e.target.value);
                    const min = item.pricingMode === 'piece' ? 1 : 0.1;
                    updateQuantity(item.cartKey, Math.max(min, Number.isFinite(raw) ? raw : min));
                  }}
                />
                <button
                  onClick={() => handleQtyStep(item, 1)}
                  className="w-10 h-10 rounded-xl hover:bg-[var(--adm-paper)] text-[var(--adm-ink)] font-bold transition-all"
                >
                  <i className="fas fa-plus"></i>
                </button>
              </div>

              <div className="text-right min-w-[130px]">
                <div className="text-xs text-[var(--adm-ink-soft)] mb-1">{getUnitLabel(item.pricingMode)}</div>
                <div className="text-2xl font-black" style={{ color: 'var(--adm-accent)' }}>
                  {(Number(item.unitPrice || 0) * Number(item.quantity || 0)).toLocaleString()} ₸
                </div>
              </div>

              <button onClick={() => removeFromCart(item.cartKey)} className="text-gray-300 hover:text-red-500 transition-colors p-2">
                <i className="fas fa-trash-alt"></i>
              </button>
            </div>
          ))}
        </div>

        <div className="bg-[var(--adm-paper)] p-10 rounded-[40px] shadow-2xl border border-[var(--adm-border)] sticky top-32">
          <h3 className="text-2xl font-black text-[var(--adm-ink)] mb-8 uppercase tracking-tighter">Детали заявки</h3>

          <div className="space-y-4 mb-8">
            <div className="flex justify-between text-[var(--adm-ink-soft)] font-medium">
              <span>Позиций ({cart.length})</span>
              <span className="text-[var(--adm-ink)] font-black">{total.toLocaleString()} ₸</span>
            </div>
          </div>

          <form onSubmit={handleOrder} className="space-y-4">
            <input
              type="text"
              placeholder="ФИО"
              required
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full bg-[var(--adm-bg-soft)] border border-[var(--adm-border)] rounded-2xl px-6 py-4 text-[var(--adm-ink)] placeholder-[var(--adm-ink-soft)] outline-none focus:border-[var(--adm-accent)] transition-all text-sm"
            />
            <input
              type="tel"
              placeholder="Телефон"
              required
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              className="w-full bg-[var(--adm-bg-soft)] border border-[var(--adm-border)] rounded-2xl px-6 py-4 text-[var(--adm-ink)] placeholder-[var(--adm-ink-soft)] outline-none focus:border-[var(--adm-accent)] transition-all text-sm"
            />
            <input
              type="text"
              placeholder="Адрес объекта"
              required
              value={customerAddress}
              onChange={(e) => setCustomerAddress(e.target.value)}
              className="w-full bg-[var(--adm-bg-soft)] border border-[var(--adm-border)] rounded-2xl px-6 py-4 text-[var(--adm-ink)] placeholder-[var(--adm-ink-soft)] outline-none focus:border-[var(--adm-accent)] transition-all text-sm"
            />
            <textarea
              placeholder="Комментарий к заказу"
              className="w-full bg-[var(--adm-bg-soft)] border border-[var(--adm-border)] rounded-2xl px-6 py-4 text-[var(--adm-ink)] placeholder-[var(--adm-ink-soft)] outline-none focus:border-[var(--adm-accent)] transition-all h-28 text-sm"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            ></textarea>

            <button
              type="submit"
              disabled={isOrdering}
              className={`w-full py-5 rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl transition-all flex items-center justify-center gap-3 ${
                isOrdering ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              style={{ background: isOrdering ? 'var(--adm-bg-soft)' : 'var(--adm-accent)', color: isOrdering ? 'var(--adm-ink-soft)' : '#0d0b07' }}
            >
              {isOrdering ? <i className="fas fa-spinner fa-spin"></i> : 'Отправить заявку'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link to="/catalog" className="font-bold text-sm hover:underline" style={{ color: 'var(--adm-accent)' }}>
              Вернуться в каталог
            </Link>
          </div>
        </div>
      </div>
      {noticeModal}
    </div>
  );
};

export default CartPage;

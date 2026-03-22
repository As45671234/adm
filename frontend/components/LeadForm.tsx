import React, { useState } from 'react';
import { sendLead } from '../services/api';

interface LeadFormProps {
  onSuccess?: () => void;
}

const LeadForm: React.FC<LeadFormProps> = ({ onSuccess }) => {
  const [leadName, setLeadName] = useState('');
  const [leadPhone, setLeadPhone] = useState('');
  const [leadAddress, setLeadAddress] = useState('');
  const [leadMessage, setLeadMessage] = useState('');
  const [isSendingLead, setIsSendingLead] = useState(false);
  const [notice, setNotice] = useState<null | { type: 'success' | 'error'; text: string }>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);
    setIsSendingLead(true);
    try {
      await sendLead({
        name: leadName,
        phone: leadPhone,
        message: [leadAddress ? `Адрес: ${leadAddress}` : '', leadMessage || ''].filter(Boolean).join('\n'),
      });
      setLeadName('');
      setLeadPhone('');
      setLeadAddress('');
      setLeadMessage('');
      if (onSuccess) onSuccess();
      else setNotice({ type: 'success', text: 'Заявка отправлена. Менеджер скоро свяжется с вами.' });
    } catch (err: any) {
      setNotice({ type: 'error', text: err?.message || 'Ошибка при отправке' });
    } finally {
      setIsSendingLead(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {notice ? (
        <div
          className="rounded-xl px-4 py-3 text-sm font-semibold"
          style={{
            background: notice.type === 'success' ? '#ecfccb' : '#fee2e2',
            color: notice.type === 'success' ? '#365314' : '#991b1b',
            border: `1px solid ${notice.type === 'success' ? '#a3e635' : '#fca5a5'}`,
          }}
        >
          {notice.text}
        </div>
      ) : null}

      <div>
        <label className="block text-xs font-bold text-[var(--adm-ink-soft)] uppercase mb-2 tracking-[0.12em]">Ваше имя</label>
        <input
          type="text"
          className="w-full bg-[var(--adm-paper)] border border-[var(--adm-border)] rounded-xl px-4 py-3 focus:border-[var(--adm-accent)] focus:ring-2 focus:ring-amber-100 outline-none transition-all"
          placeholder="Например: Айбек"
          value={leadName}
          onChange={(e) => setLeadName(e.target.value)}
        />
      </div>
      <div>
        <label className="block text-xs font-bold text-[var(--adm-ink-soft)] uppercase mb-2 tracking-[0.12em]">Телефон</label>
        <input
          type="tel"
          className="w-full bg-[var(--adm-paper)] border border-[var(--adm-border)] rounded-xl px-4 py-3 focus:border-[var(--adm-accent)] focus:ring-2 focus:ring-amber-100 outline-none transition-all"
          placeholder="+7 (___) ___-__-__"
          value={leadPhone}
          onChange={(e) => setLeadPhone(e.target.value)}
          required
        />
      </div>
      <div>
        <label className="block text-xs font-bold text-[var(--adm-ink-soft)] uppercase mb-2 tracking-[0.12em]">Адрес объекта</label>
        <input
          type="text"
          className="w-full bg-[var(--adm-paper)] border border-[var(--adm-border)] rounded-xl px-4 py-3 focus:border-[var(--adm-accent)] focus:ring-2 focus:ring-amber-100 outline-none transition-all"
          placeholder="Район / улица"
          value={leadAddress}
          onChange={(e) => setLeadAddress(e.target.value)}
        />
      </div>
      <div>
        <label className="block text-xs font-bold text-[var(--adm-ink-soft)] uppercase mb-2 tracking-[0.12em]">Комментарий</label>
        <textarea
          className="w-full bg-[var(--adm-paper)] border border-[var(--adm-border)] rounded-xl px-4 py-3 focus:border-[var(--adm-accent)] focus:ring-2 focus:ring-amber-100 outline-none transition-all min-h-[110px]"
          placeholder="Кухня, шкаф, гардеробная, сроки..."
          value={leadMessage}
          onChange={(e) => setLeadMessage(e.target.value)}
        />
      </div>
      <button
        disabled={isSendingLead}
        className={`w-full py-4 rounded-xl font-black uppercase tracking-[0.16em] text-sm transition-all ${
          isSendingLead ? 'bg-gray-200 text-gray-400' : 'bg-[var(--adm-ink)] hover:bg-black text-white shadow-xl'
        }`}
      >
        {isSendingLead ? 'Отправка...' : 'Получить расчет'}
      </button>
    </form>
  );
};

export default LeadForm;

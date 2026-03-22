
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Hero from '../components/Hero';
import LeadForm from '../components/LeadForm';
import PartnersSection from "../components/PartnersSection";
import AboutSlider from "../components/InfographicSection";
import { Category, HomeContent, Product } from '../types';

interface HomePageProps {
  categories: Category[];
  onAddToCart: (p: Product) => void;
  content?: HomeContent | null;
}
const HomePage: React.FC<HomePageProps> = ({ content }) => {
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [leadNotice, setLeadNotice] = useState<null | { title: string; message: string }>(null);
  const contacts = content?.contacts;
  const whatsappPhone = String(contacts?.whatsappPhone || import.meta.env.VITE_WHATSAPP_PHONE || '').replace(/[^\d]/g, '');
  const whatsappMessage = encodeURIComponent(String(contacts?.whatsappMessage || 'Здравствуйте! Хочу заказать консультацию.'));
  const whatsappUrl = whatsappPhone ? `https://wa.me/${whatsappPhone}${whatsappMessage ? `?text=${whatsappMessage}` : ''}` : '';
  const mapQuery = encodeURIComponent(String(contacts?.addressValue || 'Жетиген 37, Astana, Kazakhstan'));


  const leadModal = isLeadModalOpen ? (
    <div
      className="fixed inset-0 z-[9998] bg-black/50 flex items-center justify-center p-4"
      onClick={() => setIsLeadModalOpen(false)}
    >
      <div
        className="w-full max-w-xl bg-[var(--adm-paper)] border border-[var(--adm-border)] rounded-3xl shadow-2xl p-8 text-[var(--adm-ink)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-3xl font-black text-[var(--adm-ink)] uppercase tracking-tight">Заказать консультацию</h3>
          <button
            type="button"
            onClick={() => setIsLeadModalOpen(false)}
            className="w-10 h-10 rounded-2xl flex items-center justify-center transition-colors"
            style={{ background: 'var(--adm-bg-soft)', color: 'var(--adm-ink-soft)' }}
            aria-label="Закрыть"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
        <LeadForm
          onSuccess={() => {
            setIsLeadModalOpen(false);
            setLeadNotice({
              title: 'Заявка отправлена',
              message: 'Спасибо! Менеджер ADM свяжется с вами в ближайшее время.',
            });
          }}
        />
      </div>
    </div>
  ) : null;

  const leadNoticeModal = leadNotice ? (
    <div
      className="fixed inset-0 z-[9999] bg-zinc-900/55 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={() => setLeadNotice(null)}
    >
      <div
        className="w-full max-w-md rounded-3xl p-7 shadow-2xl border"
        style={{ background: 'var(--adm-paper)', borderColor: 'rgba(201,164,76,0.45)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(201,164,76,.15)' }}>
            <i className="fas fa-check" style={{ color: 'var(--adm-accent)' }}></i>
          </div>
          <div>
            <h3 className="text-2xl font-black tracking-tight" style={{ color: 'var(--adm-ink)' }}>{leadNotice.title}</h3>
            <p className="text-sm mt-2 leading-relaxed" style={{ color: 'var(--adm-ink-soft)' }}>{leadNotice.message}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setLeadNotice(null)}
          className="mt-6 w-full py-3 rounded-2xl font-black uppercase tracking-wider text-sm"
          style={{ background: 'var(--adm-accent)', color: '#0d0b07' }}
        >
          Отлично
        </button>
      </div>
    </div>
  ) : null;

  useEffect(() => {
    if (!isLeadModalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsLeadModalOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isLeadModalOpen]);

  return (
    <div className="animate-fade-up">
      <Hero onConsultationClick={() => setIsLeadModalOpen(true)} content={content} />
      
      <AboutSlider
        heading={content?.about?.sectionLabel || 'О компании'}
        title={content?.about?.title || 'Мебель, созданная под ваш интерьер'}
        slides={content?.about?.slides}
      />

      <PartnersSection
        sectionLabel={content?.projects?.sectionLabel}
        title={content?.projects?.title}
        description={content?.projects?.description}
        projects={content?.projects?.cards}
      />

      {/* Contacts Section */}
      <section className="py-24" id="contacts">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            <div className="adm-section p-8 md:p-10">
              <div className="adm-eyebrow mb-4">{contacts?.sectionLabel || 'Контакты'}</div>
              <h2 className="text-4xl md:text-5xl font-black mb-6 text-[var(--adm-ink)]">{contacts?.title || 'Свяжитесь с нами'}</h2>
              <p className="text-[var(--adm-ink-soft)] text-lg mb-10 leading-relaxed">{contacts?.description || 'Оставьте заявку, и менеджер ADM свяжется с вами, уточнит размеры и подготовит ориентировочный расчет.'}</p>
              
              <div className="space-y-6">
                <div className="flex items-center gap-6">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl" style={{ background: 'rgba(201,164,76,.15)', color: 'var(--adm-accent)' }}>
                    <i className="fas fa-phone"></i>
                  </div>
                  <div>
                    <div className="text-[var(--adm-ink-soft)] text-xs font-bold uppercase mb-1">Телефон</div>
                    <a href={`tel:${String(contacts?.phoneValue || '+77074064499').replace(/[^\d+]/g, '')}`} className="text-xl font-bold text-[var(--adm-ink)] hover:text-[var(--adm-accent)] transition-colors">{contacts?.phoneValue || '+7 707 406 44 99'}</a>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl" style={{ background: 'rgba(201,164,76,.15)', color: 'var(--adm-accent)' }}>
                    <i className="fas fa-map-marker-alt"></i>
                  </div>
                  <div>
                    <div className="text-[var(--adm-ink-soft)] text-xs font-bold uppercase mb-1">Адрес</div>
                    <span className="text-xl font-bold text-[var(--adm-ink)]">{contacts?.addressValue || 'Жетиген 37, Astana, Kazakhstan'}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-3xl shadow-lg mt-10 border border-[var(--adm-border)]" style={{ background: 'var(--adm-bg-soft)' }}>
                <div className="px-4 pt-4 pb-2 text-sm font-bold text-[var(--adm-accent)] uppercase tracking-widest">{contacts?.mapTitle || 'Мы на карте'}</div>
                <div className="overflow-hidden rounded-2xl border border-[var(--adm-border)]">
                  <iframe
                    title="ADM location"
                    src={`https://www.google.com/maps?q=${mapQuery}&output=embed`}
                    className="w-full h-64"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <div className="adm-section p-10 text-[var(--adm-ink)]">
                <h3 className="text-3xl font-black text-[var(--adm-ink)] mb-8">{contacts?.quickFormTitle || 'Быстрая заявка'}</h3>
                <LeadForm />
              </div>
              <div className="rounded-3xl p-8 shadow-2xl" style={{ background: 'var(--adm-paper-2)', border: '1px solid var(--adm-border-strong)' }}>
                <h4 className="text-2xl font-black mb-3 text-[var(--adm-ink)]">{contacts?.whatsappTitle || 'Написать в WhatsApp'}</h4>
                <p className="text-[var(--adm-ink-soft)] text-sm mb-5">{contacts?.whatsappText || 'Самый быстрый путь получить консультацию и предварительный расчет.'}</p>
                <a
                  href={whatsappUrl || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl font-black uppercase tracking-[0.12em] text-xs ${whatsappUrl ? '' : 'cursor-not-allowed opacity-40'}`}
                  style={whatsappUrl ? { background: 'var(--adm-accent)', color: '#0d0b07' } : { background: 'var(--adm-bg-soft)', color: 'var(--adm-ink-soft)' }}
                  onClick={(e) => {
                    if (!whatsappUrl) e.preventDefault();
                  }}
                >
                  <i className="fab fa-whatsapp"></i>
                  {contacts?.whatsappButtonText || 'Написать сейчас'}
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {typeof document !== 'undefined' && leadModal ? createPortal(leadModal, document.body) : null}
      {typeof document !== 'undefined' && leadNoticeModal ? createPortal(leadNoticeModal, document.body) : null}
    </div>
  );
};

export default HomePage;

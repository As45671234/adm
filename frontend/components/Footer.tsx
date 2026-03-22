
import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { HomeContent } from '../types';

interface FooterProps {
  content?: HomeContent | null;
}

const Footer: React.FC<FooterProps> = ({ content }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const contacts = content?.contacts;
  const whatsappPhone = String(contacts?.whatsappPhone || import.meta.env.VITE_WHATSAPP_PHONE || '').replace(/[^\d]/g, '');
  const whatsappMessage = encodeURIComponent(String(contacts?.whatsappMessage || 'Здравствуйте! Хочу заказать консультацию.'));
  const whatsappUrl = whatsappPhone
    ? `https://wa.me/${whatsappPhone}${whatsappMessage ? `?text=${whatsappMessage}` : ''}`
    : '';
  const instagramUrl = String(contacts?.instagramUrl || import.meta.env.VITE_INSTAGRAM_URL || 'https://www.instagram.com/adm_mebel_astana/').trim();

  const goToSection = (id: string) => {
    const doScroll = () => {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    if (location.pathname !== '/') {
      navigate('/');
      setTimeout(doScroll, 50);
    } else {
      setTimeout(doScroll, 0);
    }
  };

  return (
    <footer style={{ background: '#060402' }}>
      {/* Luxury gold top line */}
      <div style={{ height: 1, background: 'linear-gradient(90deg, transparent 0%, rgba(201,164,76,0.45) 18%, #c9a44c 50%, rgba(201,164,76,0.45) 82%, transparent 100%)' }} />

      <div style={{ padding: '72px 0 44px' }}>
        <div className="container mx-auto px-8">

          {/* Main columns */}
          <div
            className="grid grid-cols-1 md:grid-cols-3 gap-16"
            style={{ paddingBottom: 56, borderBottom: '1px solid rgba(201,164,76,0.1)' }}
          >
            {/* ── Brand ── */}
            <div>
              <div style={{
                fontFamily: "'Montserrat', sans-serif",
                fontSize: '3.6rem',
                fontWeight: 900,
                letterSpacing: '0.07em',
                lineHeight: 0.86,
                textTransform: 'uppercase',
                background: 'linear-gradient(180deg, #f2ca61 0%, #d8a93a 40%, #b47b1c 100%)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
                textShadow: '0 0 22px rgba(201,164,76,0.08)',
                marginBottom: 6,
              }}>
                ADM
              </div>
              <div style={{
                fontFamily: "'Manrope', sans-serif",
                fontSize: '0.9rem',
                fontWeight: 500,
                letterSpacing: '0.18em',
                textTransform: 'lowercase',
                color: 'rgba(229, 211, 171, 0.72)',
                marginBottom: 18,
                paddingLeft: 4,
              }}>
                Mebel Astana
              </div>
              <div style={{
                width: 96,
                height: 1,
                background: 'linear-gradient(90deg, rgba(201,164,76,0), rgba(201,164,76,0.42), rgba(201,164,76,0))',
                marginBottom: 24,
              }} />
              <p style={{
                fontFamily: "'Manrope', sans-serif",
                fontSize: '0.81rem',
                lineHeight: 1.82,
                color: 'rgba(224,208,174,0.42)',
                marginBottom: 28,
              }}>
                {contacts?.description || 'Корпусная мебель на заказ в Астане. Собственное производство, сроки изготовления от 14 дней, гарантия 1 год.'}
              </p>
              <div style={{ display: 'flex', gap: 12 }}>
                {whatsappUrl ? (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      width: 40, height: 40,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      borderRadius: 10,
                      background: 'rgba(201,164,76,0.07)',
                      border: '1px solid rgba(201,164,76,0.18)',
                      color: '#c9a44c',
                      fontSize: '1.05rem',
                      textDecoration: 'none',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = 'rgba(201,164,76,0.16)'; el.style.borderColor = 'rgba(201,164,76,0.38)'; }}
                    onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = 'rgba(201,164,76,0.07)'; el.style.borderColor = 'rgba(201,164,76,0.18)'; }}
                  >
                    <i className="fab fa-whatsapp"></i>
                  </a>
                ) : (
                  <span style={{
                    width: 40, height: 40,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: 10,
                    background: 'rgba(201,164,76,0.04)',
                    border: '1px solid rgba(201,164,76,0.1)',
                    color: 'rgba(201,164,76,0.22)',
                    fontSize: '1.05rem',
                  }}>
                    <i className="fab fa-whatsapp"></i>
                  </span>
                )}
              </div>
            </div>

            {/* ── Nav ── */}
            <div>
              <div style={{
                fontFamily: "'Manrope', sans-serif",
                fontSize: '7.5px', fontWeight: 800,
                letterSpacing: '0.38em', textTransform: 'uppercase',
                color: 'rgba(201,164,76,0.38)',
                marginBottom: 30,
              }}>
                Разделы
              </div>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 17 }}>
                {[
                  { label: 'Каталог', href: '/catalog', type: 'link' as const },
                  { label: 'О компании', sectionId: 'about', type: 'btn' as const },
                  { label: 'Наши проекты', sectionId: 'partners', type: 'btn' as const },
                  { label: 'Контакты', sectionId: 'contacts', type: 'btn' as const },
                ].map(item => {
                  const itemStyle: React.CSSProperties = {
                    fontFamily: "'Manrope', sans-serif",
                    fontSize: '13px', fontWeight: 500,
                    color: 'rgba(224,208,174,0.52)',
                    textDecoration: 'none',
                    transition: 'color 0.2s',
                    display: 'block',
                    background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left',
                  };
                  return (
                    <li key={item.label}>
                      {item.type === 'link' ? (
                        <Link
                          to={item.href as string}
                          style={itemStyle}
                          onMouseEnter={e => (e.currentTarget.style.color = '#c9a44c')}
                          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(224,208,174,0.52)')}
                        >
                          {item.label}
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={() => goToSection(item.sectionId as string)}
                          style={itemStyle}
                          onMouseEnter={e => (e.currentTarget.style.color = '#c9a44c')}
                          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(224,208,174,0.52)')}
                        >
                          {item.label}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* ── Contacts ── */}
            <div>
              <div style={{
                fontFamily: "'Manrope', sans-serif",
                fontSize: '7.5px', fontWeight: 800,
                letterSpacing: '0.38em', textTransform: 'uppercase',
                color: 'rgba(201,164,76,0.38)',
                marginBottom: 30,
              }}>
                Контакты
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
                <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                  <i className="fas fa-phone" style={{ fontSize: '0.68rem', color: 'rgba(201,164,76,0.45)', marginTop: 4, width: 16, flexShrink: 0 }}></i>
                  <div>
                    <div style={{ fontFamily: "'Manrope', sans-serif", fontSize: '0.92rem', fontWeight: 700, color: 'rgba(224,208,174,0.8)', letterSpacing: '-0.01em' }}>
                      {contacts?.phoneValue || (whatsappPhone ? `+${whatsappPhone}` : '+7 ___ ___ __ __')}
                    </div>
                    <div style={{ fontFamily: "'Manrope', sans-serif", fontSize: '8px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(201,164,76,0.32)', marginTop: 4 }}>
                      {contacts?.workingHours || 'Пн — Сб, 09:00 — 20:00'}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                  <i className="fas fa-map-marker-alt" style={{ fontSize: '0.68rem', color: 'rgba(201,164,76,0.45)', marginTop: 4, width: 16, flexShrink: 0 }}></i>
                  <div style={{ fontFamily: "'Manrope', sans-serif", fontSize: '0.9rem', fontWeight: 600, color: 'rgba(224,208,174,0.7)', lineHeight: 1.55 }}>
                    {String(contacts?.addressValue || 'Жетиген 37, Astana, Kazakhstan').split(', ').map((part, idx, arr) => (
                      <React.Fragment key={`${part}-${idx}`}>
                        {part}
                        {idx < arr.length - 1 ? <br /> : null}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
                <div style={{ fontFamily: "'Manrope', sans-serif", fontSize: '9px', fontWeight: 600, letterSpacing: '0.08em', color: 'rgba(201,164,76,0.28)', paddingTop: 4 }}>
                  Гарантия 1 год&nbsp;&nbsp;·&nbsp;&nbsp;Бесплатный замер
                </div>
              </div>
            </div>
          </div>

          {/* ── Bottom ── */}
          <div
            className="flex flex-col md:flex-row justify-between items-center gap-4"
            style={{ paddingTop: 28 }}
          >
            <div style={{ fontFamily: "'Manrope', sans-serif", fontSize: '8px', fontWeight: 700, letterSpacing: '0.24em', textTransform: 'uppercase', color: 'rgba(201,164,76,0.22)' }}>
              © 2026 ADM Mebel Astana. Все права защищены.
            </div>
            <div style={{ fontFamily: "'Manrope', sans-serif", fontSize: '8px', fontWeight: 600, letterSpacing: '0.06em', color: 'rgba(201,164,76,0.22)', display: 'flex', alignItems: 'center', gap: 8 }}>
              Instagram:
              <a
                href={instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'rgba(201,164,76,0.38)', textDecoration: 'underline', textUnderlineOffset: 4, transition: 'color 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#c9a44c')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(201,164,76,0.38)')}
              >
                {contacts?.instagramLabel || '@adm_mebel_astana'}
              </a>
            </div>
          </div>

        </div>
      </div>
    </footer>
  );
};

export default Footer;

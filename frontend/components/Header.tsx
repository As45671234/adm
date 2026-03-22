
import React, { useMemo, useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Category } from '../types';

interface HeaderProps {
  cartCount: number;
  categories: Category[];
}

const Header: React.FC<HeaderProps> = ({ cartCount, categories }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileCatalogOpen, setMobileCatalogOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      const y = window.scrollY;
      setIsScrolled(y > 20);
    };

    window.addEventListener('scroll', handleScroll, { passive: true } as any);
    return () => window.removeEventListener('scroll', handleScroll as any);
  }, []);

  const navLinks = [
    { name: 'О компании', sectionId: 'about' },
    { name: 'Проекты', sectionId: 'partners' },
    { name: 'Контакты', sectionId: 'contacts' },
  ];

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => a.title.localeCompare(b.title, 'ru')),
    [categories]
  );

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
    <header className="fixed top-0 left-0 z-[60] w-full">
      {/* Thin luxury gold line */}
      <div style={{ height: 1, background: 'linear-gradient(90deg, transparent 0%, rgba(201,164,76,0.45) 15%, #c9a44c 50%, rgba(201,164,76,0.45) 85%, transparent 100%)' }} />

      {/* Main bar */}
      <div
        className="backdrop-blur-2xl"
        style={{
          background: isScrolled ? 'rgba(5,3,1,0.98)' : 'rgba(8,5,2,0.90)',
          borderBottom: '1px solid rgba(201,164,76,0.1)',
          boxShadow: isScrolled ? '0 12px 60px rgba(0,0,0,0.82)' : 'none',
          padding: isScrolled ? '10px 0' : '16px 0',
          transition: 'all 0.45s cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        <div className="container mx-auto px-8 flex items-center justify-between">

          {/* ── Logo ── */}
          <Link to="/" className="flex items-center gap-4 flex-shrink-0">
            <div>
              <div style={{
                fontFamily: "'Montserrat', sans-serif",
                fontSize: '2.35rem',
                fontWeight: 900,
                letterSpacing: '0.06em',
                lineHeight: 0.88,
                textTransform: 'uppercase',
                background: 'linear-gradient(180deg, #f0c75d 0%, #d7a737 42%, #b47c1b 100%)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
                textShadow: '0 0 18px rgba(201,164,76,0.08)',
              }}>
                ADM
              </div>
              <div style={{
                fontFamily: "'Manrope', sans-serif",
                fontSize: '8.5px',
                fontWeight: 500,
                letterSpacing: '0.22em',
                textTransform: 'lowercase',
                color: 'rgba(229, 211, 171, 0.74)',
                marginTop: 3,
                paddingLeft: 2,
              }}>
                Mebel Astana
              </div>
            </div>
            <div style={{
              width: 28,
              height: 1,
              background: 'linear-gradient(90deg, rgba(201,164,76,0), rgba(201,164,76,0.42), rgba(201,164,76,0))',
            }} />
          </Link>

          {/* ── Desktop nav ── */}
          <nav className="hidden md:flex items-center gap-10">
            <div className="relative group">
              <Link
                to="/catalog"
                className="inline-flex items-center gap-2"
                style={{
                  fontFamily: "'Manrope', sans-serif",
                  fontSize: '9.5px', fontWeight: 700,
                  letterSpacing: '0.22em', textTransform: 'uppercase',
                  color: 'rgba(224,206,166,0.62)',
                  textDecoration: 'none', transition: 'color 0.2s',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = '#c9a44c')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(224,206,166,0.62)')}
              >
                Каталог <i className="fas fa-chevron-down" style={{ fontSize: 7, opacity: 0.5 }}></i>
              </Link>
              {sortedCategories.length > 0 && (
                <div className="absolute left-0 top-full pt-5 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-200">
                  <div style={{
                    minWidth: 248, borderRadius: 14,
                    background: 'rgba(5,3,1,0.98)',
                    border: '1px solid rgba(201,164,76,0.18)',
                    boxShadow: '0 28px 72px rgba(0,0,0,0.92)',
                    overflow: 'hidden', backdropFilter: 'blur(24px)',
                  }}>
                    <Link
                      to="/catalog"
                      style={{
                        display: 'block', padding: '13px 20px',
                        fontFamily: "'Manrope', sans-serif",
                        fontSize: '8px', fontWeight: 800,
                        letterSpacing: '0.28em', textTransform: 'uppercase',
                        color: '#c9a44c', textDecoration: 'none', transition: 'background 0.2s',
                      }}
                      onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(201,164,76,0.07)')}
                      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                    >
                      Все товары
                    </Link>
                    <div style={{ height: 1, margin: '0 20px', background: 'rgba(201,164,76,0.1)' }} />
                    {sortedCategories.map(cat => (
                      <Link
                        key={cat.id}
                        to={`/catalog?cat=${cat.id}`}
                        style={{
                          display: 'block', padding: '10px 20px',
                          fontFamily: "'Manrope', sans-serif",
                          fontSize: '12.5px', fontWeight: 500,
                          color: 'rgba(224,206,166,0.58)',
                          textDecoration: 'none', transition: 'all 0.18s',
                        }}
                        onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.color = '#c9a44c'; el.style.background = 'rgba(201,164,76,0.07)'; el.style.paddingLeft = '26px'; }}
                        onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.color = 'rgba(224,206,166,0.58)'; el.style.background = 'transparent'; el.style.paddingLeft = '20px'; }}
                      >
                        {cat.title}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {navLinks.map(link => (
              <button
                key={link.name}
                onClick={() => goToSection(link.sectionId as string)}
                style={{
                  fontFamily: "'Manrope', sans-serif",
                  fontSize: '9.5px', fontWeight: 700,
                  letterSpacing: '0.22em', textTransform: 'uppercase',
                  color: 'rgba(224,206,166,0.62)',
                  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                  transition: 'color 0.2s',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = '#c9a44c')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(224,206,166,0.62)')}
              >
                {link.name}
              </button>
            ))}
          </nav>

          {/* ── Cart + mobile ── */}
          <div className="flex items-center gap-5 flex-shrink-0">
            <Link
              to="/cart"
              className="relative"
              style={{ color: 'rgba(201,164,76,0.58)', transition: 'color 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#c9a44c')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(201,164,76,0.58)')}
            >
              <i className="fas fa-shopping-bag" style={{ fontSize: '1.1rem' }}></i>
              {cartCount > 0 && (
                <span style={{
                  position: 'absolute', top: -8, right: -10,
                  background: '#c9a44c', color: '#090502',
                  fontSize: 8, fontWeight: 900,
                  minWidth: 17, height: 17, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: "'Manrope', sans-serif",
                }}>
                  {cartCount}
                </span>
              )}
            </Link>
            <button
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(201,164,76,0.68)', fontSize: '1.1rem' }}
            >
              <i className={`fas ${mobileMenuOpen ? 'fa-times' : 'fa-bars'}`}></i>
            </button>
          </div>
        </div>
      </div>

      {/* ── Mobile menu ── */}
      {mobileMenuOpen && (
        <div style={{
          background: 'rgba(5,3,1,0.99)',
          borderBottom: '1px solid rgba(201,164,76,0.1)',
          padding: '20px 32px 28px',
          display: 'flex', flexDirection: 'column', gap: 20,
          boxShadow: '0 16px 60px rgba(0,0,0,0.92)',
        }}>
          <div>
            <button
              type="button"
              onClick={() => setMobileCatalogOpen(prev => !prev)}
              style={{
                fontFamily: "'Manrope', sans-serif",
                fontSize: '9px', fontWeight: 800, letterSpacing: '0.3em', textTransform: 'uppercase',
                color: 'rgba(224,206,166,0.68)',
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}
            >
              Каталог <i className={`fas fa-chevron-${mobileCatalogOpen ? 'up' : 'down'}`} style={{ fontSize: 8 }}></i>
            </button>
            {mobileCatalogOpen && (
              <div style={{
                marginTop: 16, paddingLeft: 16,
                borderLeft: '1px solid rgba(201,164,76,0.18)',
                display: 'flex', flexDirection: 'column', gap: 14,
              }}>
                <Link
                  to="/catalog"
                  onClick={() => setMobileMenuOpen(false)}
                  style={{ fontFamily: "'Manrope', sans-serif", fontSize: '12px', fontWeight: 700, color: '#c9a44c', textDecoration: 'none' }}
                >
                  Все товары
                </Link>
                {sortedCategories.map(cat => (
                  <Link
                    key={cat.id}
                    to={`/catalog?cat=${cat.id}`}
                    onClick={() => setMobileMenuOpen(false)}
                    style={{ fontFamily: "'Manrope', sans-serif", fontSize: '12px', fontWeight: 500, color: 'rgba(224,206,166,0.6)', textDecoration: 'none' }}
                  >
                    {cat.title}
                  </Link>
                ))}
              </div>
            )}
          </div>
          {navLinks.map(link => (
            <button
              key={link.name}
              onClick={() => { setMobileMenuOpen(false); goToSection(link.sectionId as string); }}
              style={{
                fontFamily: "'Manrope', sans-serif",
                fontSize: '9px', fontWeight: 800, letterSpacing: '0.3em', textTransform: 'uppercase',
                color: 'rgba(224,206,166,0.68)',
                background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left',
              }}
            >
              {link.name}
            </button>
          ))}
        </div>
      )}
    </header>
  );
};

export default Header;

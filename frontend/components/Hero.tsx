
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { HomeContent } from '../types';

const defaultSlides = [
  {
    title: "ADM Mebel Astana",
    subtitle: "Корпусная мебель на заказ",
    desc: "Проектируем и изготавливаем кухни, шкафы и гардеробные под ваш стиль, размеры и бюджет.",
    img: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1600&q=80",
    color: "bg-zinc-900/55",
    badge: "Собственное производство"
  },
  {
    title: "От идеи до монтажа",
    subtitle: "Срок изготовления от 14 дней",
    desc: "Бесплатный замер, проектирование и чистый монтаж. Гарантия 1 год на выполненные работы.",
    img: "https://images.unsplash.com/photo-1615874959474-d609969a20ed?auto=format&fit=crop&w=1600&q=80",
    color: "bg-stone-900/45",
    badge: "Бесплатный замер"
  }
];

interface HeroProps {
  onConsultationClick: () => void;
  content?: HomeContent | null;
}

const Hero: React.FC<HeroProps> = ({ onConsultationClick, content }) => {
  const [current, setCurrent] = useState(0);
  const slides = Array.isArray(content?.heroSlides) && content?.heroSlides.length > 0 ? content.heroSlides : defaultSlides;
  const primaryBtnText = String(content?.heroButtons?.primaryText || 'Заказать проект');
  const secondaryBtnText = String(content?.heroButtons?.secondaryText || 'Смотреть каталог');

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => setCurrent(p => (p + 1) % slides.length), 8000);
    return () => clearInterval(timer);
  }, [slides.length]);

  return (
    <section className="relative isolate h-[86vh] min-h-[620px] overflow-hidden rounded-b-[2.6rem] border-b border-[var(--adm-border)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(193,148,79,.35),transparent_45%),radial-gradient(circle_at_90%_10%,rgba(255,255,255,.26),transparent_35%)] z-[1] pointer-events-none"></div>
      {slides.map((slide, idx) => (
        <div 
          key={idx}
          className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${idx === current ? 'z-10 opacity-100 pointer-events-auto' : 'z-0 opacity-0 pointer-events-none'}`}
        >
          <img src={slide.img} alt={slide.title} className="absolute inset-0 w-full h-full object-cover" />
          <div className={`absolute inset-0 ${slide.color} pointer-events-none`} />
          <div className="relative z-20 flex h-full items-center">
            <div className="container mx-auto px-6">
              <div className={`relative z-20 max-w-3xl transform transition-all duration-700 ${idx === current ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
                <div className="inline-flex items-center gap-2 mb-5 px-4 py-2 rounded-full border border-white/30 bg-white/10 backdrop-blur-md text-[11px] tracking-[0.22em] uppercase font-bold text-amber-200">
                  <span className="w-2 h-2 rounded-full bg-amber-300"></span>
                  {slide.badge}
                </div>
                <h2 className="text-amber-200 font-extrabold tracking-[0.24em] mb-3 uppercase text-xs md:text-sm">
                  {slide.subtitle}
                </h2>
                <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-white leading-[0.92] mb-6">
                  {slide.title}
                </h1>
                <p className="text-lg md:text-2xl text-stone-100 mb-10 leading-relaxed max-w-2xl">
                  {slide.desc}
                </p>
                <div className="flex flex-wrap gap-4">
                  <button
                    type="button"
                    onClick={onConsultationClick}
                    className="relative z-30 cursor-pointer px-8 py-4 font-black rounded-xl transition-all transform hover:-translate-y-1 shadow-lg uppercase text-sm tracking-[0.16em]"
                    style={{ background: 'var(--adm-accent)', color: '#0d0b07' }}
                  >
                    {primaryBtnText}
                  </button>
                  <Link
                    to="/catalog"
                    className="px-8 py-4 bg-white/15 hover:bg-white/25 border border-white/30 text-white font-bold rounded-xl transition-all backdrop-blur-sm uppercase text-sm tracking-[0.16em]"
                  >
                    {secondaryBtnText}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Indicators */}
      <div className="absolute bottom-10 left-1/2 z-30 flex -translate-x-1/2 gap-3">
        {slides.map((_, idx) => (
          <button 
            key={idx}
            type="button"
            onClick={() => setCurrent(idx)}
            className={`h-1.5 rounded-full transition-all ${idx === current ? 'w-12 bg-amber-400' : 'w-4 bg-white/50'}`}
          />
        ))}
      </div>
    </section>
  );
};

export default Hero;

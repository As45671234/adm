import React, { useEffect, useMemo, useState } from "react";
import { toMediaUrl } from "../services/media";

type Slide = {
  title: string;
  text: string;
  imageUrl: string;
  bullets?: string[];
};

type Props = {
  id?: string;
  heading?: string;
  title?: string;
  slides?: Slide[];
};

const AUTOPLAY_MS = 7000;

export default function InfographicSection({
  id = "about",
  heading = "О компании",
  title = "Мебель, созданная под ваш интерьер",
  slides,
}: Props) {
  const data = useMemo<Slide[]>(
    () =>
      slides ?? [
        {
          title: "ADM Mebel Astana",
          text:
            "Производим корпусную мебель на заказ под интерьер и задачи клиента: кухня, шкафы, гардеробные, прихожие, ТВ-зоны.",
          bullets: ["Индивидуальный проект", "Точное производство", "Монтаж под ключ"],
          imageUrl: "/about/postavka.jpg",
        },
        {
          title: "Проектирование и замер",
          text:
            "Проводим бесплатный замер, подбираем материалы и фурнитуру, учитываем эргономику и стиль помещения.",
          bullets: ["Бесплатный замер", "3D-визуализация", "Подбор фурнитуры"],
          imageUrl: "/about/consultation.jpg",
        },
        {
          title: "Собственное производство",
          text:
            "Изготавливаем мебель на собственном производстве с контролем каждого этапа и аккуратной сборкой.",
          bullets: ["Срок от 14 дней", "Контроль качества", "Чистый монтаж"],
          imageUrl: "/about/control.jpg",
        },
        {
          title: "Гарантия и сервис",
          text:
            "Даем гарантию 1 год и сопровождаем клиента после установки, чтобы мебель служила долго и без проблем.",
          bullets: ["Гарантия 1 год", "Сервисная поддержка", "Прозрачные сроки"],
          imageUrl: "/about/partner.jpg",
        },
      ],
    [slides]
  );

  const [active, setActive] = useState(0);

  useEffect(() => {
    if (data.length <= 1) return;
    const timer = window.setInterval(() => {
      setActive((prev) => (prev + 1) % data.length);
    }, AUTOPLAY_MS);
    return () => window.clearInterval(timer);
  }, [data.length]);

  const goNext = () => setActive((prev) => (prev + 1) % data.length);
  const goPrev = () => setActive((prev) => (prev - 1 + data.length) % data.length);

  const current = data[active];

  return (
    <section id={id} className="py-24 text-[var(--adm-ink)]">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10">
          <div>
            <div className="adm-eyebrow mb-4">
              {heading}
            </div>
            <h2 className="text-4xl md:text-6xl font-black leading-tight text-[var(--adm-ink)]">{title}</h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={goPrev}
              className="w-12 h-12 rounded-2xl border border-[var(--adm-border)] text-[var(--adm-accent)] hover:bg-[var(--adm-bg-soft)] transition-all"
              aria-label="Предыдущий слайд"
            >
              <i className="fas fa-arrow-left"></i>
            </button>
            <button
              type="button"
              onClick={goNext}
              className="w-12 h-12 rounded-2xl border border-[var(--adm-border)] text-[var(--adm-accent)] hover:bg-[var(--adm-bg-soft)] transition-all"
              aria-label="Следующий слайд"
            >
              <i className="fas fa-arrow-right"></i>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-10 items-stretch">
          <div className="adm-section p-8 md:p-10">
            <div className="text-6xl md:text-7xl font-light mb-6" style={{ color: 'var(--adm-accent)', opacity: 0.55 }}>
              {String(active + 1).padStart(2, "0")}
            </div>
            <h3 className="text-2xl md:text-4xl font-black mb-5 text-[var(--adm-ink)]">{current.title}</h3>
            <p className="text-[var(--adm-ink-soft)] leading-relaxed mb-8">{current.text}</p>
            {current.bullets && current.bullets.length > 0 ? (
              <ul className="space-y-3 text-sm text-[var(--adm-ink-soft)]">
                {current.bullets.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="mt-1 w-2 h-2 rounded-full flex-shrink-0" style={{ background: 'var(--adm-accent)' }} />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="relative rounded-3xl overflow-hidden border border-[var(--adm-border)] shadow-2xl">
            <img
              src={toMediaUrl(current.imageUrl) || "/logos/logoadm.jpg"}
              alt={current.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.src = "/logos/logoadm.jpg";
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/35 via-zinc-900/10 to-transparent" />
          </div>
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          {data.map((slide, idx) => (
            <button
              key={slide.title}
              type="button"
              onClick={() => setActive(idx)}
              className={[
                "px-4 py-2 rounded-full text-xs uppercase tracking-widest font-bold transition-all",
                idx === active ? "bg-[var(--adm-accent)] text-black" : "bg-[var(--adm-paper)] text-[var(--adm-ink-soft)] border border-[var(--adm-border)] hover:bg-[var(--adm-bg-soft)]",
              ].join(" ")}
            >
              {String(idx + 1).padStart(2, "0")}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

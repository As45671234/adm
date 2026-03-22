import React from 'react';
import { toMediaUrl } from '../services/media';

const PROJECTS = [
  {
    title: 'Кухня в современном стиле',
    area: '14 м²',
    text: 'Матовые фасады, интегрированная техника, продуманная рабочая зона.',
    image: '/about/control.jpg',
  },
  {
    title: 'Гардеробная комната',
    area: '9 м²',
    text: 'Система хранения с открытыми секциями и скрытой подсветкой.',
    image: '/about/consultation.jpg',
  },
  {
    title: 'Шкаф-купе в прихожую',
    area: '6 м²',
    text: 'Индивидуальная конфигурация под высоту потолка и бытовые сценарии.',
    image: '/about/postavka.jpg',
  },
];

interface ProjectCard {
  title: string;
  area: string;
  text: string;
  image: string;
}

interface PartnersSectionProps {
  sectionLabel?: string;
  title?: string;
  description?: string;
  projects?: ProjectCard[];
}

const PartnersSection: React.FC<PartnersSectionProps> = ({
  sectionLabel = 'Наши проекты',
  title = 'Реализуем мебельные решения для жизни и бизнеса',
  description = 'Работаем по дизайн-проекту или создаем проект с нуля. Берем на себя полный цикл: замер, производство, доставка, монтаж.',
  projects = PROJECTS,
}) => {
  return (
    <section id="partners" className="pb-24">
      <div className="container mx-auto px-6">
        <div className="adm-section p-8 md:p-12 mb-10 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-56 h-56 rounded-full bg-amber-300/20 blur-2xl pointer-events-none"></div>
          <div className="relative z-10 max-w-3xl">
            <div className="adm-eyebrow mb-4">{sectionLabel}</div>
            <h2 className="text-4xl md:text-6xl font-black leading-[0.95] text-[var(--adm-ink)] mb-5">
              {title}
            </h2>
            <p className="text-[var(--adm-ink-soft)] text-lg leading-relaxed">
              {description}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {projects.map((project) => (
            <article key={project.title} className="adm-section p-4 md:p-5">
              <div className="rounded-2xl overflow-hidden h-56 mb-5 border border-[var(--adm-border)]">
                <img
                  src={toMediaUrl(project.image) || '/logos/logoadm.jpg'}
                  alt={project.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.src = '/logos/logoadm.jpg';
                  }}
                />
              </div>
              <div className="text-[11px] uppercase font-black tracking-[0.16em] mb-2" style={{ color: 'var(--adm-accent)' }}>Площадь {project.area}</div>
              <h3 className="text-2xl font-black text-[var(--adm-ink)] mb-2 leading-tight">{project.title}</h3>
              <p className="text-sm text-[var(--adm-ink-soft)] leading-relaxed">{project.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PartnersSection;

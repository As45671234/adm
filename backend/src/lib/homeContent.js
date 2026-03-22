const fs = require("fs");
const path = require("path");

const dataDir = path.join(__dirname, "..", "..", "data");
const dataFile = path.join(dataDir, "home-content.json");

const DEFAULT_HOME_CONTENT = {
  heroSlides: [
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
  ],
  heroButtons: {
    primaryText: "Заказать проект",
    secondaryText: "Смотреть каталог"
  },
  about: {
    sectionLabel: "О компании",
    title: "Мебель, созданная под ваш интерьер",
    slides: [
      {
        title: "ADM Mebel Astana",
        text: "Производим корпусную мебель на заказ под интерьер и задачи клиента: кухня, шкафы, гардеробные, прихожие, ТВ-зоны.",
        imageUrl: "/about/postavka.jpg",
        bullets: ["Индивидуальный проект", "Точное производство", "Монтаж под ключ"]
      },
      {
        title: "Проектирование и замер",
        text: "Проводим бесплатный замер, подбираем материалы и фурнитуру, учитываем эргономику и стиль помещения.",
        imageUrl: "/about/consultation.jpg",
        bullets: ["Бесплатный замер", "3D-визуализация", "Подбор фурнитуры"]
      },
      {
        title: "Собственное производство",
        text: "Изготавливаем мебель на собственном производстве с контролем каждого этапа и аккуратной сборкой.",
        imageUrl: "/about/control.jpg",
        bullets: ["Срок от 14 дней", "Контроль качества", "Чистый монтаж"]
      },
      {
        title: "Гарантия и сервис",
        text: "Даем гарантию 1 год и сопровождаем клиента после установки, чтобы мебель служила долго и без проблем.",
        imageUrl: "/about/partner.jpg",
        bullets: ["Гарантия 1 год", "Сервисная поддержка", "Прозрачные сроки"]
      }
    ]
  },
  projects: {
    sectionLabel: "Наши проекты",
    title: "Реализуем мебельные решения для жизни и бизнеса",
    description: "Работаем по дизайн-проекту или создаем проект с нуля. Берем на себя полный цикл: замер, производство, доставка, монтаж.",
    cards: [
      {
        title: "Кухня в современном стиле",
        area: "14 м²",
        text: "Матовые фасады, интегрированная техника, продуманная рабочая зона.",
        image: "/about/control.jpg"
      },
      {
        title: "Гардеробная комната",
        area: "9 м²",
        text: "Система хранения с открытыми секциями и скрытой подсветкой.",
        image: "/about/consultation.jpg"
      },
      {
        title: "Шкаф-купе в прихожую",
        area: "6 м²",
        text: "Индивидуальная конфигурация под высоту потолка и бытовые сценарии.",
        image: "/about/postavka.jpg"
      }
    ]
  },
  contacts: {
    sectionLabel: "Контакты",
    title: "Свяжитесь с нами",
    description: "Оставьте заявку, и менеджер ADM свяжется с вами, уточнит размеры и подготовит ориентировочный расчет.",
    phoneLabel: "Телефон",
    phoneValue: "+7 707 406 44 99",
    workingHours: "Пн — Сб, 09:00 — 20:00",
    addressLabel: "Адрес",
    addressValue: "Жетиген 37, Astana, Kazakhstan",
    mapTitle: "Мы на карте",
    quickFormTitle: "Быстрая заявка",
    whatsappTitle: "Написать в WhatsApp",
    whatsappText: "Самый быстрый путь получить консультацию и предварительный расчет.",
    whatsappButtonText: "Написать сейчас",
    whatsappPhone: "77074064499",
    whatsappMessage: "Здравствуйте! Хочу заказать консультацию.",
    instagramUrl: "https://www.instagram.com/adm_mebel_astana/",
    instagramLabel: "@adm_mebel_astana"
  }
};

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function cleanText(v, maxLen = 500) {
  const s = String(v || "").trim();
  if (!s) return "";
  return s.slice(0, maxLen);
}

function cleanSlide(raw, fallback) {
  const s = asObject(raw);
  return {
    title: cleanText(s.title, 120) || fallback.title,
    subtitle: cleanText(s.subtitle, 140) || fallback.subtitle,
    desc: cleanText(s.desc, 420) || fallback.desc,
    img: cleanText(s.img, 1200) || fallback.img,
    color: cleanText(s.color, 60) || fallback.color,
    badge: cleanText(s.badge, 120) || fallback.badge,
  };
}

function cleanList(raw, limit = 6, maxLen = 120) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => cleanText(item, maxLen))
    .filter(Boolean)
    .slice(0, limit);
}

function cleanAboutSlide(raw, fallback) {
  const s = asObject(raw);
  const bullets = cleanList(s.bullets, 6, 80);
  return {
    title: cleanText(s.title, 120) || fallback.title,
    text: cleanText(s.text, 420) || fallback.text,
    imageUrl: cleanText(s.imageUrl, 1200) || fallback.imageUrl,
    bullets: bullets.length ? bullets : fallback.bullets,
  };
}

function cleanProjectCard(raw, fallback) {
  const s = asObject(raw);
  return {
    title: cleanText(s.title, 120) || fallback.title,
    area: cleanText(s.area, 40) || fallback.area,
    text: cleanText(s.text, 240) || fallback.text,
    image: cleanText(s.image, 1200) || fallback.image,
  };
}

function normalizeHomeContent(raw) {
  const content = asObject(raw);
  const heroSlidesRaw = Array.isArray(content.heroSlides) ? content.heroSlides : [];
  const heroSlides = (heroSlidesRaw.length ? heroSlidesRaw : DEFAULT_HOME_CONTENT.heroSlides)
    .slice(0, 6)
    .map((slide, idx) => cleanSlide(slide, DEFAULT_HOME_CONTENT.heroSlides[idx % DEFAULT_HOME_CONTENT.heroSlides.length]));

  const heroButtonsRaw = asObject(content.heroButtons);
  const aboutRaw = asObject(content.about);
  const projectsRaw = asObject(content.projects);
  const contactsRaw = asObject(content.contacts);

  const aboutSlidesRaw = Array.isArray(aboutRaw.slides) ? aboutRaw.slides : [];
  const aboutSlides = (aboutSlidesRaw.length ? aboutSlidesRaw : DEFAULT_HOME_CONTENT.about.slides)
    .slice(0, 8)
    .map((slide, idx) => cleanAboutSlide(slide, DEFAULT_HOME_CONTENT.about.slides[idx % DEFAULT_HOME_CONTENT.about.slides.length]));

  const projectCardsRaw = Array.isArray(projectsRaw.cards) ? projectsRaw.cards : [];
  const projectCards = (projectCardsRaw.length ? projectCardsRaw : DEFAULT_HOME_CONTENT.projects.cards)
    .slice(0, 6)
    .map((card, idx) => cleanProjectCard(card, DEFAULT_HOME_CONTENT.projects.cards[idx % DEFAULT_HOME_CONTENT.projects.cards.length]));

  return {
    heroSlides,
    heroButtons: {
      primaryText: cleanText(heroButtonsRaw.primaryText, 60) || DEFAULT_HOME_CONTENT.heroButtons.primaryText,
      secondaryText: cleanText(heroButtonsRaw.secondaryText, 60) || DEFAULT_HOME_CONTENT.heroButtons.secondaryText,
    },
    about: {
      sectionLabel: cleanText(aboutRaw.sectionLabel, 40) || DEFAULT_HOME_CONTENT.about.sectionLabel,
      title: cleanText(aboutRaw.title, 120) || DEFAULT_HOME_CONTENT.about.title,
      slides: aboutSlides,
    },
    projects: {
      sectionLabel: cleanText(projectsRaw.sectionLabel, 40) || DEFAULT_HOME_CONTENT.projects.sectionLabel,
      title: cleanText(projectsRaw.title, 120) || DEFAULT_HOME_CONTENT.projects.title,
      description: cleanText(projectsRaw.description, 420) || DEFAULT_HOME_CONTENT.projects.description,
      cards: projectCards,
    },
    contacts: {
      sectionLabel: cleanText(contactsRaw.sectionLabel, 40) || DEFAULT_HOME_CONTENT.contacts.sectionLabel,
      title: cleanText(contactsRaw.title, 80) || DEFAULT_HOME_CONTENT.contacts.title,
      description: cleanText(contactsRaw.description, 420) || DEFAULT_HOME_CONTENT.contacts.description,
      phoneLabel: cleanText(contactsRaw.phoneLabel, 40) || DEFAULT_HOME_CONTENT.contacts.phoneLabel,
      phoneValue: cleanText(contactsRaw.phoneValue, 60) || DEFAULT_HOME_CONTENT.contacts.phoneValue,
      workingHours: cleanText(contactsRaw.workingHours, 80) || DEFAULT_HOME_CONTENT.contacts.workingHours,
      addressLabel: cleanText(contactsRaw.addressLabel, 40) || DEFAULT_HOME_CONTENT.contacts.addressLabel,
      addressValue: cleanText(contactsRaw.addressValue, 140) || DEFAULT_HOME_CONTENT.contacts.addressValue,
      mapTitle: cleanText(contactsRaw.mapTitle, 60) || DEFAULT_HOME_CONTENT.contacts.mapTitle,
      quickFormTitle: cleanText(contactsRaw.quickFormTitle, 80) || DEFAULT_HOME_CONTENT.contacts.quickFormTitle,
      whatsappTitle: cleanText(contactsRaw.whatsappTitle, 80) || DEFAULT_HOME_CONTENT.contacts.whatsappTitle,
      whatsappText: cleanText(contactsRaw.whatsappText, 240) || DEFAULT_HOME_CONTENT.contacts.whatsappText,
      whatsappButtonText: cleanText(contactsRaw.whatsappButtonText, 50) || DEFAULT_HOME_CONTENT.contacts.whatsappButtonText,
      whatsappPhone: cleanText(contactsRaw.whatsappPhone, 30) || DEFAULT_HOME_CONTENT.contacts.whatsappPhone,
      whatsappMessage: cleanText(contactsRaw.whatsappMessage, 240) || DEFAULT_HOME_CONTENT.contacts.whatsappMessage,
      instagramUrl: cleanText(contactsRaw.instagramUrl, 300) || DEFAULT_HOME_CONTENT.contacts.instagramUrl,
      instagramLabel: cleanText(contactsRaw.instagramLabel, 80) || DEFAULT_HOME_CONTENT.contacts.instagramLabel,
    },
  };
}

function ensureDataDir() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
}

function readHomeContent() {
  ensureDataDir();

  if (!fs.existsSync(dataFile)) {
    const normalized = normalizeHomeContent(DEFAULT_HOME_CONTENT);
    fs.writeFileSync(dataFile, JSON.stringify(normalized, null, 2), "utf8");
    return normalized;
  }

  try {
    const raw = JSON.parse(fs.readFileSync(dataFile, "utf8"));
    const normalized = normalizeHomeContent(raw);
    fs.writeFileSync(dataFile, JSON.stringify(normalized, null, 2), "utf8");
    return normalized;
  } catch (e) {
    const normalized = normalizeHomeContent(DEFAULT_HOME_CONTENT);
    fs.writeFileSync(dataFile, JSON.stringify(normalized, null, 2), "utf8");
    return normalized;
  }
}

function saveHomeContent(payload) {
  ensureDataDir();
  const normalized = normalizeHomeContent(payload);
  fs.writeFileSync(dataFile, JSON.stringify(normalized, null, 2), "utf8");
  return normalized;
}

module.exports = {
  readHomeContent,
  saveHomeContent,
  DEFAULT_HOME_CONTENT,
};

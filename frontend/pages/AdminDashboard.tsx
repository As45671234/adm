
import React, { useEffect, useState } from 'react';
import { Category, HomeContent } from '../types';
import { getAdminToken, fetchAdminCatalog, adminImportExcel, adminPatchProduct, adminDeleteProduct, adminCreateProduct, fetchCatalog, adminFetchOrders, adminFetchOrder, adminPatchOrder, adminDeleteOrder, adminExportOrder, adminFetchLeads, adminFetchLead, adminPatchLead, adminDeleteLead, adminUploadProductImage, adminPatchCategory, adminFetchCategories, adminCreateCategory, adminFetchSiteHomeContent, adminPatchSiteHomeContent } from '../services/api';

interface AdminDashboardProps {
  categories: Category[];
  setCategories: (cats: Category[]) => void;
  setHomeContent?: (content: HomeContent | null) => void;
  onLogout: () => void;
}

type ProductCharacteristicDraft = {
  id: string;
  key: string;
  value: string;
};

type ProductEditorForm = {
  category_title: string;
  name: string;
  brandOrGroup: string;
  unit: string;
  sku: string;
  image: string;
  description: string;
  prices: {
    retail: string;
  };
  attrs: {
    width_mm: string;
    length_mm: string;
    image2: string;
    image3: string;
    gallery_images: string;
  };
  characteristics: ProductCharacteristicDraft[];
  initialCharacteristicKeys: string[];
  inStock: boolean;
};

const PRODUCT_PRICE_FIELDS: Array<{ label: string; key: keyof ProductEditorForm['prices'] }> = [
  { label: 'Цена', key: 'retail' },
];

const PRODUCT_CORE_ATTR_FIELDS: Array<{ label: string; key: keyof ProductEditorForm['attrs']; full?: boolean }> = [
  { label: 'Ширина (мм)', key: 'width_mm' },
  { label: 'Длина (мм)', key: 'length_mm' },
];

const PRODUCT_CORE_ATTR_KEYS = new Set<string>([
  ...PRODUCT_CORE_ATTR_FIELDS.map((item) => item.key),
  'image2',
  'image3',
  'gallery_images',
]);

const PRODUCT_ATTR_LABELS: Record<string, string> = {
  width_mm: 'Ширина (мм)',
  height_mm: 'Высота (мм)',
  length_mm: 'Длина (мм)',
  thickness_mm: 'Толщина (мм)',
  roll_size_mm: 'Размер рулона',
  pack_area_m2: 'Площадь в пачке (м2)',
  pack_volume_m3: 'Объем в пачке (м3)',
  roll_area_m2: 'Площадь в рулоне (м2)',
  pack_qty: 'Количество / кратность',
  marking: 'Маркировка',
  material: 'Материал',
  form: 'Форма',
  color: 'Цвет',
  mechanism: 'Механизм',
};

function makeCharacteristicDraft(key = '', value = ''): ProductCharacteristicDraft {
  return {
    id: `char-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    key,
    value,
  };
}

function createEmptyProductForm(): ProductEditorForm {
  return {
    category_title: '',
    name: '',
    brandOrGroup: '',
    unit: 'шт',
    sku: '',
    image: '',
    description: '',
    prices: {
      retail: '',
    },
    attrs: {
      width_mm: '',
      length_mm: '',
      image2: '',
      image3: '',
      gallery_images: '',
    },
    characteristics: [],
    initialCharacteristicKeys: [],
    inStock: true,
  };
}

function stringifyAttrValue(value: unknown) {
  if (Array.isArray(value)) return value.join(', ');
  if (value === undefined || value === null) return '';
  return String(value);
}

function formatCharacteristicLabel(key: string) {
  const normalized = String(key || '').trim();
  if (!normalized) return 'Название характеристики';
  if (PRODUCT_ATTR_LABELS[normalized]) return PRODUCT_ATTR_LABELS[normalized];
  const withSpaces = normalized.replace(/_/g, ' ').trim();
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
}

function buildProductFormFromProduct(prod: any, categoryTitle: string): ProductEditorForm {
  const form = createEmptyProductForm();
  const attrs = prod?.attrs && typeof prod.attrs === 'object' ? prod.attrs : {};
  const characteristics = Object.entries(attrs)
    .filter(([key]) => !PRODUCT_CORE_ATTR_KEYS.has(key))
    .map(([key, value]) => makeCharacteristicDraft(String(key), stringifyAttrValue(value)));

  return {
    ...form,
    category_title: categoryTitle,
    name: String(prod?.name || ''),
    brandOrGroup: String(prod?.brandOrGroup || ''),
    unit: String(prod?.unit || 'шт'),
    sku: String(prod?.sku || ''),
    image: String(prod?.image || ''),
    description: String(prod?.description || ''),
    prices: {
      retail: prod?.prices?.retail !== undefined ? String(prod.prices.retail) : '',
    },
    attrs: {
      width_mm: stringifyAttrValue(attrs.width_mm),
      length_mm: stringifyAttrValue(attrs.length_mm),
      image2: stringifyAttrValue(attrs.image2),
      image3: stringifyAttrValue(attrs.image3),
      gallery_images: stringifyAttrValue(attrs.gallery_images),
    },
    characteristics,
    initialCharacteristicKeys: characteristics.map((item) => item.key.trim()).filter(Boolean),
    inStock: !!prod?.inStock,
  };
}

const DEFAULT_HOME_CONTENT_DRAFT: HomeContent = {
  heroSlides: [
    {
      title: 'ADM Mebel Astana',
      subtitle: 'Корпусная мебель на заказ',
      desc: 'Проектируем и изготавливаем кухни, шкафы и гардеробные под ваш стиль, размеры и бюджет.',
      img: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1600&q=80',
      color: 'bg-zinc-900/55',
      badge: 'Собственное производство',
    },
    {
      title: 'От идеи до монтажа',
      subtitle: 'Срок изготовления от 14 дней',
      desc: 'Бесплатный замер, проектирование и чистый монтаж. Гарантия 1 год на выполненные работы.',
      img: 'https://images.unsplash.com/photo-1615874959474-d609969a20ed?auto=format&fit=crop&w=1600&q=80',
      color: 'bg-stone-900/45',
      badge: 'Бесплатный замер',
    },
  ],
  heroButtons: {
    primaryText: 'Заказать проект',
    secondaryText: 'Смотреть каталог',
  },
  about: {
    sectionLabel: 'О компании',
    title: 'Мебель, созданная под ваш интерьер',
    slides: [
      {
        title: 'ADM Mebel Astana',
        text: 'Производим корпусную мебель на заказ под интерьер и задачи клиента: кухня, шкафы, гардеробные, прихожие, ТВ-зоны.',
        imageUrl: '/about/postavka.jpg',
        bullets: ['Индивидуальный проект', 'Точное производство', 'Монтаж под ключ'],
      },
      {
        title: 'Проектирование и замер',
        text: 'Проводим бесплатный замер, подбираем материалы и фурнитуру, учитываем эргономику и стиль помещения.',
        imageUrl: '/about/consultation.jpg',
        bullets: ['Бесплатный замер', '3D-визуализация', 'Подбор фурнитуры'],
      },
      {
        title: 'Собственное производство',
        text: 'Изготавливаем мебель на собственном производстве с контролем каждого этапа и аккуратной сборкой.',
        imageUrl: '/about/control.jpg',
        bullets: ['Срок от 14 дней', 'Контроль качества', 'Чистый монтаж'],
      },
      {
        title: 'Гарантия и сервис',
        text: 'Даем гарантию 1 год и сопровождаем клиента после установки, чтобы мебель служила долго и без проблем.',
        imageUrl: '/about/partner.jpg',
        bullets: ['Гарантия 1 год', 'Сервисная поддержка', 'Прозрачные сроки'],
      },
    ],
  },
  projects: {
    sectionLabel: 'Наши проекты',
    title: 'Реализуем мебельные решения для жизни и бизнеса',
    description: 'Работаем по дизайн-проекту или создаем проект с нуля. Берем на себя полный цикл: замер, производство, доставка, монтаж.',
    cards: [
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
    ],
  },
  contacts: {
    sectionLabel: 'Контакты',
    title: 'Свяжитесь с нами',
    description: 'Оставьте заявку, и менеджер ADM свяжется с вами, уточнит размеры и подготовит ориентировочный расчет.',
    phoneLabel: 'Телефон',
    phoneValue: '+7 707 406 44 99',
    workingHours: 'Пн — Сб, 09:00 — 20:00',
    addressLabel: 'Адрес',
    addressValue: 'Жетиген 37, Astana, Kazakhstan',
    mapTitle: 'Мы на карте',
    quickFormTitle: 'Быстрая заявка',
    whatsappTitle: 'Написать в WhatsApp',
    whatsappText: 'Самый быстрый путь получить консультацию и предварительный расчет.',
    whatsappButtonText: 'Написать сейчас',
    whatsappPhone: '77074064499',
    whatsappMessage: 'Здравствуйте! Хочу заказать консультацию.',
    instagramUrl: 'https://www.instagram.com/adm_mebel_astana/',
    instagramLabel: '@adm_mebel_astana',
  },
};

function normalizeHomeContentDraft(content?: HomeContent | null): HomeContent {
  const source = content || ({} as HomeContent);
  return {
    heroSlides: DEFAULT_HOME_CONTENT_DRAFT.heroSlides.map((slide, idx) => ({
      ...slide,
      ...((source.heroSlides || [])[idx] || {}),
    })),
    heroButtons: {
      ...DEFAULT_HOME_CONTENT_DRAFT.heroButtons,
      ...(source.heroButtons || {}),
    },
    about: {
      sectionLabel: source.about?.sectionLabel || DEFAULT_HOME_CONTENT_DRAFT.about.sectionLabel,
      title: source.about?.title || DEFAULT_HOME_CONTENT_DRAFT.about.title,
      slides: DEFAULT_HOME_CONTENT_DRAFT.about.slides.map((slide, idx) => ({
        ...slide,
        ...((source.about?.slides || [])[idx] || {}),
        bullets: Array.isArray((source.about?.slides || [])[idx]?.bullets)
          ? (source.about?.slides || [])[idx].bullets
          : slide.bullets,
      })),
    },
    projects: {
      sectionLabel: source.projects?.sectionLabel || DEFAULT_HOME_CONTENT_DRAFT.projects.sectionLabel,
      title: source.projects?.title || DEFAULT_HOME_CONTENT_DRAFT.projects.title,
      description: source.projects?.description || DEFAULT_HOME_CONTENT_DRAFT.projects.description,
      cards: DEFAULT_HOME_CONTENT_DRAFT.projects.cards.map((card, idx) => ({
        ...card,
        ...((source.projects?.cards || [])[idx] || {}),
      })),
    },
    contacts: {
      ...DEFAULT_HOME_CONTENT_DRAFT.contacts,
      ...(source.contacts || {}),
    },
  };
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ setCategories, setHomeContent, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'inventory' | 'import' | 'orders' | 'leads' | 'categories' | 'homepage'>('inventory');
  const [isImporting, setIsImporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [invPage, setInvPage] = useState(1);
  const INV_PAGE_SIZE = 30;
  const [adminCategories, setAdminCategories] = useState<Category[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editId, setEditId] = useState<string>('');
  const [addForm, setAddForm] = useState<ProductEditorForm>(createEmptyProductForm());

  const [editForm, setEditForm] = useState<ProductEditorForm>(createEmptyProductForm());
  const token = getAdminToken();
  const [addImageUploading, setAddImageUploading] = useState(false);
  const [editImageUploading, setEditImageUploading] = useState(false);
  const [editExtraImageUploading, setEditExtraImageUploading] = useState<Record<'image2' | 'image3', boolean>>({
    image2: false,
    image3: false,
  });
  const [categoryImageUploading, setCategoryImageUploading] = useState<Record<string, boolean>>({});
  const [categoryImageSaving, setCategoryImageSaving] = useState<Record<string, boolean>>({});
  const [categoryImageDrafts, setCategoryImageDrafts] = useState<Record<string, string>>({});

  // Import tab: category selection
  const [importCategoryId, setImportCategoryId] = useState('');
  const [importCategoryTitle, setImportCategoryTitle] = useState('');
  const [importCategories, setImportCategories] = useState<any[]>([]);
  const [importShowNewCat, setImportShowNewCat] = useState(false);
  const [importNewCatTitle, setImportNewCatTitle] = useState('');
  const [importNewCatSaving, setImportNewCatSaving] = useState(false);

  // Categories tab: add category
  const [addCatTitle, setAddCatTitle] = useState('');
  const [addCatSaving, setAddCatSaving] = useState(false);

  // Orders
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersTotal, setOrdersTotal] = useState(0);
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersLimit, setOrdersLimit] = useState(25);
  const [ordersStatus, setOrdersStatus] = useState<string>('');
  const [ordersSortBy, setOrdersSortBy] = useState<'date' | 'status'>('date');
  const [ordersSortDir, setOrdersSortDir] = useState<'asc' | 'desc'>('desc');

  const [isOrderOpen, setIsOrderOpen] = useState(false);
  const [orderLoading, setOrderLoading] = useState(false);
  const [activeOrder, setActiveOrder] = useState<any | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string>('');

  // Leads
  const [leads, setLeads] = useState<any[]>([]);
  const [leadsTotal, setLeadsTotal] = useState(0);
  const [leadsPage, setLeadsPage] = useState(1);
  const [leadsLimit, setLeadsLimit] = useState(25);
  const [leadsStatus, setLeadsStatus] = useState<string>('');
  const [leadsSortDir, setLeadsSortDir] = useState<'asc' | 'desc'>('desc');

  const [isLeadOpen, setIsLeadOpen] = useState(false);
  const [leadLoading, setLeadLoading] = useState(false);
  const [activeLead, setActiveLead] = useState<any | null>(null);
  const [deleteLeadConfirmId, setDeleteLeadConfirmId] = useState<string>('');

  const [homeContentDraft, setHomeContentDraft] = useState<HomeContent | null>(null);
  const [homeLoading, setHomeLoading] = useState(false);
  const [homeSaving, setHomeSaving] = useState(false);
  const [homeImageUploading, setHomeImageUploading] = useState<Record<string, boolean>>({});

  const loadHomeContent = async () => {
    if (!token) return;
    setHomeLoading(true);
    try {
      const res = await adminFetchSiteHomeContent(token);
      const next = normalizeHomeContentDraft((res?.content || null) as HomeContent | null);
      setHomeContentDraft(next);
      setHomeContent?.(next);
    } catch (e: any) {
      alert(e?.message || 'Ошибка загрузки контента главной');
    } finally {
      setHomeLoading(false);
    }
  };

  const loadLeads = async (page = leadsPage) => {
    if (!token) return;
    const data = await adminFetchLeads(token, {
      page,
      limit: leadsLimit,
      status: leadsStatus || undefined,
      sortDir: leadsSortDir,
    });
    setLeads(data.items || []);
    setLeadsTotal(Number(data.total || 0));
    setLeadsPage(Number(data.page || page));
  };

  const openLead = async (id: string) => {
    if (!token) return;
    setIsLeadOpen(true);
    setLeadLoading(true);
    setActiveLead(null);
    try {
      const data = await adminFetchLead(token, id);
      setActiveLead(data.lead);
    } finally {
      setLeadLoading(false);
    }
  };

  const loadImportCategories = async () => {
    if (!token) return;
    try {
      const data = await adminFetchCategories(token);
      setImportCategories(data.categories || []);
    } catch {}
  };

  const createImportCategory = async () => {
    const title = importNewCatTitle.trim();
    if (!title || !token) return;
    setImportNewCatSaving(true);
    try {
      const res = await adminCreateCategory(token, { title });
      const cat = res.category;
      setImportCategories((prev) => {
        const filtered = prev.filter((c) => c.id !== cat.id);
        return [...filtered, cat].sort((a, b) => String(a.title || '').localeCompare(String(b.title || ''), 'ru'));
      });
      setImportCategoryId(cat.id);
      setImportCategoryTitle(cat.title || title);
      setImportShowNewCat(false);
      setImportNewCatTitle('');
    } catch (e: any) {
      alert(e?.message || 'Ошибка создания категории');
    } finally {
      setImportNewCatSaving(false);
    }
  };

  const createTabCategory = async () => {
    const title = addCatTitle.trim();
    if (!title || !token) return;
    setAddCatSaving(true);
    try {
      await adminCreateCategory(token, { title });
      setAddCatTitle('');
      await Promise.allSettled([refreshAll(), loadImportCategories()]);
    } catch (e: any) {
      alert(e?.message || 'Ошибка создания категории');
    } finally {
      setAddCatSaving(false);
    }
  };

  const loadOrders = async (page = ordersPage) => {
    if (!token) return;
    const data = await adminFetchOrders(token, {
      page,
      limit: ordersLimit,
      status: ordersStatus || undefined,
      sortBy: ordersSortBy,
      sortDir: ordersSortDir,
    });
    setOrders(data.items || []);
    setOrdersTotal(Number(data.total || 0));
    setOrdersPage(Number(data.page || page));
  };

  const openOrder = async (id: string) => {
    if (!token) return;
    setIsOrderOpen(true);
    setOrderLoading(true);
    setActiveOrder(null);
    try {
      const data = await adminFetchOrder(token, id);
      setActiveOrder(data.order);
    } finally {
      setOrderLoading(false);
    }
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const parseNum = (v: string) => {
    const s = String(v || '').trim();
    if (!s) return undefined;
    const n = Number(s.replace(/\s+/g, '').replace(',', '.'));
    return Number.isFinite(n) ? n : undefined;
  };

  const refreshAdmin = async () => {
    const data = await fetchAdminCatalog(token);
    setAdminCategories(data.categories as any);
  };

  const refreshPublic = async () => {
    const data = await fetchCatalog();
    setCategories(data.categories as any);
  };

  const refreshAll = async () => {
    await Promise.allSettled([refreshAdmin(), refreshPublic()]);
  };

  const updateAddPrice = (key: keyof ProductEditorForm['prices'], value: string) => {
    setAddForm((prev) => ({
      ...prev,
      prices: {
        ...prev.prices,
        [key]: value,
      },
    }));
  };

  const updateEditPrice = (key: keyof ProductEditorForm['prices'], value: string) => {
    setEditForm((prev) => ({
      ...prev,
      prices: {
        ...prev.prices,
        [key]: value,
      },
    }));
  };

  const updateAddAttr = (key: keyof ProductEditorForm['attrs'], value: string) => {
    setAddForm((prev) => ({
      ...prev,
      attrs: {
        ...prev.attrs,
        [key]: value,
      },
    }));
  };

  const updateEditAttr = (key: keyof ProductEditorForm['attrs'], value: string) => {
    setEditForm((prev) => ({
      ...prev,
      attrs: {
        ...prev.attrs,
        [key]: value,
      },
    }));
  };

  const addAddCharacteristic = () => {
    setAddForm((prev) => ({
      ...prev,
      characteristics: [...prev.characteristics, makeCharacteristicDraft()],
    }));
  };

  const addEditCharacteristic = () => {
    setEditForm((prev) => ({
      ...prev,
      characteristics: [...prev.characteristics, makeCharacteristicDraft()],
    }));
  };

  const updateAddCharacteristic = (id: string, field: 'key' | 'value', value: string) => {
    setAddForm((prev) => ({
      ...prev,
      characteristics: prev.characteristics.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    }));
  };

  const updateEditCharacteristic = (id: string, field: 'key' | 'value', value: string) => {
    setEditForm((prev) => ({
      ...prev,
      characteristics: prev.characteristics.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    }));
  };

  const removeAddCharacteristic = (id: string) => {
    setAddForm((prev) => ({
      ...prev,
      characteristics: prev.characteristics.filter((item) => item.id !== id),
    }));
  };

  const removeEditCharacteristic = (id: string) => {
    setEditForm((prev) => ({
      ...prev,
      characteristics: prev.characteristics.filter((item) => item.id !== id),
    }));
  };

  useEffect(() => {
    refreshAll();
  }, []);

useEffect(() => {
    if (activeTab !== 'orders') return;
    loadOrders(ordersPage);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, ordersPage, ordersLimit, ordersStatus, ordersSortBy, ordersSortDir]);

  useEffect(() => {
    if (activeTab !== 'leads') return;
    loadLeads(leadsPage);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, leadsPage, leadsLimit, leadsStatus, leadsSortDir]);

  useEffect(() => { setInvPage(1); }, [searchTerm]);

  useEffect(() => {
    if (activeTab !== 'import') return;
    loadImportCategories();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== 'homepage') return;
    loadHomeContent();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    setCategoryImageDrafts((prev) => {
      const next = { ...prev };
      adminCategories.forEach((cat: any) => {
        const id = String(cat.id || "");
        if (!id) return;
        if (next[id] === undefined || next[id] === "") {
          const fallback = String((cat.items || []).find((it: any) => it?.image)?.image || "");
          next[id] = String(cat.image || "") || fallback;
        }
      });
      return next;
    });
  }, [adminCategories]);


  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!importCategoryId) {
      alert('Сначала выберите категорию для импорта');
      e.target.value = '';
      return;
    }

    setIsImporting(true);
    try {
      const result = await adminImportExcel(token, file, importCategoryId, importCategoryTitle);
      await refreshAll();
      alert(`Импорт завершён: добавлено ${result.inserted}, обновлено ${result.updated}, пропущено ${result.skipped}`);
      setActiveTab('inventory');
    } catch (error: any) {
      console.error(error);
      alert(error?.message || 'Ошибка при импорте Excel файла');
    } finally {
      setIsImporting(false);
      e.target.value = '';
    }
  };

  const toggleProductStock = async (prodId: string, current: boolean) => {
    try {
      await adminPatchProduct(token, prodId, { inStock: !current });
      await refreshAll();
    } catch (e: any) {
      alert(e?.message || 'Ошибка');
    }
  };

  const openEditModal = (prod: any, categoryTitle: string) => {
    setEditId(String(prod.id));
    setEditForm(buildProductFormFromProduct(prod, categoryTitle));
    setIsEditOpen(true);
  };

  const submitEditProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editId) return;

    const prices: any = {};
    Object.entries(editForm.prices).forEach(([key, value]) => {
      const parsed = parseNum(String(value || ''));
      prices[key] = parsed !== undefined ? parsed : '';
    });

    const attrs: any = {};
    Object.entries(editForm.attrs).forEach(([key, value]) => {
      const trimmed = String(value || '').trim();
      if (key === 'pack_volume_m3') {
        const parsed = parseNum(trimmed);
        attrs.pack_volume_m3 = parsed !== undefined ? parsed : '';
        return;
      }
      if (key === 'gallery_images') {
        attrs.gallery_images = trimmed
          .split(/[,;\n]/)
          .map((item) => item.trim())
          .filter(Boolean);
        return;
      }
      attrs[key] = trimmed;
    });

    const currentCharacteristicKeys = new Set<string>();
    editForm.characteristics.forEach((item) => {
      const key = String(item.key || '').trim();
      if (!key) return;
      currentCharacteristicKeys.add(key);
      attrs[key] = String(item.value || '').trim();
    });
    editForm.initialCharacteristicKeys.forEach((key) => {
      if (!currentCharacteristicKeys.has(key)) {
        attrs[key] = '';
      }
    });

    try {
      await adminPatchProduct(token, editId, {
        name: editForm.name,
        brandOrGroup: editForm.brandOrGroup,
        unit: editForm.unit,
        sku: editForm.sku,
        image: editForm.image,
        description: editForm.description,
        inStock: editForm.inStock,
        prices,
        attrs,
      });
      setIsEditOpen(false);
      await refreshAll();
    } catch (err: any) {
      alert(err?.message || 'Ошибка');
    }
  };

  const deleteProduct = async (prodId: string) => {
    if (!confirm('Удалить товар навсегда?')) return;
    try {
      await adminDeleteProduct(token, prodId);
      await refreshAll();
    } catch (e: any) {
      alert(e?.message || 'Ошибка');
    }
  };

  const openAddModal = () => {
    setAddForm(createEmptyProductForm());
    setIsAddOpen(true);
  };

  const toNumberOrUndefined = (v: string) => {
    const s = String(v || '').trim();
    if (!s) return undefined;
    const n = Number(s.replace(/\s+/g, '').replace(',', '.'));
    return Number.isFinite(n) ? n : undefined;
  };

  const uploadImageForAdd = async (file?: File | null) => {
    if (!file || !token) return;
    setAddImageUploading(true);
    try {
      const res = await adminUploadProductImage(token, file);
      setAddForm((prev) => ({ ...prev, image: res.imageUrl || '' }));
    } catch (e: any) {
      alert(e?.message || 'Ошибка загрузки изображения');
    } finally {
      setAddImageUploading(false);
    }
  };

  const uploadImageForEdit = async (file?: File | null) => {
    if (!file || !token) return;
    setEditImageUploading(true);
    try {
      const res = await adminUploadProductImage(token, file);
      const imageUrl = String(res.imageUrl || '');
      setEditForm((prev) => ({ ...prev, image: imageUrl }));

      // Save main image immediately for the same UX as extra photos.
      if (editId) {
        await adminPatchProduct(token, editId, { image: imageUrl });
      }
    } catch (e: any) {
      alert(e?.message || 'Ошибка загрузки изображения');
    } finally {
      setEditImageUploading(false);
    }
  };

  const uploadImageForEditExtra = async (slot: 'image2' | 'image3', file?: File | null) => {
    if (!file || !token) return;
    setEditExtraImageUploading((prev) => ({ ...prev, [slot]: true }));
    try {
      const res = await adminUploadProductImage(token, file);
      const imageUrl = String(res.imageUrl || '');
      setEditForm((prev) => ({
        ...prev,
        attrs: {
          ...prev.attrs,
          [slot]: imageUrl,
        },
      }));

      // Save this slot immediately so user doesn't lose it if modal is closed.
      if (editId) {
        await adminPatchProduct(token, editId, {
          attrs: {
            [slot]: imageUrl,
          },
        });
      }
    } catch (e: any) {
      alert(e?.message || 'Ошибка загрузки изображения');
    } finally {
      setEditExtraImageUploading((prev) => ({ ...prev, [slot]: false }));
    }
  };

  const removeMainImageForEdit = async () => {
    setEditForm((prev) => ({ ...prev, image: '' }));
    if (!token || !editId) return;
    try {
      await adminPatchProduct(token, editId, { image: '' });
    } catch (e: any) {
      alert(e?.message || 'Ошибка удаления изображения');
    }
  };

  const removeExtraImageForEdit = async (slot: 'image2' | 'image3') => {
    setEditForm((prev) => ({
      ...prev,
      attrs: {
        ...prev.attrs,
        [slot]: '',
      },
    }));
    if (!token || !editId) return;
    try {
      await adminPatchProduct(token, editId, { attrs: { [slot]: '' } });
    } catch (e: any) {
      alert(e?.message || 'Ошибка удаления изображения');
    }
  };

  const clearGalleryForEdit = async () => {
    setEditForm((prev) => ({
      ...prev,
      attrs: {
        ...prev.attrs,
        gallery_images: '',
      },
    }));
    if (!token || !editId) return;
    try {
      await adminPatchProduct(token, editId, { attrs: { gallery_images: [] } });
    } catch (e: any) {
      alert(e?.message || 'Ошибка очистки галереи');
    }
  };

  const saveCategoryImage = async (catId: string, title: string) => {
    if (!token) return;
    const image = String(categoryImageDrafts[catId] || "");
    setCategoryImageSaving((prev) => ({ ...prev, [catId]: true }));
    try {
      await adminPatchCategory(token, catId, { image, title });
      await refreshAll();
    } catch (e: any) {
      alert(e?.message || "Ошибка сохранения категории");
    } finally {
      setCategoryImageSaving((prev) => ({ ...prev, [catId]: false }));
    }
  };

  const updateHomeSlideField = (idx: number, field: keyof HomeContent['heroSlides'][number], value: string) => {
    setHomeContentDraft((prev) => {
      if (!prev) return prev;
      const nextSlides = [...(prev.heroSlides || [])];
      const current = nextSlides[idx] || { title: '', subtitle: '', desc: '', img: '', color: '', badge: '' };
      nextSlides[idx] = { ...current, [field]: value };
      return { ...prev, heroSlides: nextSlides };
    });
  };

  const updateHomeAboutField = (idx: number, field: keyof HomeContent['about']['slides'][number], value: string | string[]) => {
    setHomeContentDraft((prev) => {
      if (!prev) return prev;
      const nextSlides = [...(prev.about?.slides || [])];
      const current = nextSlides[idx] || { title: '', text: '', imageUrl: '', bullets: [] };
      nextSlides[idx] = { ...current, [field]: value } as HomeContent['about']['slides'][number];
      return {
        ...prev,
        about: {
          ...(prev.about || { sectionLabel: '', title: '', slides: [] }),
          slides: nextSlides,
        },
      };
    });
  };

  const updateHomeProjectField = (idx: number, field: keyof HomeContent['projects']['cards'][number], value: string) => {
    setHomeContentDraft((prev) => {
      if (!prev) return prev;
      const nextCards = [...(prev.projects?.cards || [])];
      const current = nextCards[idx] || { title: '', area: '', text: '', image: '' };
      nextCards[idx] = { ...current, [field]: value };
      return {
        ...prev,
        projects: {
          ...(prev.projects || { sectionLabel: '', title: '', description: '', cards: [] }),
          cards: nextCards,
        },
      };
    });
  };

  const uploadHomeSlideImage = async (idx: number, file?: File | null) => {
    if (!file || !token) return;
    const key = `hero-${idx}`;
    setHomeImageUploading((prev) => ({ ...prev, [key]: true }));
    try {
      const res = await adminUploadProductImage(token, file);
      updateHomeSlideField(idx, 'img', String(res.imageUrl || ''));
    } catch (e: any) {
      alert(e?.message || 'Ошибка загрузки изображения');
    } finally {
      setHomeImageUploading((prev) => ({ ...prev, [key]: false }));
    }
  };

  const uploadHomeAboutImage = async (idx: number, file?: File | null) => {
    if (!file || !token) return;
    const key = `about-${idx}`;
    setHomeImageUploading((prev) => ({ ...prev, [key]: true }));
    try {
      const res = await adminUploadProductImage(token, file);
      updateHomeAboutField(idx, 'imageUrl', String(res.imageUrl || ''));
    } catch (e: any) {
      alert(e?.message || 'Ошибка загрузки изображения');
    } finally {
      setHomeImageUploading((prev) => ({ ...prev, [key]: false }));
    }
  };

  const uploadHomeProjectImage = async (idx: number, file?: File | null) => {
    if (!file || !token) return;
    const key = `project-${idx}`;
    setHomeImageUploading((prev) => ({ ...prev, [key]: true }));
    try {
      const res = await adminUploadProductImage(token, file);
      updateHomeProjectField(idx, 'image', String(res.imageUrl || ''));
    } catch (e: any) {
      alert(e?.message || 'Ошибка загрузки изображения');
    } finally {
      setHomeImageUploading((prev) => ({ ...prev, [key]: false }));
    }
  };

  const saveHomeContent = async () => {
    if (!token || !homeContentDraft) return;
    setHomeSaving(true);
    try {
      const payload = normalizeHomeContentDraft(homeContentDraft);
      const res = await adminPatchSiteHomeContent(token, payload);
      const next = normalizeHomeContentDraft((res?.content || payload) as HomeContent);
      setHomeContentDraft(next);
      setHomeContent?.(next);
      alert('Контент главной страницы сохранен');
    } catch (e: any) {
      alert(e?.message || 'Ошибка сохранения контента главной');
    } finally {
      setHomeSaving(false);
    }
  };

  const uploadCategoryImage = async (catId: string, title: string, file?: File | null) => {
    if (!file || !token) return;
    setCategoryImageUploading((prev) => ({ ...prev, [catId]: true }));
    try {
      const res = await adminUploadProductImage(token, file);
      const imageUrl = String(res.imageUrl || "");
      setCategoryImageDrafts((prev) => ({ ...prev, [catId]: imageUrl }));
      await adminPatchCategory(token, catId, { image: imageUrl, title });
      await refreshAll();
    } catch (e: any) {
      alert(e?.message || "Ошибка загрузки изображения");
    } finally {
      setCategoryImageUploading((prev) => ({ ...prev, [catId]: false }));
    }
  };

  const submitAddProduct = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const category_title = addForm.category_title.trim();
    const name = addForm.name.trim();
    if (!category_title || !name) {
      alert('Заполните категорию и наименование');
      return;
    }

    const payload: any = {
      category_title,
      name,
      brandOrGroup: addForm.brandOrGroup.trim(),
      unit: addForm.unit.trim() || 'шт',
      sku: addForm.sku.trim(),
      image: addForm.image.trim(),
      description: addForm.description.trim(),
      inStock: !!addForm.inStock,
      prices: {},
      attrs: {},
    };

    const prices: any = {};
    Object.entries(addForm.prices).forEach(([key, value]) => {
      const parsed = toNumberOrUndefined(String(value || ''));
      if (parsed !== undefined) prices[key] = parsed;
    });
    payload.prices = prices;

    const attrs: any = {};
    Object.entries(addForm.attrs).forEach(([key, value]) => {
      const trimmed = String(value || '').trim();
      if (!trimmed && key !== 'gallery_images') return;
      if (key === 'pack_volume_m3') {
        const parsed = toNumberOrUndefined(trimmed);
        if (parsed !== undefined) attrs.pack_volume_m3 = parsed;
        return;
      }
      if (key === 'gallery_images') {
        const arr = trimmed
          .split(/[,;\n]/)
          .map((item) => item.trim())
          .filter(Boolean);
        if (arr.length > 0) attrs.gallery_images = arr;
        return;
      }
      attrs[key] = trimmed;
    });
    addForm.characteristics.forEach((item) => {
      const key = String(item.key || '').trim();
      const value = String(item.value || '').trim();
      if (!key || !value) return;
      attrs[key] = value;
    });
    payload.attrs = attrs;

    try {
      await adminCreateProduct(token, payload);
      setIsAddOpen(false);
      await refreshAll();
    } catch (err: any) {
      alert(err?.message || 'Ошибка');
    }
  };

  const totalCount = adminCategories.reduce((s, c) => s + c.items.length, 0);

  const invAll: any[] = adminCategories.flatMap((cat: any) =>
    (cat.items || []).map((p: any) => ({ ...p, __catTitle: cat.title }))
  );

  const invFiltered = invAll.filter((p: any) =>
    String(p?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const invTotalPages = Math.max(1, Math.ceil(invFiltered.length / INV_PAGE_SIZE));
  const invPageSafe = Math.min(invPage, invTotalPages);
  const invItems = invFiltered.slice((invPageSafe - 1) * INV_PAGE_SIZE, invPageSafe * INV_PAGE_SIZE);

  const InvPager = () => (
    <div className="flex items-center justify-center gap-3 py-4">
      <button
        type="button"
        onClick={() => setInvPage((p) => Math.max(1, p - 1))}
        disabled={invPageSafe <= 1}
        className={`px-4 py-2 rounded-xl font-bold text-sm border ${
          invPageSafe <= 1 ? 'bg-gray-100 text-gray-400 border-gray-100' : 'bg-white hover:bg-gray-50 border-gray-200'
        }`}
      >
        ← Назад
      </button>
      <div className="text-sm font-bold text-gray-600">
        Страница {invPageSafe} / {invTotalPages}
      </div>
      <button
        type="button"
        onClick={() => setInvPage((p) => Math.min(invTotalPages, p + 1))}
        disabled={invPageSafe >= invTotalPages}
        className={`px-4 py-2 rounded-xl font-bold text-sm border ${
          invPageSafe >= invTotalPages ? 'bg-gray-100 text-gray-400 border-gray-100' : 'bg-white hover:bg-gray-50 border-gray-200'
        }`}
      >
        Вперёд →
      </button>
    </div>
  );

  return (
    <div className="container mx-auto px-6 py-12 max-w-7xl">
      <div className="flex items-center justify-between mb-12">
        <div>
          <h1 className="text-4xl font-black text-blue-900 uppercase tracking-tighter">Панель управления</h1>
          <p className="text-gray-500 font-medium">Управление каталогом и импорт данных</p>
        </div>
        <button 
          onClick={onLogout}
          className="px-6 py-3 bg-red-50 text-red-500 font-bold rounded-xl hover:bg-red-500 hover:text-white transition-all text-sm uppercase tracking-widest"
        >
          Выйти
        </button>
      </div>

      <div className="flex gap-4 mb-8">
        <button
          onClick={() => setActiveTab('homepage')}
          className={`px-8 py-4 rounded-2xl font-bold transition-all uppercase text-xs tracking-widest ${activeTab === 'homepage' ? 'bg-blue-600 text-white shadow-xl shadow-blue-200' : 'bg-white text-gray-400 hover:bg-blue-50'}`}
        >
          <i className="fas fa-pen-ruler mr-2"></i> Главная
        </button>
        <button 
          onClick={() => setActiveTab('inventory')}
          className={`px-8 py-4 rounded-2xl font-bold transition-all uppercase text-xs tracking-widest ${activeTab === 'inventory' ? 'bg-blue-600 text-white shadow-xl shadow-blue-200' : 'bg-white text-gray-400 hover:bg-blue-50'}`}
        >
          <i className="fas fa-boxes mr-2"></i> Инвентарь
        </button>
        <button 
          onClick={() => setActiveTab('import')}
          className={`px-8 py-4 rounded-2xl font-bold transition-all uppercase text-xs tracking-widest ${activeTab === 'import' ? 'bg-blue-600 text-white shadow-xl shadow-blue-200' : 'bg-white text-gray-400 hover:bg-blue-50'}`}
        >
          <i className="fas fa-file-import mr-2"></i> Импорт Excel
        </button>
        <button 
          onClick={() => setActiveTab('orders')}
          className={`px-8 py-4 rounded-2xl font-bold transition-all uppercase text-xs tracking-widest ${activeTab === 'orders' ? 'bg-blue-600 text-white shadow-xl shadow-blue-200' : 'bg-white text-gray-400 hover:bg-blue-50'}`}
        >
          <i className="fas fa-clipboard-list mr-2"></i> Заказы
        </button>
        <button 
          onClick={() => setActiveTab('leads')}
          className={`px-8 py-4 rounded-2xl font-bold transition-all uppercase text-xs tracking-widest ${activeTab === 'leads' ? 'bg-blue-600 text-white shadow-xl shadow-blue-200' : 'bg-white text-gray-400 hover:bg-blue-50'}`}
        >
          <i className="fas fa-inbox mr-2"></i> Заявки
        </button>
        <button 
          onClick={() => setActiveTab('categories')}
          className={`px-8 py-4 rounded-2xl font-bold transition-all uppercase text-xs tracking-widest ${activeTab === 'categories' ? 'bg-blue-600 text-white shadow-xl shadow-blue-200' : 'bg-white text-gray-400 hover:bg-blue-50'}`}
        >
          <i className="fas fa-images mr-2"></i> Категории
        </button>
      </div>

      <div className="bg-white rounded-[40px] shadow-2xl border border-gray-100 overflow-hidden">
        {activeTab === 'homepage' ? (
          <div className="p-10">
            <div className="flex flex-col lg:flex-row lg:items-end gap-4 mb-6">
              <div className="flex-1">
                <h3 className="text-2xl font-black text-blue-900 uppercase tracking-tighter">Главная страница</h3>
                <p className="text-gray-500 text-sm mt-1">Редактирование текста и изображений главного экрана сайта</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={loadHomeContent}
                  className="px-6 py-3 rounded-2xl border border-gray-200 bg-white font-black uppercase text-xs tracking-widest"
                >
                  Обновить
                </button>
                <button
                  onClick={saveHomeContent}
                  disabled={homeSaving || !homeContentDraft}
                  className="px-6 py-3 rounded-2xl bg-blue-600 text-white font-black uppercase text-xs tracking-widest shadow-lg shadow-blue-200 disabled:opacity-50"
                >
                  {homeSaving ? 'Сохранение...' : 'Сохранить'}
                </button>
              </div>
            </div>

            {homeLoading ? (
              <div className="p-10 text-center text-gray-500"><i className="fas fa-spinner fa-spin mr-2"></i>Загрузка...</div>
            ) : !homeContentDraft ? (
              <div className="p-10 text-center text-gray-500">Контент главной не найден</div>
            ) : (
              <div className="space-y-8">
                <div className="bg-gray-50 border border-gray-100 rounded-3xl p-6">
                  <div className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4">Слайды Hero</div>
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                    {(homeContentDraft.heroSlides || []).map((slide: any, idx: number) => (
                      <div key={idx} className="bg-white border border-gray-100 rounded-3xl p-5">
                        <div className="flex items-center justify-between mb-3">
                          <div className="font-black text-blue-900">Слайд {idx + 1}</div>
                          <label className="px-3 py-2 rounded-xl bg-blue-600 text-white text-xs font-black uppercase tracking-widest cursor-pointer">
                            {homeImageUploading[`hero-${idx}`] ? 'Загрузка...' : 'Загрузить фото'}
                            <input
                              type="file"
                              className="hidden"
                              accept="image/*"
                              disabled={!!homeImageUploading[`hero-${idx}`]}
                              onChange={(e) => uploadHomeSlideImage(idx, e.target.files?.[0])}
                            />
                          </label>
                        </div>
                        {slide?.img ? (
                          <div className="mb-4 rounded-2xl overflow-hidden border border-gray-100 bg-gray-50 aspect-[16/9]">
                            <img src={slide.img} alt={`slide-${idx + 1}`} className="w-full h-full object-cover" />
                          </div>
                        ) : null}
                        <div className="space-y-3">
                          <input
                            className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-white text-sm font-semibold"
                            placeholder="Badge"
                            value={String(slide?.badge || '')}
                            onChange={(e) => updateHomeSlideField(idx, 'badge', e.target.value)}
                          />
                          <input
                            className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-white text-sm font-semibold"
                            placeholder="Подзаголовок"
                            value={String(slide?.subtitle || '')}
                            onChange={(e) => updateHomeSlideField(idx, 'subtitle', e.target.value)}
                          />
                          <input
                            className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-white text-sm font-semibold"
                            placeholder="Заголовок"
                            value={String(slide?.title || '')}
                            onChange={(e) => updateHomeSlideField(idx, 'title', e.target.value)}
                          />
                          <textarea
                            className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-white text-sm min-h-[88px]"
                            placeholder="Описание"
                            value={String(slide?.desc || '')}
                            onChange={(e) => updateHomeSlideField(idx, 'desc', e.target.value)}
                          />
                          <input
                            className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-white text-sm"
                            placeholder="URL изображения"
                            value={String(slide?.img || '')}
                            onChange={(e) => updateHomeSlideField(idx, 'img', e.target.value)}
                          />
                          <input
                            className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-white text-sm"
                            placeholder="Класс затемнения (например: bg-zinc-900/55)"
                            value={String(slide?.color || '')}
                            onChange={(e) => updateHomeSlideField(idx, 'color', e.target.value)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-gray-50 border border-gray-100 rounded-3xl p-6">
                  <div className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4">Кнопки Hero</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-white text-sm font-semibold"
                      placeholder="Текст основной кнопки"
                      value={String(homeContentDraft.heroButtons?.primaryText || '')}
                      onChange={(e) => setHomeContentDraft((prev: any) => ({
                        ...prev,
                        heroButtons: { ...(prev?.heroButtons || {}), primaryText: e.target.value },
                      }))}
                    />
                    <input
                      className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-white text-sm font-semibold"
                      placeholder="Текст вторичной кнопки"
                      value={String(homeContentDraft.heroButtons?.secondaryText || '')}
                      onChange={(e) => setHomeContentDraft((prev: any) => ({
                        ...prev,
                        heroButtons: { ...(prev?.heroButtons || {}), secondaryText: e.target.value },
                      }))}
                    />
                  </div>
                </div>

                <div className="bg-gray-50 border border-gray-100 rounded-3xl p-6">
                  <div className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4">Секция «О компании»</div>
                  <p className="text-sm text-gray-500 mb-5">Здесь редактируются карточки блока «О компании» на главной: заголовки, тексты, пункты и изображения.</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                    <label className="block">
                      <div className="text-[11px] font-black uppercase tracking-[0.16em] text-gray-500 mb-2">Метка секции</div>
                      <input
                        className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-white text-sm font-semibold"
                        value={String(homeContentDraft.about?.sectionLabel || '')}
                        onChange={(e) => setHomeContentDraft((prev: any) => ({
                          ...prev,
                          about: { ...(prev?.about || {}), sectionLabel: e.target.value },
                        }))}
                      />
                    </label>
                    <label className="block">
                      <div className="text-[11px] font-black uppercase tracking-[0.16em] text-gray-500 mb-2">Заголовок секции</div>
                      <input
                        className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-white text-sm font-semibold"
                        value={String(homeContentDraft.about?.title || '')}
                        onChange={(e) => setHomeContentDraft((prev: any) => ({
                          ...prev,
                          about: { ...(prev?.about || {}), title: e.target.value },
                        }))}
                      />
                    </label>
                  </div>
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                    {(homeContentDraft.about?.slides || []).map((slide: any, idx: number) => (
                      <div key={idx} className="bg-white border border-gray-100 rounded-3xl p-5">
                        <div className="flex items-center justify-between mb-3">
                          <div className="font-black text-blue-900">Карточка {idx + 1}</div>
                          <label className="px-3 py-2 rounded-xl bg-blue-600 text-white text-xs font-black uppercase tracking-widest cursor-pointer">
                            {homeImageUploading[`about-${idx}`] ? 'Загрузка...' : 'Загрузить фото'}
                            <input
                              type="file"
                              className="hidden"
                              accept="image/*"
                              disabled={!!homeImageUploading[`about-${idx}`]}
                              onChange={(e) => uploadHomeAboutImage(idx, e.target.files?.[0])}
                            />
                          </label>
                        </div>
                        {slide?.imageUrl ? (
                          <div className="mb-4 rounded-2xl overflow-hidden border border-gray-100 bg-gray-50 aspect-[16/9]">
                            <img src={slide.imageUrl} alt={`about-${idx + 1}`} className="w-full h-full object-cover" />
                          </div>
                        ) : null}
                        <div className="space-y-3">
                          <label className="block">
                            <div className="text-[11px] font-black uppercase tracking-[0.16em] text-gray-500 mb-2">Заголовок карточки</div>
                            <input
                              className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-white text-sm font-semibold"
                              value={String(slide?.title || '')}
                              onChange={(e) => updateHomeAboutField(idx, 'title', e.target.value)}
                            />
                          </label>
                          <label className="block">
                            <div className="text-[11px] font-black uppercase tracking-[0.16em] text-gray-500 mb-2">Основной текст</div>
                            <textarea
                              className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-white text-sm min-h-[88px]"
                              value={String(slide?.text || '')}
                              onChange={(e) => updateHomeAboutField(idx, 'text', e.target.value)}
                            />
                          </label>
                          <label className="block">
                            <div className="text-[11px] font-black uppercase tracking-[0.16em] text-gray-500 mb-2">Дополнительные пункты</div>
                            <textarea
                              className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-white text-sm min-h-[96px]"
                              value={Array.isArray(slide?.bullets) ? slide.bullets.join('\n') : ''}
                              onChange={(e) => updateHomeAboutField(idx, 'bullets', e.target.value.split(/\r?\n|[,;]/).map((item) => item.trim()).filter(Boolean))}
                            />
                          </label>
                          <label className="block">
                            <div className="text-[11px] font-black uppercase tracking-[0.16em] text-gray-500 mb-2">URL изображения</div>
                            <input
                              className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-white text-sm"
                              value={String(slide?.imageUrl || '')}
                              onChange={(e) => updateHomeAboutField(idx, 'imageUrl', e.target.value)}
                            />
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-gray-50 border border-gray-100 rounded-3xl p-6">
                  <div className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4">Секция «Наши проекты»</div>
                  <p className="text-sm text-gray-500 mb-5">Здесь редактируются заголовок секции и карточки проектов, которые показываются ниже на главной странице.</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
                    <label className="block">
                      <div className="text-[11px] font-black uppercase tracking-[0.16em] text-gray-500 mb-2">Метка секции</div>
                      <input
                        className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-white text-sm font-semibold"
                        value={String(homeContentDraft.projects?.sectionLabel || '')}
                        onChange={(e) => setHomeContentDraft((prev: any) => ({
                          ...prev,
                          projects: { ...(prev?.projects || {}), sectionLabel: e.target.value },
                        }))}
                      />
                    </label>
                    <label className="block">
                      <div className="text-[11px] font-black uppercase tracking-[0.16em] text-gray-500 mb-2">Заголовок секции</div>
                      <input
                        className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-white text-sm font-semibold"
                        value={String(homeContentDraft.projects?.title || '')}
                        onChange={(e) => setHomeContentDraft((prev: any) => ({
                          ...prev,
                          projects: { ...(prev?.projects || {}), title: e.target.value },
                        }))}
                      />
                    </label>
                    <label className="block">
                      <div className="text-[11px] font-black uppercase tracking-[0.16em] text-gray-500 mb-2">Описание секции</div>
                      <input
                        className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-white text-sm"
                        value={String(homeContentDraft.projects?.description || '')}
                        onChange={(e) => setHomeContentDraft((prev: any) => ({
                          ...prev,
                          projects: { ...(prev?.projects || {}), description: e.target.value },
                        }))}
                      />
                    </label>
                  </div>
                  <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
                    {(homeContentDraft.projects?.cards || []).map((card: any, idx: number) => (
                      <div key={idx} className="bg-white border border-gray-100 rounded-3xl p-5">
                        <div className="flex items-center justify-between mb-3">
                          <div className="font-black text-blue-900">Проект {idx + 1}</div>
                          <label className="px-3 py-2 rounded-xl bg-blue-600 text-white text-xs font-black uppercase tracking-widest cursor-pointer">
                            {homeImageUploading[`project-${idx}`] ? 'Загрузка...' : 'Загрузить фото'}
                            <input
                              type="file"
                              className="hidden"
                              accept="image/*"
                              disabled={!!homeImageUploading[`project-${idx}`]}
                              onChange={(e) => uploadHomeProjectImage(idx, e.target.files?.[0])}
                            />
                          </label>
                        </div>
                        {card?.image ? (
                          <div className="mb-4 rounded-2xl overflow-hidden border border-gray-100 bg-gray-50 aspect-[4/3]">
                            <img src={card.image} alt={`project-${idx + 1}`} className="w-full h-full object-cover" />
                          </div>
                        ) : null}
                        <div className="space-y-3">
                          <label className="block">
                            <div className="text-[11px] font-black uppercase tracking-[0.16em] text-gray-500 mb-2">Название проекта</div>
                            <input
                              className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-white text-sm font-semibold"
                              value={String(card?.title || '')}
                              onChange={(e) => updateHomeProjectField(idx, 'title', e.target.value)}
                            />
                          </label>
                          <label className="block">
                            <div className="text-[11px] font-black uppercase tracking-[0.16em] text-gray-500 mb-2">Площадь / метка</div>
                            <input
                              className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-white text-sm"
                              value={String(card?.area || '')}
                              onChange={(e) => updateHomeProjectField(idx, 'area', e.target.value)}
                            />
                          </label>
                          <label className="block">
                            <div className="text-[11px] font-black uppercase tracking-[0.16em] text-gray-500 mb-2">Описание проекта</div>
                            <textarea
                              className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-white text-sm min-h-[88px]"
                              value={String(card?.text || '')}
                              onChange={(e) => updateHomeProjectField(idx, 'text', e.target.value)}
                            />
                          </label>
                          <label className="block">
                            <div className="text-[11px] font-black uppercase tracking-[0.16em] text-gray-500 mb-2">URL изображения</div>
                            <input
                              className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-white text-sm"
                              value={String(card?.image || '')}
                              onChange={(e) => updateHomeProjectField(idx, 'image', e.target.value)}
                            />
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-gray-50 border border-gray-100 rounded-3xl p-6">
                  <div className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4">Тексты блока «Контакты»</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      ['sectionLabel', 'Метка секции'],
                      ['title', 'Заголовок'],
                      ['description', 'Описание'],
                      ['mapTitle', 'Заголовок карты'],
                      ['quickFormTitle', 'Заголовок формы'],
                      ['whatsappTitle', 'Заголовок WhatsApp'],
                      ['whatsappText', 'Текст WhatsApp'],
                      ['whatsappButtonText', 'Текст кнопки WhatsApp'],
                    ].map(([key, label]) => (
                      <input
                        key={key}
                        className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-white text-sm"
                        placeholder={label}
                        value={String((homeContentDraft as any).contacts?.[key] || '')}
                        onChange={(e) => setHomeContentDraft((prev: any) => ({
                          ...prev,
                          contacts: {
                            ...(prev?.contacts || {}),
                            [key]: e.target.value,
                          },
                        }))}
                      />
                    ))}
                  </div>
                </div>

                <div className="bg-gray-50 border border-gray-100 rounded-3xl p-6">
                  <div className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4">Единые контакты сайта</div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {[
                      ['phoneValue', 'Телефон', 'Один номер, который показывается на сайте'],
                      ['workingHours', 'График работы', 'Например: Пн — Сб, 09:00 — 20:00'],
                      ['addressValue', 'Адрес', 'Этот адрес используется и в блоке контактов, и в footer, и на карте'],
                      ['whatsappPhone', 'WhatsApp номер', 'Только цифры, без +, пробелов и скобок'],
                      ['whatsappMessage', 'Сообщение для WhatsApp', 'Текст, который подставляется при открытии WhatsApp'],
                      ['instagramUrl', 'Instagram ссылка', 'Полная ссылка на профиль'],
                      ['instagramLabel', 'Текст Instagram', 'Например: @adm_mebel_astana'],
                    ].map(([key, label, hint]) => (
                      <label key={key} className="block">
                        <div className="text-[11px] font-black uppercase tracking-[0.16em] text-gray-500 mb-2">{label}</div>
                        <input
                          className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-white text-sm"
                          value={String((homeContentDraft as any).contacts?.[key] || '')}
                          onChange={(e) => setHomeContentDraft((prev: any) => ({
                            ...prev,
                            contacts: {
                              ...(prev?.contacts || {}),
                              [key]: e.target.value,
                            },
                          }))}
                        />
                        <div className="text-xs text-gray-400 mt-2 leading-relaxed">{hint}</div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : activeTab === 'import' ? (
          <div className="p-10">
            <div className="mb-8">
              <h3 className="text-2xl font-black text-blue-900 uppercase tracking-tighter mb-1">Загрузка каталога</h3>
              <p className="text-gray-500 text-sm">Выберите категорию, затем загрузите файл .xlsx / .xls</p>
            </div>

            {/* Step 1: category selector */}
            <div className="mb-6 bg-blue-50 border border-blue-100 rounded-3xl p-6">
              <div className="text-xs font-black text-blue-600 uppercase tracking-widest mb-4">Шаг 1 — Выберите категорию</div>

              {importShowNewCat ? (
                <div className="flex items-center gap-3 flex-wrap">
                  <input
                    className="flex-1 min-w-[200px] px-4 py-3 rounded-2xl bg-white border border-blue-200 outline-none focus:ring-4 focus:ring-blue-100 text-sm"
                    placeholder="Название новой категории..."
                    value={importNewCatTitle}
                    onChange={(e) => setImportNewCatTitle(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') createImportCategory(); }}
                    autoFocus
                  />
                  <button
                    onClick={createImportCategory}
                    disabled={!importNewCatTitle.trim() || importNewCatSaving}
                    className="px-6 py-3 rounded-2xl bg-blue-600 text-white font-black text-xs uppercase tracking-widest disabled:opacity-50"
                  >
                    {importNewCatSaving ? 'Создание...' : 'Создать'}
                  </button>
                  <button
                    onClick={() => { setImportShowNewCat(false); setImportNewCatTitle(''); }}
                    className="px-4 py-3 rounded-2xl bg-gray-200 text-gray-600 font-black text-xs uppercase tracking-widest"
                  >
                    Отмена
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-3">
                  <select
                    value={importCategoryId}
                    onChange={(e) => {
                      const id = e.target.value;
                      const cat = importCategories.find((c) => c.id === id);
                      setImportCategoryId(id);
                      setImportCategoryTitle(cat?.title || id);
                    }}
                    className="flex-1 min-w-[200px] px-4 py-3 rounded-2xl bg-white border border-blue-200 outline-none focus:ring-4 focus:ring-blue-100 text-sm font-semibold"
                  >
                    <option value="">— выберите категорию —</option>
                    {importCategories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.title || cat.id}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => setImportShowNewCat(true)}
                    className="px-6 py-3 rounded-2xl border border-blue-200 bg-white text-blue-700 font-black text-xs uppercase tracking-widest hover:bg-blue-50"
                  >
                    + Новая категория
                  </button>
                </div>
              )}

              {importCategoryId && (
                <div className="mt-3 flex items-center gap-2 text-sm font-bold text-green-700">
                  <i className="fas fa-check-circle"></i> Выбрана: {importCategoryTitle || importCategoryId}
                </div>
              )}
            </div>

            {/* Step 2: file upload */}
            <div className="bg-gray-50 border border-gray-100 rounded-3xl p-8 text-center">
              <div className="text-xs font-black text-gray-400 uppercase tracking-widest mb-5">Шаг 2 — Загрузите файл Excel</div>
              <div className="w-20 h-20 bg-white border border-gray-100 rounded-3xl flex items-center justify-center mx-auto mb-5 text-gray-300 text-4xl shadow-sm">
                <i className="fas fa-file-excel"></i>
              </div>
              <p className="text-gray-400 text-sm mb-6 max-w-md mx-auto">Колонки: SKU, Название, Описание, Характеристики, Цена, Ед.изм., Длина, Ширина, Высота, Фото</p>
              <label className={`inline-flex items-center gap-3 px-10 py-5 rounded-3xl font-black uppercase tracking-widest text-sm cursor-pointer transition-all ${
                !importCategoryId || isImporting
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-2xl shadow-blue-200 hover:-translate-y-1'
              }`}>
                {isImporting ? (
                  <><i className="fas fa-spinner fa-spin"></i> Обработка...</>
                ) : (
                  <><i className="fas fa-cloud-upload-alt text-xl"></i> Выбрать файл Excel</>
                )}
                <input
                  type="file"
                  className="hidden"
                  accept=".xlsx,.xls"
                  onChange={handleExcelImport}
                  disabled={!importCategoryId || isImporting}
                />
              </label>
              {!importCategoryId && (
                <p className="mt-4 text-xs text-red-400 font-bold">Кнопка заблокирована — сначала выберите категорию выше</p>
              )}
            </div>
          </div>
        ) : activeTab === 'orders' ? (
          <div className="p-10">
            <div className="flex flex-col lg:flex-row lg:items-end gap-4 mb-6">
              <div className="flex-1">
                <h3 className="text-2xl font-black text-blue-900 uppercase tracking-tighter">Заказы</h3>
                <p className="text-gray-500 text-sm mt-1">История заказов из корзины</p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <select
                  value={ordersStatus}
                  onChange={(e) => { setOrdersPage(1); setOrdersStatus(e.target.value); }}
                  className="px-4 py-3 rounded-2xl border border-gray-200 bg-white font-semibold text-sm"
                >
                  <option value="">Все статусы</option>
                  <option value="new">Новые</option>
                  <option value="processing">В обработке</option>
                  <option value="completed">Выполнены</option>
                  <option value="cancelled">Отменены</option>
                </select>

                <select
                  value={ordersSortBy}
                  onChange={(e) => { setOrdersPage(1); setOrdersSortBy(e.target.value as any); }}
                  className="px-4 py-3 rounded-2xl border border-gray-200 bg-white font-semibold text-sm"
                >
                  <option value="date">Сортировка: Дата</option>
                  <option value="status">Сортировка: Статус</option>
                </select>

                <select
                  value={ordersSortDir}
                  onChange={(e) => { setOrdersPage(1); setOrdersSortDir(e.target.value as any); }}
                  className="px-4 py-3 rounded-2xl border border-gray-200 bg-white font-semibold text-sm"
                >
                  <option value="desc">Сначала новые</option>
                  <option value="asc">Сначала старые</option>
                </select>

                <button
                  onClick={() => loadOrders(ordersPage)}
                  className="px-6 py-3 rounded-2xl bg-blue-600 text-white font-black uppercase text-xs tracking-widest shadow-lg shadow-blue-200"
                >
                  Обновить
                </button>
              </div>
            </div>

            {orders.length === 0 ? (
              <div className="p-16 text-center bg-gray-50 rounded-3xl border border-gray-100">
                <div className="text-gray-400 text-4xl mb-4"><i className="fas fa-inbox"></i></div>
                <div className="font-bold text-gray-700">Пока нет заказов</div>
                <div className="text-sm text-gray-500 mt-2">Когда клиент оформит заказ, он появится здесь.</div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-xs uppercase tracking-widest text-gray-500">
                      <th className="py-3 px-2">Дата</th>
                      <th className="py-3 px-2">Клиент</th>
                      <th className="py-3 px-2">Телефон</th>
                      <th className="py-3 px-2">Сумма</th>
                      <th className="py-3 px-2">Статус</th>
                      <th className="py-3 px-2 text-right">Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o) => (
                      <tr key={o.id} className="border-t border-gray-100 hover:bg-blue-50/40">
                        <td className="py-4 px-2 text-sm text-gray-700">{o.createdAt ? new Date(o.createdAt).toLocaleString('ru-RU') : '-'}</td>
                        <td className="py-4 px-2 font-bold text-blue-900">{o.customerName}</td>
                        <td className="py-4 px-2 text-sm text-gray-700">{o.customerPhone}</td>
                        <td className="py-4 px-2 font-bold text-gray-900">{Number(o.total || 0).toLocaleString('ru-RU')} ₸</td>

                        <td className="py-4 px-2">
                          <select
                            value={o.status}
                            onChange={async (e) => {
                              const st = e.target.value;
                              await adminPatchOrder(token, o.id, st);
                              setOrders((prev) => prev.map((x) => x.id === o.id ? { ...x, status: st } : x));
                            }}
                            className="px-3 py-2 rounded-xl border border-gray-200 bg-white font-bold text-xs"
                          >
                            <option value="new">Новый</option>
                            <option value="processing">В обработке</option>
                            <option value="completed">Выполнен</option>
                            <option value="cancelled">Отменён</option>
                          </select>
                        </td>

                        <td className="py-4 px-2 text-right">
                          <button
                            onClick={() => openOrder(o.id)}
                            className="px-4 py-2 rounded-xl bg-blue-600 text-white font-black text-xs uppercase tracking-widest mr-2"
                          >
                            Открыть
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(o.id)}
                            className="px-4 py-2 rounded-xl bg-red-600 text-white font-black text-xs uppercase tracking-widest"
                          >
                            Удалить
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="flex items-center justify-between mt-6">
                  <div className="text-sm text-gray-500">
                    Всего: <span className="font-bold text-gray-800">{ordersTotal}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setOrdersPage((p) => Math.max(1, p - 1))}
                      className="px-4 py-2 rounded-xl border border-gray-200 bg-white font-bold text-xs uppercase tracking-widest"
                      disabled={ordersPage <= 1}
                    >
                      Назад
                    </button>
                    <button
                      onClick={() => setOrdersPage((p) => p + 1)}
                      className="px-4 py-2 rounded-xl border border-gray-200 bg-white font-bold text-xs uppercase tracking-widest"
                      disabled={ordersPage * ordersLimit >= ordersTotal}
                    >
                      Далее
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Delete confirm modal */}
            {deleteConfirmId ? (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[90]">
                <div className="bg-white rounded-3xl p-8 w-[92%] max-w-md shadow-2xl">
                  <h4 className="text-xl font-black text-blue-900 uppercase tracking-tighter mb-2">Подтвердите удаление</h4>
                  <p className="text-gray-600 text-sm mb-6">Удалить заказ навсегда? Это действие нельзя отменить.</p>
                  <div className="flex gap-3 justify-end">
                    <button
                      onClick={() => setDeleteConfirmId('')}
                      className="px-6 py-3 rounded-2xl border border-gray-200 bg-white font-black text-xs uppercase tracking-widest"
                    >
                      Отмена
                    </button>
                    <button
                      onClick={async () => {
                        const id = deleteConfirmId;
                        setDeleteConfirmId('');
                        await adminDeleteOrder(token, id);
                        await loadOrders(ordersPage);
                      }}
                      className="px-6 py-3 rounded-2xl bg-red-600 text-white font-black text-xs uppercase tracking-widest"
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Order modal */}
            {isOrderOpen ? (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[90]">
                <div className="bg-white rounded-3xl p-8 w-[95%] max-w-4xl shadow-2xl max-h-[85vh] overflow-y-auto">
                  <div className="flex items-start justify-between gap-4 mb-6">
                    <div>
                      <h4 className="text-2xl font-black text-blue-900 uppercase tracking-tighter">Заказ</h4>
                      {activeOrder?.createdAt ? (
                        <div className="text-sm text-gray-500 mt-1">{new Date(activeOrder.createdAt).toLocaleString('ru-RU')}</div>
                      ) : null}
                    </div>
                    <button
                      onClick={() => { setIsOrderOpen(false); setActiveOrder(null); }}
                      className="w-12 h-12 rounded-2xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  </div>

                  {orderLoading ? (
                    <div className="p-10 text-center text-gray-500"><i className="fas fa-spinner fa-spin mr-2"></i>Загрузка...</div>
                  ) : !activeOrder ? (
                    <div className="p-10 text-center text-gray-500">Заказ не найден</div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                        <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100">
                          <div className="text-xs uppercase tracking-widest text-gray-500">Клиент</div>
                          <div className="mt-2 font-black text-blue-900 text-lg">{activeOrder.customerName}</div>
                          <div className="mt-1 text-sm text-gray-700">{activeOrder.customerPhone}</div>
                          {activeOrder.customerEmail ? <div className="mt-1 text-sm text-gray-700">{activeOrder.customerEmail}</div> : null}
                          {activeOrder.address ? <div className="mt-3 text-sm text-gray-700"><span className="font-bold">Адрес:</span> {activeOrder.address}</div> : null}
                          {activeOrder.comment ? <div className="mt-3 text-sm text-gray-700"><span className="font-bold">Комментарий:</span> {activeOrder.comment}</div> : null}
                        </div>

                        <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100">
                          <div className="text-xs uppercase tracking-widest text-gray-500">Статус и сумма</div>
                          <div className="mt-4 flex flex-col gap-3">
                            <select
                              value={activeOrder.status}
                              onChange={async (e) => {
                                const st = e.target.value;
                                await adminPatchOrder(token, activeOrder.id, st);
                                setActiveOrder((prev: any) => ({ ...prev, status: st }));
                                setOrders((prev) => prev.map((x) => x.id === activeOrder.id ? { ...x, status: st } : x));
                              }}
                              className="px-4 py-3 rounded-2xl border border-gray-200 bg-white font-bold text-sm"
                            >
                              <option value="new">Новый</option>
                              <option value="processing">В обработке</option>
                              <option value="completed">Выполнен</option>
                              <option value="cancelled">Отменён</option>
                            </select>

                            <div className="text-3xl font-black text-gray-900">
                              {Number(activeOrder.total || 0).toLocaleString('ru-RU')} ₸
                            </div>

                            <button
                              onClick={async () => {
                                const blob = await adminExportOrder(token, activeOrder.id);
                                downloadBlob(blob, `order_${activeOrder.id}.xlsx`);
                              }}
                              className="px-6 py-3 rounded-2xl bg-green-600 text-white font-black uppercase text-xs tracking-widest"
                            >
                              Экспорт в Excel
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden">
                        <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 font-black text-blue-900 uppercase tracking-widest text-xs">
                          Товары
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left">
                            <thead>
                              <tr className="text-xs uppercase tracking-widest text-gray-500">
                                <th className="py-3 px-4">Товар</th>
                                <th className="py-3 px-4">Артикул</th>
                                <th className="py-3 px-4 text-right">Кол-во</th>
                                <th className="py-3 px-4 text-right">Цена</th>
                                <th className="py-3 px-4 text-right">Сумма</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(activeOrder.items || []).map((it: any, idx2: number) => (
                                <tr key={idx2} className="border-t border-gray-100">
                                  <td className="py-4 px-4 font-bold text-gray-900">
                                    <div>{it.name}</div>
                                    {it.meta?.quantity ? (
                                      <div className="mt-1 text-xs font-medium text-gray-500">
                                        {[it.meta.widthM, it.meta.heightM, it.meta.depthM]
                                          .filter((value: any) => value !== undefined && value !== null && value !== '')
                                          .map((value: any) => `${Number(value).toLocaleString('ru-RU', { maximumFractionDigits: 3 })} м`)
                                          .join(' × ')}
                                        {' · '}
                                        {Number(it.meta.quantity).toLocaleString('ru-RU', { maximumFractionDigits: 3 })} {it.meta.unit || ''}
                                      </div>
                                    ) : null}
                                  </td>
                                  <td className="py-4 px-4 text-sm text-gray-700">{it.sku || '-'}</td>
                                  <td className="py-4 px-4 text-right font-bold">{Number(it.quantity || 0)}</td>
                                  <td className="py-4 px-4 text-right">{Number(it.price || 0).toLocaleString('ru-RU')} ₸</td>
                                  <td className="py-4 px-4 text-right font-black">{Number(it.lineTotal || 0).toLocaleString('ru-RU')} ₸</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                    </>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        ) : activeTab === 'leads' ? (
          <div className="p-10">
            <div className="flex flex-col lg:flex-row lg:items-end gap-4 mb-6">
              <div className="flex-1">
                <h3 className="text-2xl font-black text-blue-900 uppercase tracking-tighter">Заявки</h3>
                <p className="text-gray-500 text-sm mt-1">Заявки с формы на главной странице</p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <select
                  value={leadsStatus}
                  onChange={(e) => { setLeadsPage(1); setLeadsStatus(e.target.value); }}
                  className="px-4 py-3 rounded-2xl border border-gray-200 bg-white font-semibold text-sm"
                >
                  <option value="">Все статусы</option>
                  <option value="new">Новые</option>
                  <option value="processing">В обработке</option>
                  <option value="done">Выполнены</option>
                </select>

                <select
                  value={leadsSortDir}
                  onChange={(e) => { setLeadsPage(1); setLeadsSortDir(e.target.value as any); }}
                  className="px-4 py-3 rounded-2xl border border-gray-200 bg-white font-semibold text-sm"
                >
                  <option value="desc">Сначала новые</option>
                  <option value="asc">Сначала старые</option>
                </select>

                <button
                  onClick={() => loadLeads(leadsPage)}
                  className="px-6 py-3 rounded-2xl bg-blue-600 text-white font-black uppercase text-xs tracking-widest shadow-lg shadow-blue-200"
                >
                  Обновить
                </button>
              </div>
            </div>

            {leads.length === 0 ? (
              <div className="p-16 text-center bg-gray-50 rounded-3xl border border-gray-100">
                <div className="text-gray-400 text-4xl mb-4"><i className="fas fa-inbox"></i></div>
                <div className="font-bold text-gray-700">Пока нет заявок</div>
                <div className="text-sm text-gray-500 mt-2">Когда клиент отправит заявку, она появится здесь.</div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-xs uppercase tracking-widest text-gray-500">
                      <th className="py-3 px-2">Дата</th>
                      <th className="py-3 px-2">Имя</th>
                      <th className="py-3 px-2">Телефон</th>
                      <th className="py-3 px-2">Статус</th>
                      <th className="py-3 px-2 text-right">Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map((l) => (
                      <tr key={l.id} className="border-t border-gray-100 hover:bg-blue-50/40">
                        <td className="py-4 px-2 text-sm text-gray-700">{l.createdAt ? new Date(l.createdAt).toLocaleString('ru-RU') : '-'}</td>
                        <td className="py-4 px-2 font-bold text-blue-900">{l.name}</td>
                        <td className="py-4 px-2 text-sm text-gray-700">{l.phone}</td>
                        <td className="py-4 px-2">
                          <select
                            value={l.status}
                            onChange={async (e) => {
                              const st = e.target.value;
                              await adminPatchLead(token, l.id, st);
                              setLeads((prev) => prev.map((x) => x.id === l.id ? { ...x, status: st } : x));
                            }}
                            className="px-3 py-2 rounded-xl border border-gray-200 bg-white font-bold text-xs"
                          >
                            <option value="new">Новая</option>
                            <option value="processing">В обработке</option>
                            <option value="done">Выполнена</option>
                          </select>
                        </td>
                        <td className="py-4 px-2 text-right">
                          <button
                            onClick={() => openLead(l.id)}
                            className="px-4 py-2 rounded-xl bg-blue-600 text-white font-black text-xs uppercase tracking-widest mr-2"
                          >
                            Открыть
                          </button>
                          <button
                            onClick={() => setDeleteLeadConfirmId(l.id)}
                            className="px-4 py-2 rounded-xl bg-red-600 text-white font-black text-xs uppercase tracking-widest"
                          >
                            Удалить
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="flex items-center justify-between mt-6">
                  <div className="text-sm text-gray-500">
                    Всего: <span className="font-bold text-gray-800">{leadsTotal}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setLeadsPage((p) => Math.max(1, p - 1))}
                      className="px-4 py-2 rounded-xl border border-gray-200 bg-white font-bold text-xs uppercase tracking-widest"
                      disabled={leadsPage <= 1}
                    >
                      Назад
                    </button>
                    <button
                      onClick={() => setLeadsPage((p) => p + 1)}
                      className="px-4 py-2 rounded-xl border border-gray-200 bg-white font-bold text-xs uppercase tracking-widest"
                      disabled={leadsPage * leadsLimit >= leadsTotal}
                    >
                      Далее
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Delete confirm modal */}
            {deleteLeadConfirmId ? (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[90]">
                <div className="bg-white rounded-3xl p-8 w-[92%] max-w-md shadow-2xl">
                  <h4 className="text-xl font-black text-blue-900 uppercase tracking-tighter mb-2">Подтвердите удаление</h4>
                  <p className="text-gray-600 text-sm mb-6">Удалить заявку навсегда? Это действие нельзя отменить.</p>
                  <div className="flex gap-3 justify-end">
                    <button
                      onClick={() => setDeleteLeadConfirmId('')}
                      className="px-6 py-3 rounded-2xl border border-gray-200 bg-white font-black text-xs uppercase tracking-widest"
                    >
                      Отмена
                    </button>
                    <button
                      onClick={async () => {
                        const id = deleteLeadConfirmId;
                        setDeleteLeadConfirmId('');
                        await adminDeleteLead(token, id);
                        await loadLeads(leadsPage);
                      }}
                      className="px-6 py-3 rounded-2xl bg-red-600 text-white font-black text-xs uppercase tracking-widest"
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Lead modal */}
            {isLeadOpen ? (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[90]">
                <div className="bg-white rounded-3xl p-8 w-[95%] max-w-3xl shadow-2xl max-h-[85vh] overflow-y-auto">
                  <div className="flex items-start justify-between gap-4 mb-6">
                    <div>
                      <h4 className="text-2xl font-black text-blue-900 uppercase tracking-tighter">Заявка</h4>
                      {activeLead?.createdAt ? (
                        <div className="text-sm text-gray-500 mt-1">{new Date(activeLead.createdAt).toLocaleString('ru-RU')}</div>
                      ) : null}
                    </div>
                    <button
                      onClick={() => { setIsLeadOpen(false); setActiveLead(null); }}
                      className="w-12 h-12 rounded-2xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  </div>

                  {leadLoading ? (
                    <div className="p-10 text-center text-gray-500"><i className="fas fa-spinner fa-spin mr-2"></i>Загрузка...</div>
                  ) : !activeLead ? (
                    <div className="p-10 text-center text-gray-500">Заявка не найдена</div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100">
                          <div className="text-xs uppercase tracking-widest text-gray-500">Контакты</div>
                          <div className="mt-2 font-black text-blue-900 text-lg">{activeLead.name}</div>
                          <div className="mt-1 text-sm text-gray-700">{activeLead.phone}</div>
                          {activeLead.email ? <div className="mt-1 text-sm text-gray-700">{activeLead.email}</div> : null}
                        </div>

                        <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100">
                          <div className="text-xs uppercase tracking-widest text-gray-500">Статус</div>
                          <div className="mt-4">
                            <select
                              value={activeLead.status}
                              onChange={async (e) => {
                                const st = e.target.value;
                                await adminPatchLead(token, activeLead.id, st);
                                setActiveLead((prev: any) => ({ ...prev, status: st }));
                                setLeads((prev) => prev.map((x) => x.id === activeLead.id ? { ...x, status: st } : x));
                              }}
                              className="px-4 py-3 rounded-2xl border border-gray-200 bg-white font-bold text-sm w-full"
                            >
                              <option value="new">Новая</option>
                              <option value="processing">В обработке</option>
                              <option value="done">Выполнена</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {activeLead.message ? (
                        <div className="mt-6 bg-white rounded-3xl border border-gray-100 overflow-hidden">
                          <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 font-black text-blue-900 uppercase tracking-widest text-xs">
                            Сообщение
                          </div>
                          <div className="p-6 text-gray-800 whitespace-pre-wrap">{activeLead.message}</div>
                        </div>
                      ) : null}

                    </>
                  )}
                </div>
              </div>
            ) : null}
          </div>

        ) : activeTab === 'categories' ? (
          <div className="p-10">
            <div className="flex flex-col lg:flex-row lg:items-end gap-4 mb-6">
              <div className="flex-1">
                <h3 className="text-2xl font-black text-blue-900 uppercase tracking-tighter">Категории</h3>
                <p className="text-gray-500 text-sm mt-1">Управление категориями каталога</p>
              </div>
              <button
                onClick={() => refreshAll()}
                className="px-6 py-3 rounded-2xl bg-blue-600 text-white font-black uppercase text-xs tracking-widest shadow-lg shadow-blue-200"
              >
                Обновить
              </button>
            </div>

            {/* Create category inline form */}
            <div className="mb-8 bg-blue-50 border border-blue-100 rounded-3xl p-6">
              <div className="text-xs font-black text-blue-600 uppercase tracking-widest mb-3">Добавить категорию</div>
              <div className="flex items-center gap-3 flex-wrap">
                <input
                  className="flex-1 min-w-[200px] px-4 py-3 rounded-2xl bg-white border border-blue-200 outline-none focus:ring-4 focus:ring-blue-100 text-sm"
                  placeholder="Название (например: Кухни)"
                  value={addCatTitle}
                  onChange={(e) => setAddCatTitle(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') createTabCategory(); }}
                />
                <button
                  onClick={createTabCategory}
                  disabled={!addCatTitle.trim() || addCatSaving}
                  className="px-6 py-3 rounded-2xl bg-blue-600 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {addCatSaving ? 'Создание...' : 'Создать категорию'}
                </button>
              </div>
            </div>

            {adminCategories.length === 0 ? (
              <div className="p-16 text-center bg-gray-50 rounded-3xl border border-gray-100">
                <div className="text-gray-400 text-4xl mb-4"><i className="fas fa-images"></i></div>
                <div className="font-bold text-gray-700">Категории не найдены</div>
                <div className="text-sm text-gray-500 mt-2">Импортируйте товары, чтобы появились категории.</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {adminCategories.map((cat: any) => {
                  const catId = String(cat.id || "");
                  const title = String(cat.title || "");
                  const draft = categoryImageDrafts[catId] ?? "";
                  const fallback = String((cat.items || []).find((it: any) => it?.image)?.image || "");
                  const previewSrc = draft || String(cat.image || "") || fallback;
                  const isUploading = !!categoryImageUploading[catId];
                  const isSaving = !!categoryImageSaving[catId];

                  return (
                    <div key={catId} className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
                      <div className="aspect-[16/9] rounded-2xl overflow-hidden bg-gray-50 border border-gray-100 mb-4">
                        {previewSrc ? (
                          <img src={previewSrc} alt={title} className="w-full h-full object-cover" />
                        ) : null}
                      </div>

                      <div className="flex items-center justify-between gap-4 mb-4">
                        <div>
                          <div className="text-lg font-black text-blue-900">{title || "Без названия"}</div>
                          <div className="text-xs text-gray-400">{catId}</div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Изображение (URL)</div>
                          <input
                            className="w-full px-4 py-3 rounded-2xl bg-white border border-gray-200 outline-none focus:ring-4 focus:ring-blue-100 transition-all text-sm"
                            value={draft}
                            onChange={(e) => setCategoryImageDrafts((prev) => ({ ...prev, [catId]: e.target.value }))}
                            placeholder="https://..."
                          />
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3">
                          <label className={`inline-flex items-center gap-2 px-4 py-3 rounded-2xl border text-xs font-black uppercase tracking-widest ${isUploading ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-white text-blue-700 border-blue-200 hover:bg-blue-50 cursor-pointer'}`}>
                            <i className={`fas ${isUploading ? 'fa-spinner fa-spin' : 'fa-upload'}`}></i>
                            {isUploading ? 'Загрузка...' : 'Выбрать файл'}
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              disabled={isUploading}
                              onChange={(e) => {
                                uploadCategoryImage(catId, title, e.target.files?.[0]);
                                e.currentTarget.value = '';
                              }}
                            />
                          </label>

                          <button
                            type="button"
                            onClick={() => saveCategoryImage(catId, title)}
                            disabled={isSaving || isUploading}
                            className={`px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs ${isSaving || isUploading ? 'bg-gray-100 text-gray-400' : 'bg-blue-600 text-white shadow-lg shadow-blue-200 hover:bg-blue-700'}`}
                          >
                            {isSaving ? 'Сохранение...' : 'Сохранить'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="p-8 border-b border-gray-50 flex flex-col md:flex-row gap-6 justify-between items-center bg-gray-50/50">
              <div className="relative w-full md:w-96">
                <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-300"></i>
                <input 
                  type="text" 
                  placeholder="Быстрый поиск по складу..." 
                  className="w-full pl-12 pr-6 py-4 rounded-2xl bg-white border border-gray-200 outline-none focus:ring-4 focus:ring-blue-100 transition-all text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-4">
                <button
                  onClick={openAddModal}
                  className="px-6 py-3 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-200 transition-all uppercase tracking-widest text-xs hover:bg-blue-700"
                >
                  + Добавить товар
                </button>
                <div className="text-sm font-bold text-blue-900 uppercase tracking-widest">
                  Всего товаров: {totalCount}
                </div>
              </div>
            </div>

            <InvPager />

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] text-gray-400 font-black uppercase tracking-widest border-b border-gray-50">
                    <th className="px-8 py-6">Товар / Категория</th>
                    <th className="px-8 py-6">Цена</th>
                    <th className="px-8 py-6">Статус</th>
                    <th className="px-8 py-6 text-right">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {invItems.map((product: any) => (
                    <tr key={product.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gray-100 rounded-xl flex-shrink-0 flex items-center justify-center text-gray-300">
                            <i className="fas fa-image"></i>
                          </div>
                          <div>
                            <div className="text-sm font-bold text-blue-900 line-clamp-1">{product.name}</div>
                            <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest">{product.__catTitle}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="text-sm font-bold text-gray-700">
                          {product.prices?.retail ? `${product.prices.retail.toLocaleString()} ₸` : (product.prices?.note || '---')}
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <button 
                          onClick={() => toggleProductStock(product.id, product.inStock)}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${product.inStock ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}
                        >
                          {product.inStock ? 'В наличии' : 'Нет в наличии'}
                        </button>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openEditModal(product, product.__catTitle)}
                            className="w-9 h-9 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all"
                            title="Редактировать товар"
                          >
                            <i className="fas fa-edit text-xs"></i>
                          </button>
                          <button 
                            onClick={() => deleteProduct(product.id)}
                            className="w-9 h-9 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"
                            title="Удалить"
                          >
                            <i className="fas fa-trash-alt text-xs"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {adminCategories.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-8 py-20 text-center text-gray-400 font-medium italic">
                        Каталог пуст. Перейдите во вкладку "Импорт Excel", чтобы загрузить товары.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <InvPager />
          </div>
        )}
      </div>

      {isAddOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-3 sm:p-5">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsAddOpen(false)} />
          <div
            className="relative w-[min(1120px,96vw)] max-h-[92vh] overflow-y-auto rounded-3xl"
            style={{ background: 'var(--adm-paper)', border: '1px solid var(--adm-border)', boxShadow: 'var(--adm-shadow)' }}
          >
            <div className="p-6 sm:p-8 border-b" style={{ borderColor: 'var(--adm-border)' }}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="adm-eyebrow mb-2">Новый товар</div>
                  <div className="text-2xl font-black leading-tight" style={{ color: 'var(--adm-ink)', fontFamily: 'Montserrat, sans-serif' }}>Редактор под Excel-шаблон</div>
                  <div className="text-sm mt-1" style={{ color: 'var(--adm-ink-soft)' }}>Основные поля, цены, медиа и отдельный блок для любых пользовательских характеристик.</div>
                </div>
                <button
                  onClick={() => setIsAddOpen(false)}
                  className="w-10 h-10 rounded-2xl transition-all"
                  style={{ background: 'var(--adm-bg)', color: 'var(--adm-ink-soft)', border: '1px solid var(--adm-border)' }}
                  title="Закрыть"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
            </div>

            <form onSubmit={submitAddProduct} className="p-6 sm:p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: 'var(--adm-ink-soft)' }}>Категория</div>
                  <input
                    className="w-full px-4 py-3 rounded-2xl outline-none transition-all text-sm"
                    style={{ background: 'var(--adm-paper)', border: '1px solid var(--adm-border)', color: 'var(--adm-ink)' }}
                    value={addForm.category_title}
                    onChange={(e) => setAddForm((prev) => ({ ...prev, category_title: e.target.value }))}
                    placeholder="Например: Мебель"
                  />
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: 'var(--adm-ink-soft)' }}>Название</div>
                  <input
                    className="w-full px-4 py-3 rounded-2xl outline-none transition-all text-sm"
                    style={{ background: 'var(--adm-paper)', border: '1px solid var(--adm-border)', color: 'var(--adm-ink)' }}
                    value={addForm.name}
                    onChange={(e) => setAddForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Название товара"
                  />
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: 'var(--adm-ink-soft)' }}>Сегмент / группа</div>
                  <input
                    className="w-full px-4 py-3 rounded-2xl outline-none transition-all text-sm"
                    style={{ background: 'var(--adm-paper)', border: '1px solid var(--adm-border)', color: 'var(--adm-ink)' }}
                    value={addForm.brandOrGroup}
                    onChange={(e) => setAddForm((prev) => ({ ...prev, brandOrGroup: e.target.value }))}
                    placeholder="Например: Кухни"
                  />
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: 'var(--adm-ink-soft)' }}>Ед. изм.</div>
                  <input
                    className="w-full px-4 py-3 rounded-2xl outline-none transition-all text-sm"
                    style={{ background: 'var(--adm-paper)', border: '1px solid var(--adm-border)', color: 'var(--adm-ink)' }}
                    value={addForm.unit}
                    onChange={(e) => setAddForm((prev) => ({ ...prev, unit: e.target.value }))}
                    placeholder="шт / м2 / м3"
                  />
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: 'var(--adm-ink-soft)' }}>SKU</div>
                  <input
                    className="w-full px-4 py-3 rounded-2xl outline-none transition-all text-sm"
                    style={{ background: 'var(--adm-paper)', border: '1px solid var(--adm-border)', color: 'var(--adm-ink)' }}
                    value={addForm.sku}
                    onChange={(e) => setAddForm((prev) => ({ ...prev, sku: e.target.value }))}
                    placeholder="FUR-01"
                  />
                </div>
                <div className="flex items-end">
                  <label className="inline-flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold select-none w-full" style={{ background: 'var(--adm-bg)', border: '1px solid var(--adm-border)', color: 'var(--adm-ink)' }}>
                    <input
                      type="checkbox"
                      checked={addForm.inStock}
                      onChange={(e) => setAddForm((prev) => ({ ...prev, inStock: e.target.checked }))}
                    />
                    В наличии
                  </label>
                </div>
              </div>

              <div className="mt-8 grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-6">
                <div className="rounded-3xl p-6" style={{ background: 'var(--adm-bg)', border: '1px solid var(--adm-border)' }}>
                  <div className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: 'var(--adm-ink)' }}>Медиа</div>
                  <div className="text-[11px] mb-5" style={{ color: 'var(--adm-ink-soft)' }}>Главное фото, дополнительные фото и галерея как в шаблоне импорта.</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="md:col-span-2">
                      <div className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: 'var(--adm-ink-soft)' }}>Главное фото</div>
                      <input
                        className="w-full px-4 py-3 rounded-2xl outline-none transition-all text-sm"
                        style={{ background: 'var(--adm-paper)', border: '1px solid var(--adm-border)', color: 'var(--adm-ink)' }}
                        value={addForm.image}
                        onChange={(e) => setAddForm((prev) => ({ ...prev, image: e.target.value }))}
                        placeholder="/uploads/products/..."
                      />
                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        <label className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest ${addImageUploading ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`} style={{ background: 'var(--adm-paper)', color: 'var(--adm-ink)', border: '1px solid var(--adm-border)' }}>
                          <i className={`fas ${addImageUploading ? 'fa-spinner fa-spin' : 'fa-upload'}`}></i>
                          {addImageUploading ? 'Загрузка...' : 'Загрузить фото'}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={addImageUploading}
                            onChange={(e) => {
                              uploadImageForAdd(e.target.files?.[0]);
                              e.currentTarget.value = '';
                            }}
                          />
                        </label>
                        {addForm.image ? (
                          <button
                            type="button"
                            onClick={() => setAddForm((prev) => ({ ...prev, image: '' }))}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest"
                            style={{ background: '#fff8f0', color: '#b45309', border: '1px solid #f5d9a0' }}
                          >
                            <i className="fas fa-trash"></i>
                            Очистить
                          </button>
                        ) : null}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: 'var(--adm-ink-soft)' }}>Фото 2</div>
                      <input
                        className="w-full px-4 py-3 rounded-2xl outline-none transition-all text-sm"
                        style={{ background: 'var(--adm-paper)', border: '1px solid var(--adm-border)', color: 'var(--adm-ink)' }}
                        value={addForm.attrs.image2}
                        onChange={(e) => updateAddAttr('image2', e.target.value)}
                        placeholder="/uploads/products/..."
                      />
                    </div>
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: 'var(--adm-ink-soft)' }}>Фото 3</div>
                      <input
                        className="w-full px-4 py-3 rounded-2xl outline-none transition-all text-sm"
                        style={{ background: 'var(--adm-paper)', border: '1px solid var(--adm-border)', color: 'var(--adm-ink)' }}
                        value={addForm.attrs.image3}
                        onChange={(e) => updateAddAttr('image3', e.target.value)}
                        placeholder="/uploads/products/..."
                      />
                    </div>
                    <div className="md:col-span-2">
                      <div className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: 'var(--adm-ink-soft)' }}>Галерея</div>
                      <textarea
                        className="w-full px-4 py-3 rounded-2xl outline-none transition-all text-sm min-h-[96px]"
                        style={{ background: 'var(--adm-paper)', border: '1px solid var(--adm-border)', color: 'var(--adm-ink)' }}
                        value={addForm.attrs.gallery_images}
                        onChange={(e) => updateAddAttr('gallery_images', e.target.value)}
                        placeholder="URL через запятую или с новой строки"
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl p-6" style={{ background: 'var(--adm-bg)', border: '1px solid var(--adm-border)' }}>
                  <div className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: 'var(--adm-ink)' }}>Описание</div>
                  <div className="text-[11px] mb-5" style={{ color: 'var(--adm-ink-soft)' }}>Текст карточки товара, если он нужен отдельно от характеристик.</div>
                  <textarea
                    className="w-full px-4 py-3 rounded-2xl outline-none transition-all text-sm min-h-[220px]"
                    style={{ background: 'var(--adm-paper)', border: '1px solid var(--adm-border)', color: 'var(--adm-ink)' }}
                    value={addForm.description}
                    onChange={(e) => setAddForm((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Описание товара"
                  />
                </div>
              </div>

              <div className="mt-8 grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="rounded-3xl p-6" style={{ background: 'var(--adm-bg)', border: '1px solid var(--adm-border)' }}>
                  <div className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: 'var(--adm-ink)' }}>Цены</div>
                  <div className="text-[11px] mb-5" style={{ color: 'var(--adm-ink-soft)' }}>Логика такая же, как в шаблоне Excel: базовая цена и цены по типам продажи.</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {PRODUCT_PRICE_FIELDS.map(({ label, key }) => (
                      <div key={key}>
                        <div className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: 'var(--adm-ink-soft)' }}>{label}</div>
                        <input
                          className="w-full px-4 py-3 rounded-2xl outline-none transition-all text-sm"
                          style={{ background: 'var(--adm-paper)', border: '1px solid var(--adm-border)', color: 'var(--adm-ink)' }}
                          value={addForm.prices[key]}
                          onChange={(e) => updateAddPrice(key, e.target.value)}
                          placeholder="0"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-3xl p-6" style={{ background: 'var(--adm-bg)', border: '1px solid var(--adm-border)' }}>
                  <div className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: 'var(--adm-ink)' }}>Размеры и упаковка</div>
                  <div className="text-[11px] mb-5" style={{ color: 'var(--adm-ink-soft)' }}>Служебные поля шаблона, которые часто нужны отдельно от свободных характеристик.</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {PRODUCT_CORE_ATTR_FIELDS.map(({ label, key, full }) => (
                      <div key={key} className={full ? 'md:col-span-2' : ''}>
                        <div className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: 'var(--adm-ink-soft)' }}>{label}</div>
                        <input
                          className="w-full px-4 py-3 rounded-2xl outline-none transition-all text-sm"
                          style={{ background: 'var(--adm-paper)', border: '1px solid var(--adm-border)', color: 'var(--adm-ink)' }}
                          value={addForm.attrs[key]}
                          onChange={(e) => updateAddAttr(key, e.target.value)}
                          placeholder=""
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-8 rounded-3xl p-6" style={{ background: 'var(--adm-bg)', border: '1px solid var(--adm-border)' }}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
                  <div>
                    <div className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: 'var(--adm-ink)' }}>Произвольные характеристики</div>
                    <div className="text-[11px]" style={{ color: 'var(--adm-ink-soft)' }}>Любые характеристики из Excel: вы сами задаете название и значение. Например: материал, цвет, обивка, фасад, наполнитель.</div>
                  </div>
                  <button
                    type="button"
                    onClick={addAddCharacteristic}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest"
                    style={{ background: 'var(--adm-paper)', color: 'var(--adm-ink)', border: '1px solid var(--adm-border)' }}
                  >
                    <i className="fas fa-plus"></i>
                    Добавить характеристику
                  </button>
                </div>
                <div className="space-y-3">
                  {addForm.characteristics.length === 0 ? (
                    <div className="rounded-2xl px-4 py-4 text-sm" style={{ background: 'var(--adm-paper)', border: '1px dashed var(--adm-border)', color: 'var(--adm-ink-soft)' }}>
                      Пока нет дополнительных характеристик. Добавьте строку, если товар требует свои поля вне шаблонных размеров и цен.
                    </div>
                  ) : null}
                  {addForm.characteristics.map((item) => (
                    <div key={item.id} className="grid grid-cols-1 md:grid-cols-[0.9fr_1.1fr_auto] gap-3 items-start">
                      <input
                        className="w-full px-4 py-3 rounded-2xl outline-none transition-all text-sm"
                        style={{ background: 'var(--adm-paper)', border: '1px solid var(--adm-border)', color: 'var(--adm-ink)' }}
                        value={item.key}
                        onChange={(e) => updateAddCharacteristic(item.id, 'key', e.target.value)}
                        placeholder="Название, например: материал"
                      />
                      <input
                        className="w-full px-4 py-3 rounded-2xl outline-none transition-all text-sm"
                        style={{ background: 'var(--adm-paper)', border: '1px solid var(--adm-border)', color: 'var(--adm-ink)' }}
                        value={item.value}
                        onChange={(e) => updateAddCharacteristic(item.id, 'value', e.target.value)}
                        placeholder={formatCharacteristicLabel(item.key)}
                      />
                      <button
                        type="button"
                        onClick={() => removeAddCharacteristic(item.id)}
                        className="inline-flex items-center justify-center gap-2 px-3 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest"
                        style={{ background: '#fff8f0', color: '#b45309', border: '1px solid #f5d9a0' }}
                      >
                        <i className="fas fa-trash"></i>
                        Удалить
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-10 flex flex-col sm:flex-row gap-3 sm:justify-end">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-7 py-3 rounded-xl font-bold uppercase tracking-widest text-xs transition-all"
                  style={{ background: 'var(--adm-bg)', color: 'var(--adm-ink-soft)', border: '1px solid var(--adm-border)' }}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-7 py-3 rounded-xl font-bold uppercase tracking-widest text-xs transition-all hover:opacity-90"
                  style={{ background: 'var(--adm-ink)', color: 'var(--adm-paper)' }}
                >
                  Сохранить товар
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isEditOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-3 sm:p-5">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsEditOpen(false)}
          />
          <div
            className="relative w-[min(1080px,96vw)] max-h-[92vh] overflow-y-auto rounded-3xl"
            style={{ background: 'var(--adm-paper)', border: '1px solid var(--adm-border)', boxShadow: 'var(--adm-shadow)' }}
          >
            <div className="p-6 sm:p-8 border-b" style={{ borderColor: 'var(--adm-border)' }}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="adm-eyebrow mb-2">Админ панель ADM</div>
                  <div className="text-2xl font-black leading-tight" style={{ color: 'var(--adm-ink)', fontFamily: 'Montserrat, sans-serif' }}>Редактирование товара</div>
                  <div className="text-sm mt-1" style={{ color: 'var(--adm-ink-soft)' }}>Измените поля и сохраните изменения</div>
                  <div className="text-[11px] font-bold uppercase tracking-widest mt-3" style={{ color: 'var(--adm-accent)' }}>
                    Категория: {editForm.category_title || '---'}
                  </div>
                </div>
                {editForm.image ? (
                  <div className="hidden md:flex items-center gap-3 rounded-2xl px-3 py-2" style={{ background: 'var(--adm-bg)', border: '1px solid var(--adm-border)' }}>
                    <img
                      src={editForm.image}
                      alt={editForm.name || 'preview'}
                      className="w-12 h-12 rounded-xl object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    <div className="text-xs font-semibold" style={{ color: 'var(--adm-ink-soft)' }}>Превью фото</div>
                  </div>
                ) : null}
              </div>
              <button
                onClick={() => setIsEditOpen(false)}
                className="absolute top-5 right-5 w-10 h-10 rounded-2xl transition-all"
                style={{ background: 'var(--adm-bg)', color: 'var(--adm-ink-soft)', border: '1px solid var(--adm-border)' }}
                title="Закрыть"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <form onSubmit={submitEditProduct} className="p-6 sm:p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: 'var(--adm-ink-soft)' }}>Наименование</div>
                  <input
                    className="w-full px-4 py-3 rounded-2xl outline-none transition-all text-sm"
                    style={{ background: 'var(--adm-paper)', border: '1px solid var(--adm-border)', color: 'var(--adm-ink)' }}
                    value={editForm.name}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Название товара"
                  />
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: 'var(--adm-ink-soft)' }}>Сегмент / группа</div>
                  <input
                    className="w-full px-4 py-3 rounded-2xl outline-none transition-all text-sm"
                    style={{ background: 'var(--adm-paper)', border: '1px solid var(--adm-border)', color: 'var(--adm-ink)' }}
                    value={editForm.brandOrGroup}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, brandOrGroup: e.target.value }))}
                    placeholder="Например: Кухни"
                  />
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: 'var(--adm-ink-soft)' }}>Наличие</div>
                  <button
                    type="button"
                    onClick={() => setEditForm((prev) => ({ ...prev, inStock: !prev.inStock }))}
                    className={`w-full px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest ${editForm.inStock ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-600 border border-red-200'}`}
                  >
                    {editForm.inStock ? 'В наличии' : 'Нет в наличии'}
                  </button>
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: 'var(--adm-ink-soft)' }}>Ед. изм.</div>
                  <input
                    className="w-full px-4 py-3 rounded-2xl outline-none transition-all text-sm"
                    style={{ background: 'var(--adm-paper)', border: '1px solid var(--adm-border)', color: 'var(--adm-ink)' }}
                    value={editForm.unit}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, unit: e.target.value }))}
                    placeholder="шт / м2 / м3"
                  />
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: 'var(--adm-ink-soft)' }}>Артикул (SKU)</div>
                  <input
                    className="w-full px-4 py-3 rounded-2xl outline-none transition-all text-sm"
                    style={{ background: 'var(--adm-paper)', border: '1px solid var(--adm-border)', color: 'var(--adm-ink)' }}
                    value={editForm.sku}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, sku: e.target.value }))}
                    placeholder="FUR-01"
                  />
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: 'var(--adm-ink-soft)' }}>Категория</div>
                  <div className="w-full px-4 py-3 rounded-2xl text-sm" style={{ background: 'var(--adm-bg)', border: '1px solid var(--adm-border)', color: 'var(--adm-ink)' }}>
                    {editForm.category_title || '---'}
                  </div>
                </div>
              </div>

              <div className="mt-8 grid grid-cols-1 xl:grid-cols-[1.08fr_0.92fr] gap-6">
                <div className="rounded-3xl p-6" style={{ background: 'var(--adm-bg)', border: '1px solid var(--adm-border)' }}>
                  <div className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: 'var(--adm-ink)' }}>Медиа</div>
                  <div className="text-[11px] mb-5" style={{ color: 'var(--adm-ink-soft)' }}>Главное фото и дополнительные изображения товара.</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="md:col-span-2">
                      <div className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: 'var(--adm-ink-soft)' }}>Главное фото</div>
                      <input
                        className="w-full px-4 py-3 rounded-2xl outline-none transition-all text-sm"
                        style={{ background: 'var(--adm-paper)', border: '1px solid var(--adm-border)', color: 'var(--adm-ink)' }}
                        value={editForm.image}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, image: e.target.value }))}
                        placeholder="/uploads/products/..."
                      />
                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        <label
                          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest ${editImageUploading ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
                          style={{ background: 'var(--adm-paper)', color: 'var(--adm-ink)', border: '1px solid var(--adm-border)' }}
                        >
                          <i className={`fas ${editImageUploading ? 'fa-spinner fa-spin' : 'fa-upload'}`}></i>
                          {editImageUploading ? 'Загрузка...' : 'Загрузить фото'}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={editImageUploading}
                            onChange={(e) => {
                              uploadImageForEdit(e.target.files?.[0]);
                              e.currentTarget.value = '';
                            }}
                          />
                        </label>
                        {editForm.image ? (
                          <button
                            type="button"
                            onClick={removeMainImageForEdit}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest"
                            style={{ background: '#fff8f0', color: '#b45309', border: '1px solid #f5d9a0' }}
                          >
                            <i className="fas fa-trash"></i>
                            Удалить главное фото
                          </button>
                        ) : null}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: 'var(--adm-ink-soft)' }}>Фото 2</div>
                      <input
                        className="w-full px-4 py-3 rounded-2xl outline-none transition-all text-sm"
                        style={{ background: 'var(--adm-paper)', border: '1px solid var(--adm-border)', color: 'var(--adm-ink)' }}
                        value={editForm.attrs.image2}
                        onChange={(e) => updateEditAttr('image2', e.target.value)}
                        placeholder="/uploads/products/..."
                      />
                      <div className="mt-2 flex items-center gap-2">
                        <label
                          className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest ${editExtraImageUploading.image2 ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
                          style={{ background: 'var(--adm-paper)', color: 'var(--adm-ink)', border: '1px solid var(--adm-border)' }}
                        >
                          <i className={`fas ${editExtraImageUploading.image2 ? 'fa-spinner fa-spin' : 'fa-upload'}`}></i>
                          {editExtraImageUploading.image2 ? 'Загрузка...' : 'Загрузить фото 2'}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={editExtraImageUploading.image2}
                            onChange={(e) => {
                              uploadImageForEditExtra('image2', e.target.files?.[0]);
                              e.currentTarget.value = '';
                            }}
                          />
                        </label>
                        {editForm.attrs.image2 ? (
                          <button
                            type="button"
                            onClick={() => removeExtraImageForEdit('image2')}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest"
                            style={{ background: '#fff8f0', color: '#b45309', border: '1px solid #f5d9a0' }}
                          >
                            <i className="fas fa-trash"></i>
                            Удалить
                          </button>
                        ) : null}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: 'var(--adm-ink-soft)' }}>Фото 3</div>
                      <input
                        className="w-full px-4 py-3 rounded-2xl outline-none transition-all text-sm"
                        style={{ background: 'var(--adm-paper)', border: '1px solid var(--adm-border)', color: 'var(--adm-ink)' }}
                        value={editForm.attrs.image3}
                        onChange={(e) => updateEditAttr('image3', e.target.value)}
                        placeholder="/uploads/products/..."
                      />
                      <div className="mt-2 flex items-center gap-2">
                        <label
                          className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest ${editExtraImageUploading.image3 ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
                          style={{ background: 'var(--adm-paper)', color: 'var(--adm-ink)', border: '1px solid var(--adm-border)' }}
                        >
                          <i className={`fas ${editExtraImageUploading.image3 ? 'fa-spinner fa-spin' : 'fa-upload'}`}></i>
                          {editExtraImageUploading.image3 ? 'Загрузка...' : 'Загрузить фото 3'}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={editExtraImageUploading.image3}
                            onChange={(e) => {
                              uploadImageForEditExtra('image3', e.target.files?.[0]);
                              e.currentTarget.value = '';
                            }}
                          />
                        </label>
                        {editForm.attrs.image3 ? (
                          <button
                            type="button"
                            onClick={() => removeExtraImageForEdit('image3')}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest"
                            style={{ background: '#fff8f0', color: '#b45309', border: '1px solid #f5d9a0' }}
                          >
                            <i className="fas fa-trash"></i>
                            Удалить
                          </button>
                        ) : null}
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <div className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: 'var(--adm-ink-soft)' }}>Галерея</div>
                      <textarea
                        className="w-full px-4 py-3 rounded-2xl outline-none transition-all text-sm min-h-[96px]"
                        style={{ background: 'var(--adm-paper)', border: '1px solid var(--adm-border)', color: 'var(--adm-ink)' }}
                        value={editForm.attrs.gallery_images}
                        onChange={(e) => updateEditAttr('gallery_images', e.target.value)}
                        placeholder="URL через запятую или с новой строки"
                      />
                      <div className="mt-2">
                        <button
                          type="button"
                          onClick={clearGalleryForEdit}
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest"
                          style={{ background: '#fff8f0', color: '#b45309', border: '1px solid #f5d9a0' }}
                        >
                          <i className="fas fa-eraser"></i>
                          Очистить галерею
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl p-6" style={{ background: 'var(--adm-bg)', border: '1px solid var(--adm-border)' }}>
                  <div className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: 'var(--adm-ink)' }}>Описание</div>
                  <div className="text-[11px] mb-5" style={{ color: 'var(--adm-ink-soft)' }}>Отдельный текст товара, если он нужен кроме характеристик и цен.</div>
                  <textarea
                    className="w-full px-4 py-3 rounded-2xl outline-none transition-all text-sm min-h-[250px]"
                    style={{ background: 'var(--adm-paper)', border: '1px solid var(--adm-border)', color: 'var(--adm-ink)' }}
                    value={editForm.description}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Описание товара"
                  />
                </div>
              </div>

              <div className="mt-8 grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="rounded-3xl p-6" style={{ background: 'var(--adm-bg)', border: '1px solid var(--adm-border)' }}>
                  <div className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: 'var(--adm-ink)' }}>Цены</div>
                  <div className="text-[11px] mb-5" style={{ color: 'var(--adm-ink-soft)' }}>Схема Excel: базовая цена, цена за единицу и коммерческие уровни.</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {PRODUCT_PRICE_FIELDS.map(({ label, key }) => (
                      <div key={key}>
                        <div className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: 'var(--adm-ink-soft)' }}>{label}</div>
                        <input
                          className="w-full px-4 py-3 rounded-2xl outline-none transition-all text-sm"
                          style={{ background: 'var(--adm-paper)', border: '1px solid var(--adm-border)', color: 'var(--adm-ink)' }}
                          value={editForm.prices[key]}
                          onChange={(e) => updateEditPrice(key, e.target.value)}
                          placeholder=""
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-3xl p-6" style={{ background: 'var(--adm-bg)', border: '1px solid var(--adm-border)' }}>
                  <div className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: 'var(--adm-ink)' }}>Размеры и упаковка</div>
                  <div className="text-[11px] mb-5" style={{ color: 'var(--adm-ink-soft)' }}>Отдельные системные поля шаблона, которые используются чаще всего.</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {PRODUCT_CORE_ATTR_FIELDS.map(({ label, key, full }) => (
                      <div key={key} className={full ? 'md:col-span-2' : ''}>
                        <div className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: 'var(--adm-ink-soft)' }}>{label}</div>
                        <input
                          className="w-full px-4 py-3 rounded-2xl outline-none transition-all text-sm"
                          style={{ background: 'var(--adm-paper)', border: '1px solid var(--adm-border)', color: 'var(--adm-ink)' }}
                          value={editForm.attrs[key]}
                          onChange={(e) => updateEditAttr(key, e.target.value)}
                          placeholder=""
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-8 rounded-3xl p-6" style={{ background: 'var(--adm-bg)', border: '1px solid var(--adm-border)' }}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
                  <div>
                    <div className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: 'var(--adm-ink)' }}>Произвольные характеристики</div>
                    <div className="text-[11px]" style={{ color: 'var(--adm-ink-soft)' }}>Здесь показываются все дополнительные характеристики из Excel и любые новые пары ключ-значение, которые вы добавите вручную.</div>
                  </div>
                  <button
                    type="button"
                    onClick={addEditCharacteristic}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest"
                    style={{ background: 'var(--adm-paper)', color: 'var(--adm-ink)', border: '1px solid var(--adm-border)' }}
                  >
                    <i className="fas fa-plus"></i>
                    Добавить характеристику
                  </button>
                </div>
                <div className="space-y-3">
                  {editForm.characteristics.length === 0 ? (
                    <div className="rounded-2xl px-4 py-4 text-sm" style={{ background: 'var(--adm-paper)', border: '1px dashed var(--adm-border)', color: 'var(--adm-ink-soft)' }}>
                      Дополнительных характеристик пока нет. Если в Excel появятся новые поля, их можно вести здесь без изменения кода.
                    </div>
                  ) : null}
                  {editForm.characteristics.map((item) => (
                    <div key={item.id} className="grid grid-cols-1 md:grid-cols-[0.9fr_1.1fr_auto] gap-3 items-start">
                      <input
                        className="w-full px-4 py-3 rounded-2xl outline-none transition-all text-sm"
                        style={{ background: 'var(--adm-paper)', border: '1px solid var(--adm-border)', color: 'var(--adm-ink)' }}
                        value={item.key}
                        onChange={(e) => updateEditCharacteristic(item.id, 'key', e.target.value)}
                        placeholder="Название характеристики"
                      />
                      <input
                        className="w-full px-4 py-3 rounded-2xl outline-none transition-all text-sm"
                        style={{ background: 'var(--adm-paper)', border: '1px solid var(--adm-border)', color: 'var(--adm-ink)' }}
                        value={item.value}
                        onChange={(e) => updateEditCharacteristic(item.id, 'value', e.target.value)}
                        placeholder={formatCharacteristicLabel(item.key)}
                      />
                      <button
                        type="button"
                        onClick={() => removeEditCharacteristic(item.id)}
                        className="inline-flex items-center justify-center gap-2 px-3 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest"
                        style={{ background: '#fff8f0', color: '#b45309', border: '1px solid #f5d9a0' }}
                      >
                        <i className="fas fa-trash"></i>
                        Удалить
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-10 flex flex-col sm:flex-row gap-3 sm:justify-end">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="px-7 py-3 rounded-xl font-bold uppercase tracking-widest text-xs transition-all"
                  style={{ background: 'var(--adm-bg)', color: 'var(--adm-ink-soft)', border: '1px solid var(--adm-border)' }}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-7 py-3 rounded-xl font-bold uppercase tracking-widest text-xs transition-all hover:opacity-90"
                  style={{ background: 'var(--adm-ink)', color: 'var(--adm-paper)' }}
                >
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;

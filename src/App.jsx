import { useEffect, useMemo, useRef, useState } from 'react';
import { FolderPlus, Plus, Search, Settings, X } from 'lucide-react';
import AppTile from './components/AppTile.jsx';
import FolderOverlay from './components/FolderOverlay.jsx';
import FolderTile from './components/FolderTile.jsx';
import SearchOverlay from './components/SearchOverlay.jsx';
import SettingsModal from './components/SettingsModal.jsx';
import ShadowWidget from './components/ShadowWidget.jsx';
import { deleteIcon, deleteWallpaper, deleteWidgetFromGallery, exportBackup, fetchDashboard, importBackup, saveDashboard } from './lib/api.js';
import { createTranslator, DEFAULT_LOCALE, getLocaleTag, getWeatherApiLanguage, normalizeLocale, weatherCodeToLabel } from './i18n.js';

const DEFAULT_THEME = {
  accent: '#4f7cff',
  topbar: '#091521',
  panel: '#0f1a2b',
  iconShape: 'rounded-square',
  gridGapX: 0,
  gridGapY: 0
};

const DEFAULT_WEATHER_CITY = 'Paris';
const FOLDER_PAGE_SIZE = 9;
const DEFAULT_BRAND_NAME = 'Home';
const DEFAULT_PAGE_TITLE = 'Home Dashboard';
const DEFAULT_PAGE_ICON = '/icons/icon-192.png';
const LOCAL_DASHBOARD_DRAFT_KEY = 'home-dashboard-local-draft';
const LOCAL_DASHBOARD_DRAFT_VERSION = 1;

function normalizeUrl(rawValue) {
  const value = (rawValue || '').trim();
  if (!value) {
    return '';
  }
  if (/^https?:\/\//i.test(value)) {
    return value;
  }
  return `https://${value}`;
}

function faviconForUrl(rawUrl) {
  const normalized = normalizeUrl(rawUrl);
  if (!normalized) {
    return '';
  }
  const url = new URL(normalized);
  return `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=128`;
}

function isImageLikeIcon(value) {
  return typeof value === 'string' && /^(https?:\/\/|\/uploads\/|\/icons\/|data:)/.test(value);
}

function createEmojiIconDataUrl(value) {
  const label = (value || 'H').trim().slice(0, 2) || 'H';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192" viewBox="0 0 192 192"><rect width="192" height="192" rx="44" fill="#0c243b"/><text x="96" y="108" text-anchor="middle" font-size="92">${label.replace(/[<&>]/g, '')}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function resolvePageIconHref(value) {
  if (isImageLikeIcon(value)) {
    return value;
  }
  return createEmojiIconDataUrl(value || 'H');
}

function parseUpdatedAt(value) {
  const time = Date.parse(value || '');
  return Number.isFinite(time) ? time : 0;
}

function readLocalDashboardDraft() {
  try {
    const rawValue = window.localStorage.getItem(LOCAL_DASHBOARD_DRAFT_KEY);
    if (!rawValue) {
      return null;
    }
    const parsed = JSON.parse(rawValue);
    if (parsed && typeof parsed === 'object' && parsed.payload && Number(parsed.version) === LOCAL_DASHBOARD_DRAFT_VERSION) {
      return {
        version: LOCAL_DASHBOARD_DRAFT_VERSION,
        dirty: Boolean(parsed.dirty),
        payload: parsed.payload
      };
    }
    return {
      version: 0,
      dirty: false,
      payload: parsed
    };
  } catch {
    return null;
  }
}

function writeLocalDashboardDraft(payload, dirty = true) {
  try {
    window.localStorage.setItem(
      LOCAL_DASHBOARD_DRAFT_KEY,
      JSON.stringify({
        version: LOCAL_DASHBOARD_DRAFT_VERSION,
        dirty,
        payload
      })
    );
  } catch {
    // Ignore storage quota or privacy mode failures.
  }
}

function clearLocalDashboardDraft() {
  try {
    window.localStorage.removeItem(LOCAL_DASHBOARD_DRAFT_KEY);
  } catch {
    // Ignore storage cleanup failures.
  }
}

function extractDroppedLink(dataTransfer) {
  const uriList = dataTransfer.getData('text/uri-list');
  const text = dataTransfer.getData('text/plain');
  const html = dataTransfer.getData('text/html');
  const rawUrl = (uriList || text || '').split('\n').find((value) => /^https?:\/\//i.test(value.trim()))?.trim() || '';
  if (!rawUrl) {
    return null;
  }

  let label = '';
  if (html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    label = doc.querySelector('a')?.textContent?.trim() || doc.body?.textContent?.trim() || '';
  }

  if (!label || /^https?:\/\//i.test(label)) {
    try {
      label = new URL(rawUrl).hostname.replace(/^www\./i, '');
    } catch {
      label = rawUrl;
    }
  }

  return {
    url: rawUrl,
    name: label
  };
}

function getGridSpec(width) {
  if (width >= 1280) {
    return { columns: 12, gap: 28, rowHeight: 112, padX: 80, padTop: 42, minRows: 6 };
  }
  if (width >= 768) {
    return { columns: 8, gap: 22, rowHeight: 104, padX: 40, padTop: 34, minRows: 6 };
  }
  return { columns: 4, gap: 16, rowHeight: 84, padX: 14, padTop: 18, minRows: 7 };
}

function hexToRgba(hex, alpha) {
  const normalized = (hex || '#000000').replace('#', '');
  const full = normalized.length === 3 ? normalized.split('').map((char) => char + char).join('') : normalized.padEnd(6, '0');
  const value = Number.parseInt(full.slice(0, 6), 16);
  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function sortItems(items) {
  return [...items].sort((left, right) => {
    if ((left.page || 0) !== (right.page || 0)) {
      return (left.page || 0) - (right.page || 0);
    }
    if ((left.y || 1) !== (right.y || 1)) {
      return (left.y || 1) - (right.y || 1);
    }
    if ((left.x || 1) !== (right.x || 1)) {
      return (left.x || 1) - (right.x || 1);
    }
    return left.id.localeCompare(right.id);
  });
}

function overlaps(a, b) {
  return !(
    a.x + a.w - 1 < b.x ||
    b.x + b.w - 1 < a.x ||
    a.y + a.h - 1 < b.y ||
    b.y + b.h - 1 < a.y
  );
}

function clampRect(rect, columns) {
  const width = Math.max(1, Math.min(rect.w || 1, columns));
  return {
    ...rect,
    x: Math.max(1, Math.min(rect.x || 1, Math.max(1, columns - width + 1))),
    y: Math.max(1, rect.y || 1),
    w: width,
    h: Math.max(1, rect.h || 1)
  };
}

function findOpenPosition(placed, desired, columns) {
  const target = clampRect(desired, columns);
  const startY = Math.max(1, target.y);
  const maxRows = Math.max(startY + 20, 40);
  for (let y = startY; y <= maxRows; y += 1) {
    const startX = y === startY ? target.x : 1;
    for (let x = startX; x <= Math.max(1, columns - target.w + 1); x += 1) {
      const candidate = { ...target, x, y };
      if (!placed.some((item) => overlaps(candidate, item))) {
        return candidate;
      }
    }
  }
  return { ...target, x: 1, y: maxRows + 1 };
}

function simulatePage(items, movingId, targetRect, columns) {
  const movingItem = items.find((item) => item.id === movingId);
  if (!movingItem) {
    return items;
  }
  const target = clampRect({ ...movingItem, ...targetRect }, columns);
  const anchoredFolders = sortItems(items)
    .filter((item) => item.id !== movingId && isFolder(item))
    .map((item) => ({ ...item, ...clampRect(item, columns) }));
  const movingCandidate = anchoredFolders.some((entry) => overlaps(entry, target)) ? findOpenPosition(anchoredFolders, target, columns) : target;
  const placed = [...anchoredFolders, { ...movingItem, ...movingCandidate }];
  sortItems(items)
    .filter((item) => item.id !== movingId && !isFolder(item))
    .forEach((item) => {
      const desired = clampRect(item, columns);
      const nextPosition = placed.some((entry) => overlaps(entry, desired))
        ? findOpenPosition(placed, desired, columns)
        : desired;
      placed.push({ ...item, ...nextPosition });
    });
  return placed;
}

function deriveLayout(items, pagesCount) {
  return Array.from({ length: pagesCount }, (_, pageIndex) =>
    sortItems(items)
      .filter((item) => (item.page || 0) === pageIndex)
      .map((item) => item.id)
  );
}

function compactPages(items, pagesCount) {
  const pages = Array.from({ length: Math.max(1, pagesCount) }, (_, pageIndex) => ({
    pageIndex,
    items: sortItems(items.filter((item) => (item.page || 0) === pageIndex))
  }));
  const nonEmptyPages = pages.filter((entry) => entry.items.length > 0);

  if (!nonEmptyPages.length) {
    return { items: [], pagesCount: 1 };
  }

  const pageMap = new Map(nonEmptyPages.map((entry, index) => [entry.pageIndex, index]));
  return {
    items: sortItems(
      items.map((item) => ({
        ...item,
        page: pageMap.get(item.page || 0) ?? 0
      }))
    ),
    pagesCount: Math.max(1, nonEmptyPages.length)
  };
}

function positionsChanged(currentItems, nextItems) {
  if (currentItems.length !== nextItems.length) {
    return true;
  }
  const currentMap = new Map(currentItems.map((item) => [item.id, item]));
  return nextItems.some((item) => {
    const current = currentMap.get(item.id);
    return !current || current.page !== item.page || current.x !== item.x || current.y !== item.y || current.w !== item.w || current.h !== item.h;
  });
}

function normalizePlacedItems(items, pagesCount, columns) {
  const nextItems = [];
  for (let pageIndex = 0; pageIndex < pagesCount; pageIndex += 1) {
    const pageItems = items.filter((item) => (item.page || 0) === pageIndex);
    const placed = [];
    sortItems(pageItems).forEach((item) => {
      const desired = clampRect(item, columns);
      const nextPosition = placed.some((entry) => overlaps(entry, desired))
        ? findOpenPosition(placed, desired, columns)
        : desired;
      const normalized = { ...item, ...nextPosition, page: pageIndex };
      placed.push(normalized);
      nextItems.push(normalized);
    });
  }
  return sortItems(nextItems);
}

function buildPreviewItems(items, movingId, targetPage, targetRect, columns) {
  const movingItem = items.find((item) => item.id === movingId);
  if (!movingItem) {
    return items;
  }
  const nextItems = items.filter((item) => item.id !== movingId).map((item) => ({ ...item }));
  const targetPageItems = nextItems.filter((item) => (item.page || 0) === targetPage);
  const movedItem = { ...movingItem, ...targetRect, page: targetPage };
  const simulatedTargetPage = simulatePage([...targetPageItems, movedItem], movingId, movedItem, columns);
  const remaining = nextItems.filter((item) => (item.page || 0) !== targetPage);
  return sortItems([...remaining, ...simulatedTargetPage]);
}

function migrateLegacy(items, layout, columns) {
  const placed = [];
  const fallbackLayout = Array.isArray(layout) && layout.length ? layout : [items.map((item) => item.id)];
  fallbackLayout.forEach((pageItems, pageIndex) => {
    const pagePlaced = [];
    pageItems.forEach((itemId) => {
      const item = items.find((entry) => entry.id === itemId);
      if (!item) {
        return;
      }
      const nextPosition = findOpenPosition(pagePlaced, { x: 1, y: 1, w: item.w || 1, h: item.h || 1 }, columns);
      const migrated = { ...item, ...nextPosition, page: pageIndex };
      pagePlaced.push(migrated);
      placed.push(migrated);
    });
  });
  return sortItems(placed);
}

function normalizeDashboard(rawDashboard, columns) {
  const dashboard = rawDashboard || {};
  const sourceItems = Array.isArray(dashboard.items) ? dashboard.items : [];
  const hasExplicitPositions = sourceItems.every(
    (item) => Number.isFinite(item.page) && Number.isFinite(item.x) && Number.isFinite(item.y)
  );
  const pageCountFromItems = sourceItems.length ? Math.max(...sourceItems.map((item) => Number(item.page || 0))) + 1 : 1;
  const pagesCount = Math.max(Array.isArray(dashboard.layout) ? dashboard.layout.length : 0, pageCountFromItems, 1);
  const positionedItems = hasExplicitPositions
    ? normalizePlacedItems(sourceItems.map((item) => ({ ...item })), pagesCount, columns)
    : migrateLegacy(sourceItems.map((item) => ({ ...item })), dashboard.layout, columns);
  return {
    items: positionedItems.map((item) => (isFolder(item) ? normalizeFolder(item) : item)),
    pagesCount,
    wallpaper: dashboard.wallpaper || '',
    weatherCity: dashboard.weatherCity || DEFAULT_WEATHER_CITY,
    showWeather: dashboard.showWeather !== false,
    locale: normalizeLocale(dashboard.locale || DEFAULT_LOCALE),
    dashboardName: dashboard.dashboardName || DEFAULT_BRAND_NAME,
    pageTitle: dashboard.pageTitle || DEFAULT_PAGE_TITLE,
    pageIcon: dashboard.pageIcon || DEFAULT_PAGE_ICON,
    uiTheme: {
      accent: dashboard.uiTheme?.accent || DEFAULT_THEME.accent,
      topbar: dashboard.uiTheme?.topbar || DEFAULT_THEME.topbar,
      panel: dashboard.uiTheme?.panel || DEFAULT_THEME.panel,
      iconShape: dashboard.uiTheme?.iconShape || DEFAULT_THEME.iconShape,
      gridGapX: Number.isFinite(Number(dashboard.uiTheme?.gridGapX)) ? Number(dashboard.uiTheme.gridGapX) : DEFAULT_THEME.gridGapX,
      gridGapY: Number.isFinite(Number(dashboard.uiTheme?.gridGapY)) ? Number(dashboard.uiTheme.gridGapY) : DEFAULT_THEME.gridGapY
    }
  };
}

function pageRows(items, minRows) {
  const maxRow = items.reduce((value, item) => Math.max(value, (item.y || 1) + (item.h || 1) - 1), 0);
  return Math.max(minRows, maxRow + 1);
}

export default function App() {
  const [items, setItems] = useState([]);
  const [pagesCount, setPagesCount] = useState(1);
  const [widgetLibrary, setWidgetLibrary] = useState([]);
  const [iconLibrary, setIconLibrary] = useState([]);
  const [wallpaperLibrary, setWallpaperLibrary] = useState([]);
  const [wallpaper, setWallpaper] = useState('');
  const [weatherCity, setWeatherCity] = useState(DEFAULT_WEATHER_CITY);
  const [showWeather, setShowWeather] = useState(true);
  const [locale, setLocale] = useState(DEFAULT_LOCALE);
  const [dashboardName, setDashboardName] = useState(DEFAULT_BRAND_NAME);
  const [pageTitle, setPageTitle] = useState(DEFAULT_PAGE_TITLE);
  const [pageIcon, setPageIcon] = useState(DEFAULT_PAGE_ICON);
  const [weather, setWeather] = useState(null);
  const [uiTheme, setUiTheme] = useState(DEFAULT_THEME);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showSearch, setShowSearch] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState('appearance');
  const [editingAppId, setEditingAppId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [draggedId, setDraggedId] = useState(null);
  const [dragPreviewItems, setDragPreviewItems] = useState(null);
  const [dragTarget, setDragTarget] = useState(null);
  const [combineTarget, setCombineTarget] = useState(null);
  const [openFolderId, setOpenFolderId] = useState(null);
  const [openFolderPage, setOpenFolderPage] = useState(0);
  const [folderDraggingId, setFolderDraggingId] = useState(null);
  const [time, setTime] = useState(new Date());
  const [windowWidth, setWindowWidth] = useState(() => window.innerWidth);
  const [resizingId, setResizingId] = useState(null);
  const scrollRef = useRef(null);
  const resizeSessionRef = useRef(null);
  const dragPreviewRef = useRef(null);
  const persistPayloadRef = useRef(null);
  const saveGenRef = useRef(0);
  const skipInitialSaveRef = useRef(true);
  const itemGestureRef = useRef(null);
  const edgeSwitchRef = useRef(null);
  const pageSwipeRef = useRef(null);
  const suppressClickRef = useRef(false);
  const folderGestureRef = useRef(null);

  const gridSpec = useMemo(() => getGridSpec(windowWidth), [windowWidth]);
  const extraGapX = Math.max(0, Math.min(32, Number(uiTheme.gridGapX || 0)));
  const extraGapY = Math.max(0, Math.min(64, Number(uiTheme.gridGapY || 0)));
  const horizontalGap = gridSpec.gap + extraGapX;
  const verticalGap = Math.max(0, gridSpec.gap + extraGapY);
  const t = useMemo(() => createTranslator(locale), [locale]);
  const localeTag = useMemo(() => getLocaleTag(locale), [locale]);
  const activeItems = dragPreviewItems || items;
  const groupedItems = useMemo(
    () => Array.from({ length: pagesCount }, (_, pageIndex) => sortItems(activeItems.filter((item) => (item.page || 0) === pageIndex))),
    [activeItems, pagesCount]
  );

  useEffect(() => {
    function onResize() {
      setWindowWidth(window.innerWidth);
    }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const localDraft = readLocalDashboardDraft();
      let response = null;

      try {
        response = await fetchDashboard();
      } catch (error) {
        if (!localDraft) {
          throw error;
        }
      }

      if (cancelled) {
        return;
      }

      const localPayload = localDraft?.payload || null;
      const serverPayload = response?.dashboard || null;
      // Only use local draft if server is unreachable AND the draft was marked dirty
      const useLocalDraft = !serverPayload && Boolean(localDraft?.dirty) && localPayload;
      const sourceDashboard = useLocalDraft ? localPayload : (serverPayload || localPayload);

      // Always clear local draft when server is reachable to avoid stale overrides
      if (serverPayload) {
        clearLocalDashboardDraft();
      }

      const normalized = normalizeDashboard(sourceDashboard, gridSpec.columns);
      setItems(normalized.items);
      setPagesCount(normalized.pagesCount);
      setWallpaper(normalized.wallpaper);
      setWeatherCity(normalized.weatherCity);
      setShowWeather(normalized.showWeather);
      setLocale(normalized.locale);
      setDashboardName(normalized.dashboardName);
      setPageTitle(normalized.pageTitle);
      setPageIcon(normalized.pageIcon);
      setUiTheme(normalized.uiTheme);
      setWidgetLibrary(response?.widgetLibrary || []);
      setIconLibrary(response?.iconLibrary || []);
      setWallpaperLibrary(response?.wallpapers || []);
      setIsLoading(false);
    }
    load().catch((error) => {
      console.error(error);
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [gridSpec.columns]);

  useEffect(() => {
    if (isLoading) {
      return;
    }
    setItems((currentItems) => {
      const normalizedItems = normalizePlacedItems(currentItems, pagesCount, gridSpec.columns);
      return positionsChanged(currentItems, normalizedItems) ? normalizedItems : currentItems;
    });
  }, [gridSpec.columns, isLoading, pagesCount]);

  useEffect(() => {
    const timer = window.setInterval(() => setTime(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    dragPreviewRef.current = dragPreviewItems;
  }, [dragPreviewItems]);

  useEffect(() => {
    document.documentElement.lang = normalizeLocale(locale);
  }, [locale]);

  useEffect(() => {
    document.title = pageTitle || DEFAULT_PAGE_TITLE;

    const iconHref = resolvePageIconHref(pageIcon);
    const iconSelectors = [
      { rel: 'icon', sizes: null },
      { rel: 'apple-touch-icon', sizes: null }
    ];

    iconSelectors.forEach(({ rel, sizes }) => {
      let link = document.head.querySelector(`link[rel="${rel}"]${sizes ? `[sizes="${sizes}"]` : ''}`);
      if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', rel);
        if (sizes) {
          link.setAttribute('sizes', sizes);
        }
        document.head.appendChild(link);
      }
      link.setAttribute('href', iconHref);
    });

    let appleTitle = document.head.querySelector('meta[name="apple-mobile-web-app-title"]');
    if (!appleTitle) {
      appleTitle = document.createElement('meta');
      appleTitle.setAttribute('name', 'apple-mobile-web-app-title');
      document.head.appendChild(appleTitle);
    }
    appleTitle.setAttribute('content', pageTitle || DEFAULT_PAGE_TITLE);
  }, [pageIcon, pageTitle]);

  useEffect(() => {
    function persistDraftOnUnload() {
      if (persistPayloadRef.current) {
        writeLocalDashboardDraft(persistPayloadRef.current);
      }
    }

    window.addEventListener('beforeunload', persistDraftOnUnload);
    return () => window.removeEventListener('beforeunload', persistDraftOnUnload);
  }, []);

  useEffect(() => {
    if (isLoading) {
      return;
    }
    if (skipInitialSaveRef.current) {
      skipInitialSaveRef.current = false;
      return;
    }
    const payload = {
      wallpaper,
      weatherCity,
      showWeather,
      locale,
      dashboardName,
      pageTitle,
      pageIcon,
      items: sortItems(items),
      layout: deriveLayout(items, pagesCount),
      uiTheme,
      updatedAt: new Date().toISOString()
    };

    persistPayloadRef.current = payload;
    writeLocalDashboardDraft(payload, true);
    const currentGen = ++saveGenRef.current;
    saveDashboard(payload)
      .then((savedPayload) => {
        if (saveGenRef.current === currentGen) {
          writeLocalDashboardDraft(savedPayload, false);
        }
      })
      .catch((error) => console.error(error));
  }, [dashboardName, isLoading, items, locale, pageIcon, pageTitle, pagesCount, showWeather, uiTheme, wallpaper, weatherCity]);

  useEffect(() => {
    let cancelled = false;

    async function loadWeather() {
      if (!showWeather) {
        setWeather(null);
        return;
      }
      if (!weatherCity.trim()) {
        setWeather(null);
        return;
      }
      try {
        const geocodeResponse = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(weatherCity.trim())}&count=1&language=${getWeatherApiLanguage(locale)}&format=json`
        );
        const geocodeData = await geocodeResponse.json();
        const location = geocodeData?.results?.[0];
        if (!location || cancelled) {
          return;
        }
        const weatherResponse = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current=temperature_2m,weather_code&timezone=auto`
        );
        const weatherData = await weatherResponse.json();
        if (cancelled) {
          return;
        }
        const summary = weatherCodeToLabel(weatherData?.current?.weather_code, locale);
        setWeather({
          city: location.name,
          temperature: Math.round(weatherData?.current?.temperature_2m ?? 0),
          label: summary.label,
          icon: summary.icon
        });
      } catch (error) {
        if (!cancelled) {
          console.error(error);
        }
      }
    }

    loadWeather();
    const timer = window.setInterval(loadWeather, 10 * 60 * 1000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [locale, showWeather, weatherCity]);

  useEffect(() => {
    return () => {
      if (resizeSessionRef.current?.cleanup) {
        resizeSessionRef.current.cleanup();
      }
      if (itemGestureRef.current?.cleanup) {
        itemGestureRef.current.cleanup();
      }
      if (edgeSwitchRef.current?.timer) {
        window.clearTimeout(edgeSwitchRef.current.timer);
      }
      if (pageSwipeRef.current?.cleanup) {
        pageSwipeRef.current.cleanup();
      }
      if (folderGestureRef.current?.cleanup) {
        folderGestureRef.current.cleanup();
      }
    };
  }, []);

  function clearEdgeSwitch() {
    if (edgeSwitchRef.current?.timer) {
      window.clearTimeout(edgeSwitchRef.current.timer);
    }
    edgeSwitchRef.current = null;
  }

  function getPageElement(pageIndex) {
    return scrollRef.current?.querySelector(`[data-page-index="${pageIndex}"]`) || null;
  }

  function getPageIndexFromPoint(clientX, clientY) {
    const pageElement = document.elementFromPoint(clientX, clientY)?.closest('.page');
    const pageIndex = Number(pageElement?.dataset.pageIndex);
    return Number.isFinite(pageIndex) ? pageIndex : currentPage;
  }

  function applyCompactedItems(nextItems, preferredPage = currentPage) {
    const highestPage = nextItems.length ? Math.max(...nextItems.map((item) => Number(item.page || 0))) + 1 : 1;
    const compacted = compactPages(nextItems, Math.max(pagesCount, highestPage, preferredPage + 1));
    const nextPage = Math.max(0, Math.min(preferredPage, compacted.pagesCount - 1));
    setItems(compacted.items);
    setPagesCount(compacted.pagesCount);
    setCurrentPage(nextPage);
    window.requestAnimationFrame(() => {
      scrollToPage(nextPage, true, compacted.pagesCount);
    });
  }

  const openFolder = openFolderId ? items.find((item) => item.id === openFolderId && isFolder(item)) || null : null;

  function findAppRecord(appId, sourceItems = items) {
    for (const item of sourceItems) {
      if (item.type === 'app' && item.id === appId) {
        return { app: item, folderId: null };
      }
      if (isFolder(item)) {
        const nestedApp = item.items.find((entry) => entry.id === appId);
        if (nestedApp) {
          return { app: nestedApp, folderId: item.id };
        }
      }
    }
    return null;
  }

  function updateFolder(folderId, updater) {
    setItems((currentItems) =>
      currentItems.map((item) => {
        if (item.id !== folderId || !isFolder(item)) {
          return item;
        }
        return normalizeFolder(updater(normalizeFolder(item)));
      })
    );
  }

  function createFolderItem(seedItems = []) {
    return normalizeFolder({
      id: `folder-${Date.now()}`,
      type: 'folder',
      name: t('app.untitledFolder'),
      items: seedItems
    });
  }

  async function handleExportBackup() {
    const blob = await exportBackup();
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `home-dashboard-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
  }

  async function handleImportBackup(backupPayload) {
    return importBackup(backupPayload);
  }

  function createFolder() {
    const pageItems = items.filter((item) => (item.page || 0) === currentPage);
    const position = findOpenPosition(pageItems, { x: 1, y: 1, w: 1, h: 1 }, gridSpec.columns);
    const folder = { ...createFolderItem(), ...position, w: 1, h: 1, page: currentPage };
    setItems((currentItems) => [...currentItems, folder]);
    setOpenFolderId(folder.id);
    setOpenFolderPage(0);
  }

  function renameFolder(folderId, nextName) {
    updateFolder(folderId, (folder) => ({ ...folder, name: nextName }));
  }

  function addAppToFolder(folderId, appId) {
    const draggedApp = items.find((item) => item.id === appId && item.type === 'app');
    if (!draggedApp) {
      return;
    }
    setItems((currentItems) =>
      currentItems
        .filter((item) => item.id !== appId)
        .map((item) => {
          if (item.id !== folderId || !isFolder(item)) {
            return item;
          }
          return normalizeFolder({
            ...item,
            items: [...item.items, { ...draggedApp }]
          });
        })
    );
  }

  function reorderFolderItems(folderId, fromIndex, toIndex) {
    updateFolder(folderId, (folder) => {
      const nextItems = [...folder.items];
      const [moved] = nextItems.splice(fromIndex, 1);
      nextItems.splice(toIndex, 0, moved);
      return { ...folder, items: nextItems };
    });
  }

  function createFolderFromApps(sourceId, targetId) {
    const source = items.find((item) => item.id === sourceId && item.type === 'app');
    const target = items.find((item) => item.id === targetId && item.type === 'app');
    if (!source || !target) {
      return;
    }
    const folder = {
      ...createFolderItem([{ ...target }, { ...source }]),
      x: target.x,
      y: target.y,
      w: 1,
      h: 1,
      page: target.page || 0
    };
    setItems((currentItems) => [...currentItems.filter((item) => item.id !== sourceId && item.id !== targetId), folder]);
    setOpenFolderId(folder.id);
    setOpenFolderPage(0);
  }

  function extractAppFromFolder(folderId, appId) {
    const folder = items.find((item) => item.id === folderId && isFolder(item));
    const app = folder?.items?.find((entry) => entry.id === appId);
    if (!folder || !app) {
      return;
    }

    const remaining = folder.items.filter((entry) => entry.id !== appId);
    const targetDesktopPage = folder.page ?? currentPage;
    const rootWithoutFolder = items.filter((item) => item.id !== folderId);

    if (remaining.length === 0) {
      const pageItems = rootWithoutFolder.filter((item) => (item.page || 0) === targetDesktopPage);
      const extractedPosition = findOpenPosition(pageItems, { x: folder.x || 1, y: folder.y || 1, w: 1, h: 1 }, gridSpec.columns);
      const extracted = { ...app, ...extractedPosition, page: targetDesktopPage, w: 1, h: 1 };
      setItems([...rootWithoutFolder, extracted]);
      setOpenFolderId(null);
      return;
    }

    if (remaining.length === 1) {
      const survivor = { ...remaining[0], x: folder.x || 1, y: folder.y || 1, page: folder.page || targetDesktopPage, w: 1, h: 1 };
      const pageItems = rootWithoutFolder
        .filter((item) => (item.page || 0) === targetDesktopPage)
        .concat(survivor);
      const extractedPosition = findOpenPosition(pageItems, { x: folder.x || 1, y: folder.y || 1, w: 1, h: 1 }, gridSpec.columns);
      const extracted = { ...app, ...extractedPosition, page: targetDesktopPage, w: 1, h: 1 };
      setItems([...rootWithoutFolder, survivor, extracted]);
      setOpenFolderId(null);
      return;
    }

    const nextFolder = normalizeFolder({ ...folder, items: remaining });
    const pageItems = rootWithoutFolder
      .filter((item) => (item.page || 0) === targetDesktopPage)
      .concat(nextFolder);
    const extractedPosition = findOpenPosition(pageItems, { x: folder.x || 1, y: folder.y || 1, w: 1, h: 1 }, gridSpec.columns);
    const extracted = { ...app, ...extractedPosition, page: targetDesktopPage, w: 1, h: 1 };

    setItems(
      items.map((item) => {
        if (item.id === folderId && isFolder(item)) {
          return nextFolder;
        }
        return item;
      }).concat(extracted)
    );
  }

  function flattenSearchItems() {
    return items.flatMap((item) => (isFolder(item) ? item.items || [] : item));
  }

  function availableAppsForFolder(folderId) {
    return items.filter((item) => item.type === 'app' && item.id !== folderId);
  }

  function detectCombineTarget(clientX, clientY, draggedItem) {
    return null;
  }

  function openItem(item, event) {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      event?.preventDefault?.();
      return;
    }
    if (isFolder(item)) {
      setOpenFolderId(item.id);
      setOpenFolderPage(0);
      return;
    }
    if (isEditing && item.type === 'app') {
      setEditingAppId(item.id);
      setSettingsTab('app');
      setShowSettings(true);
      return;
    }
    if (item.type === 'app' && item.url && item.url !== '#') {
      window.open(item.url, '_blank', 'noopener,noreferrer');
      return;
    }
    scrollToPage(item.page || 0);
  }

  function scrollToPage(index, immediate = false, pageLimit = pagesCount) {
    const container = scrollRef.current;
    if (!container) {
      return;
    }
    const safeIndex = Math.max(0, Math.min(index, Math.max(0, pageLimit - 1)));
    const width = container.offsetWidth;
    container.scrollTo({ left: width * safeIndex, behavior: immediate ? 'auto' : 'smooth' });
    setCurrentPage(safeIndex);
  }

  function handleScroll() {
    const container = scrollRef.current;
    if (!container) {
      return;
    }
    const width = container.offsetWidth;
    const pageIndex = Math.round(container.scrollLeft / width);
    if (pageIndex !== currentPage) {
      setCurrentPage(pageIndex);
    }
  }

  function pageMetrics(pageElement) {
    const width = pageElement.clientWidth - gridSpec.padX * 2;
    const cellWidth = (width - horizontalGap * (gridSpec.columns - 1)) / gridSpec.columns;
    return { cellWidth };
  }

  function pointerToGrid(pageElement, clientX, clientY, rect) {
    const bounds = pageElement.getBoundingClientRect();
    const { cellWidth } = pageMetrics(pageElement);
    const offsetX = clientX - bounds.left - gridSpec.padX;
    const offsetY = clientY - bounds.top + pageElement.scrollTop - gridSpec.padTop;
    return {
      ...rect,
      x: Math.max(1, Math.min(Math.floor(offsetX / (cellWidth + horizontalGap)) + 1, gridSpec.columns - rect.w + 1)),
      y: Math.max(1, Math.floor(offsetY / (gridSpec.rowHeight + verticalGap)) + 1)
    };
  }

  function updateItemDragPreview(itemId, clientX, clientY, forcedPage = null) {
    const draggedItem = items.find((item) => item.id === itemId);
    if (!draggedItem) {
      return;
    }
    const targetPage = forcedPage ?? getPageIndexFromPoint(clientX, clientY);
    const pageElement = getPageElement(targetPage);
    if (!pageElement) {
      return;
    }
    const target = pointerToGrid(pageElement, clientX, clientY, {
      w: draggedItem.w || 1,
      h: draggedItem.h || 1
    });
    setDragTarget({ ...target, page: targetPage });
    setDragPreviewItems(buildPreviewItems(items, itemId, targetPage, target, gridSpec.columns));
  }

  function scheduleEdgePageSwitch(clientX) {
    const session = itemGestureRef.current;
    if (!session?.draggingStarted) {
      clearEdgeSwitch();
      return;
    }
    const edgeThreshold = windowWidth < 768 ? 42 : 68;
    const direction = clientX <= edgeThreshold ? -1 : clientX >= window.innerWidth - edgeThreshold ? 1 : 0;

    if (!direction) {
      clearEdgeSwitch();
      return;
    }

    const targetPage = session.page + direction;
    if (targetPage < 0) {
      clearEdgeSwitch();
      return;
    }
    if (edgeSwitchRef.current?.direction === direction) {
      return;
    }

    clearEdgeSwitch();
    edgeSwitchRef.current = {
      direction,
      timer: window.setTimeout(() => {
        const activeSession = itemGestureRef.current;
        if (!activeSession?.draggingStarted) {
          edgeSwitchRef.current = null;
          return;
        }
        const nextPage = Math.max(0, activeSession.page + direction);
        if (nextPage >= pagesCount) {
          setPagesCount((count) => Math.max(count, nextPage + 1));
        }
        activeSession.page = nextPage;
        setCurrentPage(nextPage);
        scrollToPage(nextPage, true, Math.max(pagesCount, nextPage + 1));
        edgeSwitchRef.current = null;
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => {
            updateItemDragPreview(activeSession.itemId, activeSession.lastX, activeSession.lastY, nextPage);
          });
        });
      }, windowWidth < 768 ? 280 : 220)
    };
  }

  function handleItemPointerDown(event, item) {
    if ((event.button ?? 0) !== 0 || resizingId) {
      return;
    }
    if (event.target.closest('.delete-button, .widget-shell__resize, .widget-shell__delete')) {
      return;
    }

    const pointerType = event.pointerType || 'mouse';
    const startX = event.clientX;
    const startY = event.clientY;
    const threshold = pointerType === 'touch' ? 10 : 6;
    const session = {
      itemId: item.id,
      itemType: item.type,
      page: item.page || 0,
      pointerId: event.pointerId,
      startX,
      startY,
      lastX: startX,
      lastY: startY,
      draggingStarted: false,
      longPressTriggered: false,
      initialEditing: isEditing
    };

    function cleanup() {
      if (session.longPressTimer) {
        window.clearTimeout(session.longPressTimer);
      }
      clearEdgeSwitch();
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    }

    function onPointerMove(moveEvent) {
      if (moveEvent.pointerId !== session.pointerId) {
        return;
      }
      session.lastX = moveEvent.clientX;
      session.lastY = moveEvent.clientY;
      const movedEnough = Math.hypot(moveEvent.clientX - startX, moveEvent.clientY - startY) >= threshold;

      if (!session.initialEditing) {
        if (movedEnough && session.longPressTimer) {
          window.clearTimeout(session.longPressTimer);
          session.longPressTimer = null;
        }
        return;
      }

      if (!session.draggingStarted) {
        if (!movedEnough) {
          return;
        }
        session.draggingStarted = true;
        if (typeof event.currentTarget.setPointerCapture === 'function') {
          try {
            event.currentTarget.setPointerCapture(event.pointerId);
          } catch {
            // Ignore pointer capture failures from browser gesture arbitration.
          }
        }
        suppressClickRef.current = true;
        setDraggedId(item.id);
      }

      if (moveEvent.cancelable) {
        moveEvent.preventDefault();
      }
      const draggedItem = items.find((entry) => entry.id === item.id);
      const nextCombineTarget = detectCombineTarget(moveEvent.clientX, moveEvent.clientY, draggedItem);
      setCombineTarget(nextCombineTarget);
      if (nextCombineTarget) {
        setDragPreviewItems(null);
        setDragTarget(null);
        scheduleEdgePageSwitch(moveEvent.clientX);
        return;
      }
      updateItemDragPreview(item.id, moveEvent.clientX, moveEvent.clientY, session.page);
      scheduleEdgePageSwitch(moveEvent.clientX);
    }

    function onPointerUp(upEvent) {
      if (upEvent.pointerId !== session.pointerId) {
        return;
      }
      cleanup();

      if (session.draggingStarted) {
        if (combineTarget?.targetId && session.itemType === 'app') {
          if (combineTarget.mode === 'folder') {
            addAppToFolder(combineTarget.targetId, session.itemId);
          } else if (combineTarget.mode === 'pair') {
            createFolderFromApps(session.itemId, combineTarget.targetId);
          }
        } else {
          const previewItems = dragPreviewRef.current;
          if (previewItems) {
            applyCompactedItems(previewItems, session.page);
          }
        }
        suppressClickRef.current = true;
      }

      if (session.longPressTriggered) {
        suppressClickRef.current = true;
      }

      setDraggedId(null);
      setDragPreviewItems(null);
      setDragTarget(null);
      setCombineTarget(null);
      itemGestureRef.current = null;
    }

    if (!isEditing) {
      session.longPressTimer = window.setTimeout(() => {
        session.longPressTriggered = true;
        suppressClickRef.current = true;
        setIsEditing(true);
      }, 460);
    }

    session.cleanup = cleanup;
    itemGestureRef.current = session;
    window.addEventListener('pointermove', onPointerMove, { passive: false });
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  }

  function handlePagePointerDown(event) {
    if ((event.button ?? 0) !== 0 || event.pointerType !== 'mouse') {
      return;
    }
    if (event.target.closest('.page-cell')) {
      return;
    }

    const container = scrollRef.current;
    if (!container) {
      return;
    }

    const session = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startScrollLeft: container.scrollLeft,
      moved: false
    };

    function cleanup() {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    }

    function onPointerMove(moveEvent) {
      if (moveEvent.pointerId !== session.pointerId) {
        return;
      }
      const deltaX = moveEvent.clientX - session.startX;
      if (Math.abs(deltaX) > 4) {
        session.moved = true;
      }
      if (moveEvent.cancelable) {
        moveEvent.preventDefault();
      }
      container.scrollLeft = session.startScrollLeft - deltaX;
    }

    function onPointerUp(upEvent) {
      if (upEvent.pointerId !== session.pointerId) {
        return;
      }
      cleanup();
      const width = container.offsetWidth || 1;
      const targetPage = Math.round(container.scrollLeft / width);
      scrollToPage(targetPage);
      pageSwipeRef.current = null;
    }

    session.cleanup = cleanup;
    pageSwipeRef.current = session;
    window.addEventListener('pointermove', onPointerMove, { passive: false });
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  }

  function handlePageClick(event) {
    if (!isEditing || draggedId || resizingId) {
      return;
    }
    if (event.target.closest('.page-cell')) {
      return;
    }
    setIsEditing(false);
  }

  function deleteItem(itemId) {
    const targetRecord = findAppRecord(itemId);

    if (targetRecord?.folderId) {
      const folder = items.find((item) => item.id === targetRecord.folderId && isFolder(item));
      const remaining = folder?.items.filter((entry) => entry.id !== itemId) || [];
      const rootWithoutFolder = items.filter((item) => item.id !== targetRecord.folderId);

      if (!folder) {
        return;
      }

      if (remaining.length === 0) {
        applyCompactedItems(rootWithoutFolder, currentPage);
        if (openFolderId === folder.id) {
          setOpenFolderId(null);
        }
      } else if (remaining.length === 1) {
        const survivor = {
          ...remaining[0],
          x: folder.x || 1,
          y: folder.y || 1,
          page: folder.page || 0,
          w: 1,
          h: 1
        };
        applyCompactedItems([...rootWithoutFolder, survivor], currentPage);
        if (openFolderId === folder.id) {
          setOpenFolderId(null);
        }
      } else {
        setItems(
          items.map((item) => {
            if (item.id === folder.id && isFolder(item)) {
              return normalizeFolder({ ...item, items: remaining });
            }
            return item;
          })
        );
      }
    } else {
      applyCompactedItems(items.filter((item) => item.id !== itemId), currentPage);
    }

    if (editingAppId === itemId) {
      setEditingAppId(null);
    }
  }

  function addApp(app, targetPage = currentPage, targetRect = null) {
    const pageItems = items.filter((item) => (item.page || 0) === targetPage);
    const desiredRect = targetRect || { x: 1, y: 1, w: 1, h: 1 };
    const position = findOpenPosition(pageItems, desiredRect, gridSpec.columns);
    setItems((currentItems) => [...currentItems, { ...app, ...position, page: targetPage }]);
  }

  function updateApp(nextApp) {
    setItems((currentItems) =>
      currentItems.map((item) => {
        if (item.id === nextApp.id) {
          return { ...item, ...nextApp };
        }
        if (isFolder(item) && item.items.some((entry) => entry.id === nextApp.id)) {
          return normalizeFolder({
            ...item,
            items: item.items.map((entry) => (entry.id === nextApp.id ? { ...entry, ...nextApp } : entry))
          });
        }
        return item;
      })
    );
    setEditingAppId(null);
    setShowSettings(false);
  }

  function createApp(app) {
    addApp(app);
    setShowSettings(false);
  }

  function handleExternalDragOver(event) {
    const hasExternalUrl = Array.from(event.dataTransfer?.types || []).some((type) => ['text/uri-list', 'text/plain', 'text/html'].includes(type));
    if (!hasExternalUrl) {
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }

  function handleExternalDrop(event, pageIndex) {
    const dropped = extractDroppedLink(event.dataTransfer);
    if (!dropped) {
      return;
    }
    event.preventDefault();
    const pageElement = event.currentTarget;
    const target = pointerToGrid(pageElement, event.clientX, event.clientY, { x: 1, y: 1, w: 1, h: 1 });
    addApp(
      {
        id: `app-${Date.now()}`,
        type: 'app',
        name: dropped.name,
        url: normalizeUrl(dropped.url),
        icon: faviconForUrl(dropped.url),
        color: '#ffffff',
        iconSource: 'favicon'
      },
      pageIndex,
      target
    );
  }

  async function removeWallpaperFromLibrary(entry) {
    const fileName = entry.url.split('/').pop();
    if (!fileName) {
      return;
    }
    await deleteWallpaper(fileName);
    setWallpaperLibrary((current) => current.filter((wallpaperEntry) => wallpaperEntry.id !== entry.id));
    if (wallpaper === entry.url) {
      setWallpaper('');
    }
  }

  async function removeIconFromLibrary(entry) {
    const fileName = entry.url.split('/').pop();
    if (!fileName) {
      return;
    }
    await deleteIcon(fileName);
    setIconLibrary((current) => current.filter((iconEntry) => iconEntry.id !== entry.id));
    setItems((currentItems) =>
      currentItems.map((item) =>
        item.type === 'app' && item.icon === entry.url
          ? {
              ...item,
              icon: '🚀',
              iconSource: 'custom',
              color: item.color === 'transparent' ? '#2274ff' : item.color
            }
          : item
      )
    );
  }

  async function removeWidgetFromLibrary(widget) {
    if (!widget?.sourceFile) {
      return;
    }
    await deleteWidgetFromGallery(widget.sourceFile);
    setWidgetLibrary((current) => current.filter((entry) => entry.sourceFile !== widget.sourceFile));
  }

  function addWidget(widget) {
    const instanceId = `w-${Date.now()}`;
    const pageItems = items.filter((item) => (item.page || 0) === currentPage);
    const position = findOpenPosition(pageItems, { x: 1, y: 1, w: widget.w || 2, h: widget.h || 2 }, gridSpec.columns);
    setItems((currentItems) => [
      ...currentItems,
      {
        ...widget,
        id: instanceId,
        type: 'widget',
        widgetState: widget.widgetState ?? null,
        ...position,
        page: currentPage
      }
    ]);
    setShowSettings(false);
  }

  function startResize(event, itemId) {
    event.preventDefault();
    event.stopPropagation();
    const item = items.find((entry) => entry.id === itemId);
    const pageElement = event.currentTarget.closest('.page');
    if (!item || !pageElement) {
      return;
    }
    setResizingId(itemId);
    const { cellWidth } = pageMetrics(pageElement);
    const isTouchResize = event.pointerType === 'touch' || windowWidth < 768;
    const previousPageTouchAction = pageElement.style.touchAction;
    pageElement.style.touchAction = 'none';
    const session = {
      itemId,
      page: item.page || 0,
      baseW: item.w || 1,
      baseH: item.h || 1,
      baseX: item.x || 1,
      baseY: item.y || 1,
      startX: event.clientX,
      startY: event.clientY,
      cellWidth,
      isTouchResize
    };

    function onPointerMove(moveEvent) {
      if (moveEvent.cancelable) {
        moveEvent.preventDefault();
      }
      const colStep = session.cellWidth + horizontalGap;
      const rowStep = gridSpec.rowHeight + verticalGap;
      const touchFactor = session.isTouchResize ? 0.38 : 0.5;
      const deltaX = moveEvent.clientX - session.startX;
      const deltaY = moveEvent.clientY - session.startY;
      const deltaCols = Math.trunc((deltaX + Math.sign(deltaX || 1) * colStep * touchFactor) / colStep);
      const deltaRows = Math.trunc((deltaY + Math.sign(deltaY || 1) * rowStep * touchFactor) / rowStep);
      const targetRect = {
        x: session.baseX,
        y: session.baseY,
        w: Math.max(1, Math.min(session.baseW + deltaCols, gridSpec.columns - session.baseX + 1)),
        h: Math.max(1, session.baseH + deltaRows)
      };
      setDragTarget({ ...targetRect, page: session.page, mode: 'resize' });
      setDragPreviewItems(buildPreviewItems(items, itemId, session.page, targetRect, gridSpec.columns));
    }

    function onPointerUp() {
      const previewItems = dragPreviewRef.current;
      if (previewItems) {
        setItems(previewItems);
      }
      pageElement.style.touchAction = previousPageTouchAction;
      setDragPreviewItems(null);
      setDragTarget(null);
      setResizingId(null);
      resizeSessionRef.current = null;
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    }

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    resizeSessionRef.current = {
      cleanup: () => {
        pageElement.style.touchAction = previousPageTouchAction;
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
      }
    };
  }

  const dashboardStyle = useMemo(
    () => ({
      backgroundImage: `linear-gradient(180deg, ${hexToRgba(uiTheme.topbar, 0.2)}, rgba(7,10,20,0.62)), url(${wallpaper})`,
      '--accent': uiTheme.accent,
      '--accent-soft': hexToRgba(uiTheme.accent, 0.2),
      '--topbar-bg': hexToRgba(uiTheme.topbar, 0.56),
      '--panel-bg': hexToRgba(uiTheme.panel, 0.82),
      '--panel-soft': hexToRgba(uiTheme.panel, 0.58),
      '--panel-border': hexToRgba(uiTheme.accent, 0.24),
      '--dot-active': uiTheme.accent,
      '--app-icon-radius': uiTheme.iconShape === 'round' ? '999px' : '1.5rem'
    }),
    [uiTheme, wallpaper]
  );

  const editingApp = editingAppId ? findAppRecord(editingAppId)?.app || null : null;

  if (isLoading) {
    return <div className="loading-screen">{t('app.loading')}</div>;
  }

  return (
    <div className="dashboard" style={dashboardStyle}>
      <div className="dashboard__noise" />

      <header className="topbar">
        <div className="topbar__left">
          <div className="topbar__brand">{dashboardName || t('app.brand')}</div>
          <button className="icon-button" onClick={() => setShowSearch(true)} type="button">
            <Search size={15} />
          </button>
        </div>

        <div className="topbar__center">
          {showWeather ? (
            <button
              className={`weather-chip ${isEditing ? 'weather-chip--editing' : ''}`}
              onClick={() => {
                setEditingAppId(null);
                setSettingsTab('appearance');
                setShowSettings(true);
              }}
              type="button"
            >
              <span className="weather-chip__glow" />
              <span className="weather-chip__icon">{weather?.icon || '✨'}</span>
              <span className="weather-chip__text">
                <strong>{weather?.city || weatherCity}</strong>
                <span>{weather ? `${weather.temperature}° · ${weather.label}` : t('app.weatherLoading')}</span>
              </span>
            </button>
          ) : null}
        </div>

        <div className="topbar__right">
          <button
            className="icon-button"
            onClick={() => {
              setEditingAppId(null);
              setSettingsTab('appearance');
              setShowSettings(true);
            }}
            type="button"
          >
            <Settings size={15} />
          </button>
          <div className="topbar__date">{time.toLocaleDateString(localeTag, { weekday: 'short', day: 'numeric', month: 'short' })}</div>
          <div className="topbar__time">{time.toLocaleTimeString(localeTag, { hour: '2-digit', minute: '2-digit' })}</div>
        </div>
      </header>

      <main className="pages" onScroll={handleScroll} ref={scrollRef}>
        {Array.from({ length: pagesCount }, (_, pageIndex) => {
          const pageItems = groupedItems[pageIndex] || [];
          const rows = pageRows(pageItems, gridSpec.minRows);
          return (
            <section
              className="page"
              data-page-index={pageIndex}
              key={`page-${pageIndex}`}
              onClick={handlePageClick}
              onDragOver={handleExternalDragOver}
              onDrop={(event) => handleExternalDrop(event, pageIndex)}
              onPointerDown={handlePagePointerDown}
              style={{
                paddingTop: `${gridSpec.padTop}px`,
                paddingLeft: `${gridSpec.padX}px`,
                paddingRight: `${gridSpec.padX}px`,
                paddingBottom: '96px'
              }}
            >
              <div
                className="page-canvas"
                style={{
                  minHeight: `${rows * gridSpec.rowHeight + (rows - 1) * verticalGap}px`
                }}
              >
                {dragTarget?.page === pageIndex ? (
                  <div
                    className="drop-preview"
                    style={{
                      left: `calc((100% - ${(gridSpec.columns - 1) * horizontalGap}px) / ${gridSpec.columns} * ${dragTarget.x - 1} + ${(dragTarget.x - 1) * horizontalGap}px)`,
                      top: `${(dragTarget.y - 1) * (gridSpec.rowHeight + verticalGap)}px`,
                      width: `calc((100% - ${(gridSpec.columns - 1) * horizontalGap}px) / ${gridSpec.columns} * ${dragTarget.w} + ${(dragTarget.w - 1) * horizontalGap}px)`,
                      height: `${dragTarget.h * gridSpec.rowHeight + (dragTarget.h - 1) * verticalGap}px`
                    }}
                  />
                ) : null}

                {pageItems.map((item, itemIndex) => (
                  <div
                    className={`page-cell ${isEditing ? 'page-cell--editing' : ''} ${draggedId === item.id ? 'page-cell--dragging' : ''} ${combineTarget?.targetId === item.id ? 'page-cell--combine-target' : ''}`}
                    data-item-id={item.id}
                    data-item-type={item.type}
                    key={item.id}
                    onPointerDown={(event) => handleItemPointerDown(event, item)}
                    style={{
                      left: `calc((100% - ${(gridSpec.columns - 1) * horizontalGap}px) / ${gridSpec.columns} * ${(item.x || 1) - 1} + ${((item.x || 1) - 1) * horizontalGap}px)`,
                      top: `${((item.y || 1) - 1) * (gridSpec.rowHeight + verticalGap)}px`,
                      width: `calc((100% - ${(gridSpec.columns - 1) * horizontalGap}px) / ${gridSpec.columns} * ${item.w || 1} + ${((item.w || 1) - 1) * horizontalGap}px)`,
                      height: `${(item.h || 1) * gridSpec.rowHeight + ((item.h || 1) - 1) * verticalGap}px`,
                      zIndex: draggedId === item.id ? 80 : itemIndex + 3,
                      animationDelay: `${itemIndex * 35}ms`
                    }}
                  >
                    {isEditing ? (
                      <button className="delete-button" onClick={() => deleteItem(item.id)} type="button">
                        <X size={14} />
                      </button>
                    ) : null}

                    {item.type === 'widget' ? (
                      <ShadowWidget isEditing={isEditing} item={item} onDelete={deleteItem} onResizeStart={startResize} />
                    ) : isFolder(item) ? (
                      <FolderTile item={item} onOpen={openItem} />
                    ) : (
                      <AppTile item={item} onOpen={openItem} />
                    )}
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </main>

      <div className="pagination">
        {Array.from({ length: pagesCount }, (_, index) => (
          <button
            className={`pagination__dot ${currentPage === index ? 'is-active' : ''}`}
            key={`dot-${index}`}
            onClick={() => scrollToPage(index)}
            aria-label={t('app.page', { page: index + 1 })}
            type="button"
          />
        ))}
        {isEditing ? (
          <button aria-label={t('app.addPage')} className="pagination__add" onClick={() => setPagesCount((count) => count + 1)} type="button">
            <Plus size={16} />
          </button>
        ) : null}
        {isEditing ? (
          <button aria-label={t('app.addFolder')} className="pagination__add" onClick={createFolder} type="button">
            <FolderPlus size={16} />
          </button>
        ) : null}
      </div>

      {showSearch ? (
        <SearchOverlay
          items={flattenSearchItems()}
          onClose={() => setShowSearch(false)}
          onOpenItem={openItem}
          onQueryChange={setSearchQuery}
          query={searchQuery}
          t={t}
        />
      ) : null}

      {openFolder ? (
        <FolderOverlay
          availableApps={availableAppsForFolder(openFolder.id)}
          folder={openFolder}
          folderPage={Math.min(openFolderPage, folderPageCount(openFolder) - 1)}
          isEditing={isEditing}
          onAddItem={(appId) => addAppToFolder(openFolder.id, appId)}
          onClose={() => setOpenFolderId(null)}
          onOpenItem={openItem}
          onPageChange={setOpenFolderPage}
          onRemoveItem={(appId) => extractAppFromFolder(openFolder.id, appId)}
          onRename={(nextName) => renameFolder(openFolder.id, nextName)}
          onReorder={(fromIndex, toIndex) => reorderFolderItems(openFolder.id, fromIndex, toIndex)}
          t={t}
        />
      ) : null}

      {showSettings ? (
        <SettingsModal
          currentPage={currentPage}
          dashboardName={dashboardName}
          editingApp={editingApp}
          initialTab={settingsTab}
          onAddApp={createApp}
          onImportWidget={(widget) => setWidgetLibrary((current) => [...current, widget])}
          onExportBackup={handleExportBackup}
          onImportBackup={handleImportBackup}
          onAddWidget={addWidget}
          onDeleteApp={(itemId) => deleteItem(itemId)}
          onDeleteWallpaper={removeWallpaperFromLibrary}
          onDeleteIcon={removeIconFromLibrary}
          onDeleteWidgetLibraryItem={removeWidgetFromLibrary}
          onClose={() => setShowSettings(false)}
          onUpdateApp={updateApp}
          pageIcon={pageIcon}
          pageTitle={pageTitle}
          locale={locale}
          setDashboardName={setDashboardName}
          setLocale={setLocale}
          setPageIcon={setPageIcon}
          setPageTitle={setPageTitle}
          setShowWeather={setShowWeather}
          setWeatherCity={setWeatherCity}
          setUiTheme={setUiTheme}
          setWallpaper={setWallpaper}
          showWeather={showWeather}
          t={t}
          uiTheme={uiTheme}
          wallpaper={wallpaper}
          weatherCity={weatherCity}
          iconLibrary={iconLibrary}
          wallpaperLibrary={wallpaperLibrary}
          widgetLibrary={widgetLibrary}
        />
      ) : null}
    </div>
  );
}

function isFolder(item) {
  return item?.type === 'folder';
}

function normalizeFolder(folder) {
  return {
    ...folder,
    type: 'folder',
    items: Array.isArray(folder.items) ? folder.items : []
  };
}

function folderPageCount(folder) {
  return Math.max(1, Math.ceil((folder?.items?.length || 0) / FOLDER_PAGE_SIZE));
}
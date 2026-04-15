import { useEffect, useMemo, useState } from 'react';
import { Globe, Image as ImageIcon, Library, Palette, Plus, Settings, Trash2, Upload, Wand2, X } from 'lucide-react';
import { importWidgetFile, saveWidgetToGallery, uploadAsset } from '../lib/api.js';

const WALLPAPER_PRESETS = [
  'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=2070&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=2070&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2070&auto=format&fit=crop'
];

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

export default function SettingsModal({
  currentPage,
  dashboardName,
  editingApp,
  initialTab,
  iconLibrary,
  onAddApp,
  onAddWidget,
  onDeleteApp,
  onDeleteIcon,
  onDeleteWallpaper,
  onDeleteWidgetLibraryItem,
  onExportBackup,
  onImportBackup,
  onImportWidget,
  onClose,
  onUpdateApp,
  locale,
  pageIcon,
  pageTitle,
  setLocale,
  setDashboardName,
  setPageIcon,
  setPageTitle,
  setShowWeather,
  setWeatherCity,
  setUiTheme,
  setWallpaper,
  showWeather,
  t,
  uiTheme,
  wallpaper,
  weatherCity,
  wallpaperLibrary,
  widgetLibrary
}) {
  const [tab, setTab] = useState(initialTab || 'appearance');
  const [appName, setAppName] = useState(editingApp?.name || '');
  const [appUrl, setAppUrl] = useState(editingApp?.url === '#' ? '' : editingApp?.url || '');
  const [appIcon, setAppIcon] = useState(editingApp?.icon || '🚀');
  const [appColor, setAppColor] = useState(editingApp?.color || '#2274ff');
  const [iconUploadName, setIconUploadName] = useState('');
  const [widgetJson, setWidgetJson] = useState('');
  const [widgetImportName, setWidgetImportName] = useState('');
  const [backupJson, setBackupJson] = useState('');
  const [backupFileName, setBackupFileName] = useState('');
  const [isUploadingWallpaper, setIsUploadingWallpaper] = useState(false);
  const [isUploadingIcon, setIsUploadingIcon] = useState(false);
  const [pageIconUploadName, setPageIconUploadName] = useState('');
  const [isUploadingPageIcon, setIsUploadingPageIcon] = useState(false);
  const [isImportingWidget, setIsImportingWidget] = useState(false);
  const [isImportingBackup, setIsImportingBackup] = useState(false);

  const pageLabel = useMemo(() => t('app.page', { page: currentPage + 1 }), [currentPage, t]);

  useEffect(() => {
    setTab(initialTab || 'appearance');
  }, [initialTab]);

  useEffect(() => {
    setAppName(editingApp?.name || '');
    setAppUrl(editingApp?.url === '#' ? '' : editingApp?.url || '');
    setAppIcon(editingApp?.icon || '🚀');
    setAppColor(editingApp?.color || '#2274ff');
    setIconUploadName('');
  }, [editingApp]);

  async function handleWallpaperUpload(event) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    setIsUploadingWallpaper(true);
    try {
      const result = await uploadAsset('wallpaper', file);
      setWallpaper(result.url);
    } finally {
      setIsUploadingWallpaper(false);
      event.target.value = '';
    }
  }

  async function handleIconUpload(event) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    setIsUploadingIcon(true);
    try {
      const result = await uploadAsset('icon', file);
      setAppIcon(result.url);
      setAppColor('transparent');
      setIconUploadName(file.name);
    } finally {
      setIsUploadingIcon(false);
      event.target.value = '';
    }
  }

  async function handlePageIconUpload(event) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    setIsUploadingPageIcon(true);
    try {
      const result = await uploadAsset('icon', file);
      setPageIcon(result.url);
      setPageIconUploadName(file.name);
    } finally {
      setIsUploadingPageIcon(false);
      event.target.value = '';
    }
  }

  function applyFavicon() {
    try {
      const favicon = faviconForUrl(appUrl);
      if (!favicon) {
        return;
      }
      setAppIcon(favicon);
      setAppColor('#ffffff');
      if (!appName.trim()) {
        setAppName(new URL(normalizeUrl(appUrl)).hostname);
      }
    } catch (_error) {
      window.alert(t('settings.invalidUrl'));
    }
  }

  function submitApp(event) {
    event.preventDefault();
    if (!appName.trim()) {
      return;
    }
    const payload = {
      id: editingApp?.id || `app-${Date.now()}`,
      type: 'app',
      name: appName.trim(),
      url: normalizeUrl(appUrl) || '#',
      icon: appIcon.trim() || '🚀',
      color: appColor,
      iconSource: appIcon.includes('google.com/s2/favicons') ? 'favicon' : appIcon.startsWith('/uploads/icons/') ? 'upload' : editingApp?.iconSource || 'custom'
    };
    if (editingApp) {
      onUpdateApp(payload);
    } else {
      onAddApp(payload);
    }
    setAppName('');
    setAppUrl('');
    setAppIcon('🚀');
    setIconUploadName('');
    setAppColor('#2274ff');
  }

  async function importWidget() {
    try {
      const sourceText = widgetJson.trim();
      if (!sourceText) {
        return;
      }
      const savedWidget = await saveWidgetToGallery({
        sourceText,
        fileName: sourceText.startsWith('export default') ? 'widget.tsx' : 'widget.json'
      });
      setWidgetJson('');
      onImportWidget(savedWidget);
      onAddWidget(savedWidget);
      setTab('library');
    } catch (_error) {
      window.alert(t('settings.invalidWidget'));
    }
  }

  async function handleWidgetFileImport(event) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    setIsImportingWidget(true);
    try {
      const savedWidget = await importWidgetFile(file);
      setWidgetImportName(file.name);
      onImportWidget(savedWidget);
      onAddWidget(savedWidget);
      setTab('library');
    } catch (_error) {
      window.alert(t('settings.invalidWidgetFile'));
    } finally {
      setIsImportingWidget(false);
      event.target.value = '';
    }
  }

  async function handleBackupFileImport(event) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    setIsImportingBackup(true);
    try {
      const text = await file.text();
      setBackupFileName(file.name);
      setBackupJson(text);
      await onImportBackup(JSON.parse(text));
      window.alert(t('settings.backupImported'));
      window.location.reload();
    } catch (_error) {
      window.alert(t('settings.invalidBackup'));
    } finally {
      setIsImportingBackup(false);
      event.target.value = '';
    }
  }

  async function submitBackupImport() {
    if (!backupJson.trim()) {
      window.alert(t('settings.backupEmpty'));
      return;
    }
    setIsImportingBackup(true);
    try {
      await onImportBackup(JSON.parse(backupJson));
      window.alert(t('settings.backupImported'));
      window.location.reload();
    } catch (_error) {
      window.alert(t('settings.invalidBackup'));
    } finally {
      setIsImportingBackup(false);
    }
  }

  return (
    <div className="overlay overlay--settings" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div className="settings-modal">
        <div className="settings-modal__header">
          <div>
            <div className="settings-modal__eyebrow">{t('settings.eyebrow')}</div>
            <h2>
              <Settings size={18} /> {t('settings.title')}
            </h2>
            <p>{t('settings.description', { pageLabel })}</p>
          </div>
          <button className="icon-button" onClick={onClose} type="button">
            <X size={18} />
          </button>
        </div>

        <div className="settings-modal__body">
          <div className="settings-modal__sidebar">
            <button className={tab === 'appearance' ? 'is-active' : ''} onClick={() => setTab('appearance')} type="button">
              <Palette size={16} /> {t('settings.appearance')}
            </button>
            <button className={tab === 'library' ? 'is-active' : ''} onClick={() => setTab('library')} type="button">
              <Library size={16} /> {t('settings.library')}
            </button>
            <button className={tab === 'app' ? 'is-active' : ''} onClick={() => setTab('app')} type="button">
              <Plus size={16} /> {t('settings.app')}
            </button>
            <button className={tab === 'widget' ? 'is-active' : ''} onClick={() => setTab('widget')} type="button">
              <Upload size={16} /> {t('settings.widget')}
            </button>
            <button className={tab === 'backup' ? 'is-active' : ''} onClick={() => setTab('backup')} type="button">
              <Library size={16} /> {t('settings.backup')}
            </button>
          </div>

          <div className="settings-modal__content">
            {tab === 'appearance' ? (
              <section className="settings-section">
                <label>{t('settings.wallpaper')}</label>
                <input value={wallpaper} onChange={(event) => setWallpaper(event.target.value)} />
                <div className="preset-grid">
                  {WALLPAPER_PRESETS.map((image) => (
                    <button
                      className="preset-card"
                      key={image}
                      onClick={() => setWallpaper(image)}
                      style={{ backgroundImage: `url(${image})` }}
                      type="button"
                    />
                  ))}
                  {wallpaperLibrary.map((entry) => (
                    <div className="preset-card-wrap" key={entry.id}>
                      <button
                        className="preset-card"
                        onClick={() => setWallpaper(entry.url)}
                        style={{ backgroundImage: `url(${entry.url})` }}
                        type="button"
                      />
                      <button className="preset-delete" onClick={() => onDeleteWallpaper(entry)} type="button">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                <label className="upload-row">
                  <span>
                    <ImageIcon size={16} /> {isUploadingWallpaper ? t('settings.uploading') : t('settings.uploadWallpaper')}
                  </span>
                  <input accept="image/*" onChange={handleWallpaperUpload} type="file" />
                </label>

                <label>{t('settings.accentColor')}</label>
                <div className="color-row">
                  <input type="color" value={uiTheme.accent} onChange={(event) => setUiTheme((theme) => ({ ...theme, accent: event.target.value }))} />
                  <input value={uiTheme.accent} onChange={(event) => setUiTheme((theme) => ({ ...theme, accent: event.target.value }))} />
                </div>

                <label>{t('settings.topbarColor')}</label>
                <div className="color-row">
                  <input type="color" value={uiTheme.topbar} onChange={(event) => setUiTheme((theme) => ({ ...theme, topbar: event.target.value }))} />
                  <input value={uiTheme.topbar} onChange={(event) => setUiTheme((theme) => ({ ...theme, topbar: event.target.value }))} />
                </div>

                <label>{t('settings.panelColor')}</label>
                <div className="color-row">
                  <input type="color" value={uiTheme.panel} onChange={(event) => setUiTheme((theme) => ({ ...theme, panel: event.target.value }))} />
                  <input value={uiTheme.panel} onChange={(event) => setUiTheme((theme) => ({ ...theme, panel: event.target.value }))} />
                </div>

                <label>{t('settings.weatherCity')}</label>
                <input placeholder="Paris" value={weatherCity} onChange={(event) => setWeatherCity(event.target.value)} />

                <label>{t('settings.showWeather')}</label>
                <div className="shape-picker">
                  <button className={showWeather ? 'is-active' : ''} onClick={() => setShowWeather(true)} type="button">
                    On
                  </button>
                  <button className={!showWeather ? 'is-active' : ''} onClick={() => setShowWeather(false)} type="button">
                    Off
                  </button>
                </div>

                <label>{t('settings.dashboardName')}</label>
                <input value={dashboardName} onChange={(event) => setDashboardName(event.target.value)} />

                <label>{t('settings.pageTitle')}</label>
                <input value={pageTitle} onChange={(event) => setPageTitle(event.target.value)} />

                <label>{t('settings.pageIcon')}</label>
                <input value={pageIcon} onChange={(event) => setPageIcon(event.target.value)} />
                <p className="settings-section__hint">{t('settings.pageIconHint')}</p>
                <div className="icon-library-grid">
                  <label className="icon-library-card icon-library-card--upload" htmlFor="page-icon-upload-input">
                    <span className="icon-library-card__thumb icon-library-card__thumb--upload">
                      <Upload size={24} />
                    </span>
                    <span className="icon-library-card__label">{isUploadingPageIcon ? t('settings.uploading') : pageIconUploadName || t('settings.uploadIcon')}</span>
                    <input id="page-icon-upload-input" accept="image/*" onChange={handlePageIconUpload} type="file" />
                  </label>
                  {iconLibrary.length
                    ? iconLibrary.map((entry) => (
                      <button
                        className={`icon-library-card ${pageIcon === entry.url ? 'is-active' : ''}`}
                        key={`page-icon-${entry.id}`}
                        onClick={() => setPageIcon(entry.url)}
                        type="button"
                      >
                        <span className="icon-library-card__thumb">
                          <img alt={entry.name} src={entry.url} />
                        </span>
                        <span className="icon-library-card__label">{entry.name}</span>
                      </button>
                    ))
                    : null}
                </div>

                <label>{t('settings.language')}</label>
                <div className="shape-picker">
                  <button className={locale === 'en' ? 'is-active' : ''} onClick={() => setLocale('en')} type="button">
                    {t('settings.languageEnglish')}
                  </button>
                  <button className={locale === 'fr' ? 'is-active' : ''} onClick={() => setLocale('fr')} type="button">
                    {t('settings.languageFrench')}
                  </button>
                </div>

                <label>{t('settings.horizontalSpacing')}</label>
                <div className="range-row">
                  <input
                    max="64"
                    min="0"
                    onChange={(event) => setUiTheme((theme) => ({ ...theme, gridGapX: Number(event.target.value) }))}
                    type="range"
                    value={uiTheme.gridGapX ?? 0}
                  />
                  <span>{uiTheme.gridGapX ?? 0}px</span>
                </div>

                <label>{t('settings.verticalSpacing')}</label>
                <div className="range-row">
                  <input
                    max="64"
                    min="0"
                    onChange={(event) => setUiTheme((theme) => ({ ...theme, gridGapY: Number(event.target.value) }))}
                    type="range"
                    value={uiTheme.gridGapY ?? 0}
                  />
                  <span>{uiTheme.gridGapY ?? 0}px</span>
                </div>

                <label>{t('settings.iconShape')}</label>
                <div className="shape-picker">
                  <button
                    className={uiTheme.iconShape === 'rounded-square' ? 'is-active' : ''}
                    onClick={() => setUiTheme((theme) => ({ ...theme, iconShape: 'rounded-square' }))}
                    type="button"
                  >
                    {t('settings.iconRounded')}
                  </button>
                  <button
                    className={uiTheme.iconShape === 'round' ? 'is-active' : ''}
                    onClick={() => setUiTheme((theme) => ({ ...theme, iconShape: 'round' }))}
                    type="button"
                  >
                    {t('settings.iconRound')}
                  </button>
                </div>
              </section>
            ) : null}

            {tab === 'library' ? (
              <section className="settings-section">
                <label>{t('settings.widgetsInGallery')}</label>
                <div className="library-grid">
                  {widgetLibrary.map((widget) => (
                    <div className="library-card-wrap" key={`${widget.id}-${widget.sourceFile || 'default'}`}>
                      <button className="library-card" onClick={() => onAddWidget(widget)} type="button">
                        <div className="library-card__icon">
                          <Library size={18} />
                        </div>
                        <strong>{widget.name}</strong>
                        <span>{widget.sourceFile}</span>
                      </button>
                      {widget.sourceFile ? (
                        <button className="library-delete" onClick={() => onDeleteWidgetLibraryItem(widget)} type="button">
                          <Trash2 size={14} />
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {tab === 'app' ? (
              <form className="settings-section" onSubmit={submitApp}>
                <label>{t('settings.appName')}</label>
                <input placeholder="Home Assistant" value={appName} onChange={(event) => setAppName(event.target.value)} />
                <label>{t('settings.appUrl')}</label>
                <input placeholder="https://..." value={appUrl} onChange={(event) => setAppUrl(event.target.value)} />
                <button className="secondary-button" onClick={applyFavicon} type="button">
                  <Globe size={16} /> {t('settings.useFavicon')}
                </button>
                <div className="dual-grid">
                  <div>
                    <label>{t('settings.appIcon')}</label>
                    <input value={appIcon} onChange={(event) => setAppIcon(event.target.value)} />
                  </div>
                  <div>
                    <label>{t('settings.backgroundColor')}</label>
                    <div className="color-row">
                      <input type="color" value={appColor === 'transparent' ? '#ffffff' : appColor} onChange={(event) => setAppColor(event.target.value)} />
                      <input value={appColor} onChange={(event) => setAppColor(event.target.value)} />
                    </div>
                    <button className={`secondary-button ${appColor === 'transparent' ? 'is-active' : ''}`} onClick={() => setAppColor('transparent')} type="button">
                      {t('settings.transparentBackground')}
                    </button>
                  </div>
                </div>
                <label className="upload-row">
                  <span>
                    <Upload size={16} /> {isUploadingIcon ? t('settings.uploading') : iconUploadName || t('settings.uploadIcon')}
                  </span>
                  <input accept="image/*" onChange={handleIconUpload} type="file" />
                </label>
                {iconLibrary.length ? (
                  <>
                    <label>{t('settings.uploadedIcons')}</label>
                    <div className="icon-library-grid">
                      {iconLibrary.map((entry) => (
                        <div className="icon-library-card-wrap" key={entry.id}>
                          <button
                            className={`icon-library-card ${appIcon === entry.url ? 'is-active' : ''}`}
                            onClick={() => {
                              setAppIcon(entry.url);
                              setAppColor('transparent');
                            }}
                            type="button"
                          >
                            <span className="icon-library-card__thumb">
                              <img alt={entry.name} src={entry.url} />
                            </span>
                            <span className="icon-library-card__label">{entry.name}</span>
                          </button>
                          <button
                            className="icon-library-delete"
                            onClick={async () => {
                              await onDeleteIcon(entry);
                              if (appIcon === entry.url) {
                                setAppIcon('🚀');
                                setAppColor('#2274ff');
                              }
                            }}
                            type="button"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </>
                ) : null}
                <button className="primary-button" type="submit">
                  <Plus size={16} /> {editingApp ? t('settings.saveChanges') : t('settings.addApp')}
                </button>
                {editingApp ? (
                  <button className="danger-button" onClick={() => onDeleteApp(editingApp.id)} type="button">
                    {t('settings.deleteApp')}
                  </button>
                ) : null}
              </form>
            ) : null}

            {tab === 'widget' ? (
              <section className="settings-section">
                <label>{t('settings.importWidgetFile')}</label>
                <label className="upload-row">
                  <span>
                    <Upload size={16} /> {isImportingWidget ? t('settings.importInProgress') : widgetImportName || t('settings.chooseWidgetFile')}
                  </span>
                  <input accept=".tsx,.ts,.js,.json,application/json,text/plain" onChange={handleWidgetFileImport} type="file" />
                </label>
                <label>{t('settings.orPasteWidget')}</label>
                <textarea
                  placeholder={locale === 'fr' ? 'export default {\n  "name": "Meteo",\n  "html": "...",\n  "css": "...",\n  "js": "..."\n};' : 'export default {\n  "name": "Weather",\n  "html": "...",\n  "css": "...",\n  "js": "..."\n};'}
                  value={widgetJson}
                  onChange={(event) => setWidgetJson(event.target.value)}
                />
                <button className="primary-button" onClick={importWidget} type="button">
                  <Wand2 size={16} /> {t('settings.addWidget')}
                </button>
              </section>
            ) : null}

            {tab === 'backup' ? (
              <section className="settings-section">
                <label>{t('settings.backupTitle')}</label>
                <p className="settings-section__hint">{t('settings.backupDescription')}</p>
                <button className="primary-button" onClick={onExportBackup} type="button">
                  <Upload size={16} /> {t('settings.exportBackup')}
                </button>
                <label className="upload-row">
                  <span>
                    <Upload size={16} /> {isImportingBackup ? t('settings.importInProgress') : backupFileName || t('settings.chooseBackupFile')}
                  </span>
                  <input accept="application/json,.json,text/plain" onChange={handleBackupFileImport} type="file" />
                </label>
                <label>{t('settings.orPasteBackup')}</label>
                <textarea value={backupJson} onChange={(event) => setBackupJson(event.target.value)} />
                <button className="primary-button" onClick={submitBackupImport} type="button">
                  <Wand2 size={16} /> {t('settings.importBackup')}
                </button>
                <p className="settings-section__hint">{t('settings.backupHint')}</p>
              </section>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
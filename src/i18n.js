export const DEFAULT_LOCALE = 'en';

const MESSAGES = {
  en: {
    app: {
      loading: 'Loading dashboard...',
      brand: 'Home',
      weatherLoading: 'Loading weather...',
      searchPlaceholder: 'Search apps or widgets',
      page: 'Page {page}',
      addPage: 'Add page',
      addFolder: 'Add folder',
      untitledFolder: 'New folder'
    },
    weather: {
      clear: 'Clear',
      partlyCloudy: 'Partly cloudy',
      cloudy: 'Cloudy',
      fog: 'Fog',
      rain: 'Rain',
      snow: 'Snow',
      storm: 'Storm',
      fallback: 'Weather'
    },
    search: {
      noResults: 'No results.'
    },
    folder: {
      empty: 'Folder is empty',
      desktopApps: 'Apps on desktop',
      noDesktopApps: 'No app available on desktop'
    },
    settings: {
      eyebrow: 'Home dashboard',
      title: 'Settings',
      description: 'Add items on {pageLabel}, keep widgets in the gallery root, and persist everything to JSON on the server.',
      appearance: 'Appearance',
      library: 'Library',
      app: 'App',
      widget: 'Import widget',
      backup: 'Backup',
      wallpaper: 'Wallpaper',
      uploadWallpaper: 'Upload wallpaper',
      uploading: 'Uploading...',
      accentColor: 'Accent color',
      topbarColor: 'Top bar color',
      panelColor: 'Panel color',
      weatherCity: 'Weather city',
      showWeather: 'Show weather chip',
      dashboardName: 'Dashboard name',
      pageTitle: 'Page title',
      pageIcon: 'Page icon or favicon',
      pageIconHint: 'Pick an uploaded icon below or paste an image URL, favicon URL, or emoji.',
      language: 'Language',
      languageEnglish: 'English',
      languageFrench: 'French',
      horizontalSpacing: 'Horizontal spacing',
      verticalSpacing: 'Vertical spacing',
      iconShape: 'Icon shape',
      iconRounded: 'iOS rounded square',
      iconRound: 'Round',
      widgetsInGallery: 'Widgets available in gallery',
      appName: 'Name',
      appUrl: 'URL',
      useFavicon: 'Use favicon from URL',
      appIcon: 'Icon, emoji or favicon',
      backgroundColor: 'Background color',
      transparentBackground: 'Transparent background',
      uploadIcon: 'Upload icon',
      uploadedIcons: 'Uploaded icons',
      saveChanges: 'Save changes',
      addApp: 'Add app',
      deleteApp: 'Delete this app',
      importWidgetFile: 'Import a .tsx or .json widget file',
      chooseWidgetFile: 'Choose a widget file',
      importInProgress: 'Importing...',
      orPasteWidget: 'Or paste widget source',
      addWidget: 'Add this widget',
      backupTitle: 'Full backup',
      backupDescription: 'Export or import the full dashboard state: apps, folders, widgets, wallpapers, uploaded icons, and settings.',
      exportBackup: 'Export full backup',
      importBackupFile: 'Import a backup file',
      chooseBackupFile: 'Choose a backup file',
      orPasteBackup: 'Or paste backup JSON',
      importBackup: 'Import backup',
      backupHint: 'A daily server snapshot is also generated automatically whenever the dashboard is saved.',
      invalidUrl: 'Invalid URL for favicon retrieval.',
      invalidWidget: 'Invalid widget source. Use JSON or a valid export default module.',
      invalidWidgetFile: 'Widget import failed. The file must export a valid widget object.',
      invalidBackup: 'Backup import failed. Check that the backup file is valid.',
      backupImported: 'Backup imported successfully. The dashboard will reload.',
      backupEmpty: 'Paste backup JSON or choose a backup file first.'
    }
  },
  fr: {
    app: {
      loading: 'Chargement du dashboard...',
      brand: 'Maison',
      weatherLoading: 'Chargement meteo...',
      searchPlaceholder: 'Rechercher une app ou un widget',
      page: 'Page {page}',
      addPage: 'Ajouter une page',
      addFolder: 'Ajouter un dossier',
      untitledFolder: 'Nouveau dossier'
    },
    weather: {
      clear: 'Clair',
      partlyCloudy: 'Peu nuageux',
      cloudy: 'Nuageux',
      fog: 'Brouillard',
      rain: 'Pluie',
      snow: 'Neige',
      storm: 'Orage',
      fallback: 'Meteo'
    },
    search: {
      noResults: 'Aucun resultat.'
    },
    folder: {
      empty: 'Dossier vide',
      desktopApps: 'Apps sur le bureau',
      noDesktopApps: 'Aucune app disponible sur le bureau'
    },
    settings: {
      eyebrow: 'Dashboard maison',
      title: 'Reglages',
      description: 'Ajouts sur {pageLabel}, galerie de widgets a la racine et persistance JSON cote serveur.',
      appearance: 'Apparence',
      library: 'Bibliotheque',
      app: 'App',
      widget: 'Import widget',
      backup: 'Backup',
      wallpaper: 'Fond d ecran',
      uploadWallpaper: 'Uploader un fond',
      uploading: 'Envoi...',
      accentColor: 'Couleur accent',
      topbarColor: 'Couleur barre fenetre',
      panelColor: 'Couleur panneaux',
      weatherCity: 'Ville pour la meteo',
      showWeather: 'Afficher la meteo',
      dashboardName: 'Nom du dashboard',
      pageTitle: 'Titre de la page',
      pageIcon: 'Icone ou favicon de la page',
      pageIconHint: 'Choisis une icone uploadée ci-dessous ou colle une URL d image, favicon, ou emoji.',
      language: 'Langue',
      languageEnglish: 'Anglais',
      languageFrench: 'Francais',
      horizontalSpacing: 'Espacement horizontal',
      verticalSpacing: 'Espacement vertical',
      iconShape: 'Forme des icones',
      iconRounded: 'Carre arrondi iOS',
      iconRound: 'Rond',
      widgetsInGallery: 'Widgets disponibles dans gallery',
      appName: 'Nom',
      appUrl: 'URL',
      useFavicon: 'Utiliser le favicon de l URL',
      appIcon: 'Icone, emoji ou favicon',
      backgroundColor: 'Couleur de fond',
      transparentBackground: 'Fond transparent',
      uploadIcon: 'Uploader une icone',
      uploadedIcons: 'Icones uploadees',
      saveChanges: 'Enregistrer les modifications',
      addApp: 'Ajouter l application',
      deleteApp: 'Supprimer cette application',
      importWidgetFile: 'Importer un fichier widget .tsx ou .json',
      chooseWidgetFile: 'Choisir un fichier widget',
      importInProgress: 'Import...',
      orPasteWidget: 'Ou coller la source du widget',
      addWidget: 'Ajouter ce widget',
      backupTitle: 'Backup complet',
      backupDescription: 'Exporter ou importer l etat complet du dashboard: apps, dossiers, widgets, wallpapers, icones uploadees et reglages.',
      exportBackup: 'Exporter le backup complet',
      importBackupFile: 'Importer un fichier de backup',
      chooseBackupFile: 'Choisir un fichier de backup',
      orPasteBackup: 'Ou coller le JSON de backup',
      importBackup: 'Importer le backup',
      backupHint: 'Un snapshot serveur quotidien est aussi genere automatiquement a chaque sauvegarde du dashboard.',
      invalidUrl: 'URL invalide pour recuperer le favicon.',
      invalidWidget: 'Source widget invalide. Utilise du JSON ou un fichier/module export default.',
      invalidWidgetFile: 'Import widget impossible. Le fichier doit exporter un objet widget valide.',
      invalidBackup: 'Import du backup impossible. Verifie que le fichier est valide.',
      backupImported: 'Backup importe avec succes. Le dashboard va se recharger.',
      backupEmpty: 'Colle le JSON du backup ou choisis d abord un fichier de backup.'
    }
  }
};

export function normalizeLocale(value) {
  return value === 'fr' ? 'fr' : 'en';
}

export function getLocaleTag(locale) {
  return normalizeLocale(locale) === 'fr' ? 'fr-FR' : 'en-US';
}

export function getWeatherApiLanguage(locale) {
  return normalizeLocale(locale) === 'fr' ? 'fr' : 'en';
}

export function createTranslator(locale) {
  const currentLocale = normalizeLocale(locale);
  const catalog = MESSAGES[currentLocale] || MESSAGES.en;
  return function translate(key, variables = {}) {
    const template = key.split('.').reduce((value, segment) => value?.[segment], catalog);
    if (typeof template !== 'string') {
      return key;
    }
    return template.replace(/\{(\w+)\}/g, (_, token) => String(variables[token] ?? ''));
  };
}

export function weatherCodeToLabel(code, locale) {
  const t = createTranslator(locale);
  if ([0].includes(code)) return { label: t('weather.clear'), icon: '☀️' };
  if ([1, 2].includes(code)) return { label: t('weather.partlyCloudy'), icon: '🌤️' };
  if ([3].includes(code)) return { label: t('weather.cloudy'), icon: '☁️' };
  if ([45, 48].includes(code)) return { label: t('weather.fog'), icon: '🌫️' };
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return { label: t('weather.rain'), icon: '🌧️' };
  if ([56, 57, 66, 67, 71, 73, 75, 77, 85, 86].includes(code)) return { label: t('weather.snow'), icon: '🌨️' };
  if ([95, 96, 99].includes(code)) return { label: t('weather.storm'), icon: '⛈️' };
  return { label: t('weather.fallback'), icon: '✨' };
}
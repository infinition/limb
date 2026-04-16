import fs from 'node:fs/promises';
import path from 'node:path';

const rootDir = path.resolve(process.cwd());
const dataFile = path.join(rootDir, 'data', 'dashboard.json');
const galleryDir = path.join(rootDir, 'gallery');
const iconsDir = path.join(rootDir, 'public', 'uploads', 'icons');
const wallpapersDir = path.join(rootDir, 'public', 'uploads', 'wallpapers');
const backupsDir = path.join(rootDir, 'backups');
const widgetSourceExtensions = new Set(['.json', '.tsx', '.ts', '.js']);
const MAX_BACKUP_FILES = 10;
let dashboardQueue = Promise.resolve();

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

async function writeJson(filePath, data) {
  const tempFile = `${filePath}.${process.pid}.tmp`;
  await fs.writeFile(tempFile, JSON.stringify(data, null, 2), 'utf8');
  await fs.rename(tempFile, filePath);
}

async function ensureDirectory(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

function sanitizeFileName(fileName, fallback) {
  const safeName = path.basename(fileName || fallback || 'file.bin').replace(/[^a-zA-Z0-9._-]/g, '-');
  return safeName || fallback || 'file.bin';
}

function getMimeType(fileName) {
  const extension = path.extname(fileName).toLowerCase();
  if (extension === '.png') return 'image/png';
  if (extension === '.jpg' || extension === '.jpeg') return 'image/jpeg';
  if (extension === '.webp') return 'image/webp';
  if (extension === '.gif') return 'image/gif';
  if (extension === '.svg') return 'image/svg+xml';
  if (extension === '.json') return 'application/json';
  if (extension === '.tsx' || extension === '.ts' || extension === '.js') return 'text/plain';
  return 'application/octet-stream';
}

async function readDirectoryFilesAsBase64(dirPath) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const files = entries.filter((entry) => entry.isFile());
  return Promise.all(
    files.map(async (entry) => {
      const buffer = await fs.readFile(path.join(dirPath, entry.name));
      return {
        fileName: entry.name,
        mimeType: getMimeType(entry.name),
        base64: buffer.toString('base64')
      };
    })
  );
}

async function readGallerySources() {
  const entries = await fs.readdir(galleryDir, { withFileTypes: true });
  const files = entries.filter((entry) => entry.isFile() && widgetSourceExtensions.has(path.extname(entry.name).toLowerCase()));
  return Promise.all(
    files.map(async (entry) => ({
      fileName: entry.name,
      sourceText: await fs.readFile(path.join(galleryDir, entry.name), 'utf8')
    }))
  );
}

async function clearDirectory(dirPath) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  await Promise.all(entries.filter((entry) => entry.isFile()).map((entry) => fs.unlink(path.join(dirPath, entry.name))));
}

async function restoreFiles(dirPath, files) {
  await ensureDirectory(dirPath);
  await clearDirectory(dirPath);
  await Promise.all(
    (files || []).map((entry, index) => {
      const fileName = sanitizeFileName(entry.fileName, `asset-${index}.bin`);
      return fs.writeFile(path.join(dirPath, fileName), Buffer.from(entry.base64 || '', 'base64'));
    })
  );
}

async function restoreGallerySources(files) {
  await ensureDirectory(galleryDir);
  await clearDirectory(galleryDir);
  await Promise.all(
    (files || []).map((entry, index) => {
      const fileName = sanitizeFileName(entry.fileName, `widget-${index}.tsx`);
      return fs.writeFile(path.join(galleryDir, fileName), entry.sourceText || '', 'utf8');
    })
  );
}

async function pruneBackupRetention() {
  const entries = await fs.readdir(backupsDir, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && /^home-dashboard-.*\.json$/i.test(entry.name))
    .map((entry) => entry.name)
    .sort((left, right) => right.localeCompare(left));

  const staleFiles = files.slice(MAX_BACKUP_FILES);
  await Promise.all(staleFiles.map((fileName) => fs.unlink(path.join(backupsDir, fileName))));
}

function evaluateWidgetModule(rawSource) {
  const trimmed = rawSource.trim();
  if (!trimmed) {
    throw new Error('Source widget vide.');
  }
  const expression = trimmed.startsWith('export default')
    ? trimmed.replace(/^\s*export\s+default\s+/, '').replace(/;\s*$/, '')
    : trimmed;
  return Function(`"use strict"; return (${expression});`)();
}

function normalizeWidgetShape(widget) {
  if (!widget || typeof widget !== 'object' || Array.isArray(widget)) {
    throw new Error('Format widget invalide.');
  }
  if (!widget.name || !widget.html || !widget.css || !widget.js) {
    throw new Error('Widget incomplet.');
  }

  const width = Number.isFinite(Number(widget.w)) ? Math.max(1, Number(widget.w)) : 2;
  const height = Number.isFinite(Number(widget.h)) ? Math.max(1, Number(widget.h)) : 2;

  return {
    ...widget,
    id: widget.id || `widget-${Date.now()}`,
    type: 'widget',
    w: width,
    h: height
  };
}

export function parseWidgetSource(sourceText, sourceFile = 'widget.tsx') {
  const extension = path.extname(sourceFile || '').toLowerCase() || '.tsx';
  if (!widgetSourceExtensions.has(extension)) {
    throw new Error('Extension widget non supportee.');
  }

  const widget = extension === '.json' ? JSON.parse(sourceText) : evaluateWidgetModule(sourceText);
  return normalizeWidgetShape(widget);
}

function serializeWidgetModule(widget) {
  return `export default ${JSON.stringify(normalizeWidgetShape(widget), null, 2)};\n`;
}

function enqueueDashboard(operation) {
  const nextOperation = dashboardQueue.then(operation, operation);
  dashboardQueue = nextOperation.catch(() => undefined);
  return nextOperation;
}

export async function readDashboard() {
  await dashboardQueue;
  return readJson(dataFile);
}

export async function writeDashboard(data) {
  return enqueueDashboard(() => writeJson(dataFile, data));
}

export async function buildBackupBundle(dashboardOverride = null) {
  const dashboard = dashboardOverride || await readDashboard();
  const [gallery, icons, wallpapers] = await Promise.all([
    readGallerySources(),
    readDirectoryFilesAsBase64(iconsDir),
    readDirectoryFilesAsBase64(wallpapersDir)
  ]);
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    dashboard,
    gallery,
    icons,
    wallpapers
  };
}

export async function createDailyBackupSnapshot(dashboardOverride = null) {
  const stamp = new Date().toISOString().replace(/[:]/g, '-').replace(/\..+$/, '');
  const filePath = path.join(backupsDir, `home-dashboard-${stamp}.json`);
  await ensureDirectory(backupsDir);
  const bundle = await buildBackupBundle(dashboardOverride);
  await writeJson(filePath, bundle);
  await pruneBackupRetention();
  return filePath;
}

export async function importBackupBundle(bundle) {
  if (!bundle || typeof bundle !== 'object' || !bundle.dashboard) {
    throw new Error('Invalid backup bundle.');
  }

  return enqueueDashboard(async () => {
    await Promise.all([
      restoreGallerySources(bundle.gallery),
      restoreFiles(iconsDir, bundle.icons),
      restoreFiles(wallpapersDir, bundle.wallpapers)
    ]);
    await writeJson(dataFile, bundle.dashboard);
    await createDailyBackupSnapshot(bundle.dashboard);
    return bundle.dashboard;
  });
}

export async function readGallery() {
  const entries = await fs.readdir(galleryDir, { withFileTypes: true });
  const files = entries.filter((entry) => entry.isFile() && widgetSourceExtensions.has(path.extname(entry.name).toLowerCase()));
  const widgets = await Promise.all(
    files.map(async (entry) => {
      const source = await fs.readFile(path.join(galleryDir, entry.name), 'utf8');
      const widget = parseWidgetSource(source, entry.name);
      return {
        ...widget,
        sourceFile: entry.name,
        isCustom: true
      };
    })
  );
  return widgets.sort((left, right) => left.name.localeCompare(right.name, 'fr'));
}

export async function readWallpapers() {
  const entries = await fs.readdir(wallpapersDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => ({
      id: entry.name,
      name: entry.name,
      url: `/uploads/wallpapers/${entry.name}`,
      isCustom: true
    }))
    .sort((left, right) => left.name.localeCompare(right.name, 'fr'));
}

export async function readIcons() {
  const entries = await fs.readdir(iconsDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => ({
      id: entry.name,
      name: entry.name,
      url: `/uploads/icons/${entry.name}`,
      isCustom: true
    }))
    .sort((left, right) => left.name.localeCompare(right.name, 'fr'));
}

export async function writeGalleryWidget(widget) {
  const slug = (widget.name || 'widget')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const normalized = normalizeWidgetShape(widget);
  const fileName = `${slug || 'widget'}-${Date.now()}.tsx`;
  await fs.writeFile(path.join(galleryDir, fileName), serializeWidgetModule(normalized), 'utf8');
  return { ...normalized, sourceFile: fileName, isCustom: true };
}

export async function deleteGalleryWidget(sourceFile) {
  if (!sourceFile || sourceFile.includes('..')) {
    throw new Error('Fichier widget invalide.');
  }
  await fs.unlink(path.join(galleryDir, sourceFile));
}

export async function deleteWallpaperAsset(fileName) {
  if (!fileName || fileName.includes('..')) {
    throw new Error('Wallpaper invalide.');
  }
  await fs.unlink(path.join(wallpapersDir, fileName));
}

export async function deleteIconAsset(fileName) {
  if (!fileName || fileName.includes('..')) {
    throw new Error('Icone invalide.');
  }
  await fs.unlink(path.join(iconsDir, fileName));
}

export async function saveWidgetState(itemId, state) {
  return enqueueDashboard(async () => {
    const dashboard = await readJson(dataFile);
    const nextItems = dashboard.items.map((item) =>
      item.id === itemId ? { ...item, widgetState: state } : item
    );
    const nextDashboard = {
      ...dashboard,
      items: nextItems,
      updatedAt: new Date().toISOString()
    };
    await writeJson(dataFile, nextDashboard);
    return nextDashboard;
  });
}

export async function ensureDataFile() {
  await Promise.all([
    ensureDirectory(path.dirname(dataFile)),
    ensureDirectory(galleryDir),
    ensureDirectory(iconsDir),
    ensureDirectory(wallpapersDir),
    ensureDirectory(backupsDir)
  ]);
  try {
    await fs.access(dataFile);
  } catch {
    await writeJson(dataFile, { pages: [], settings: {} });
  }
}
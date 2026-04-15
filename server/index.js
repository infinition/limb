import cors from 'cors';
import express from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import {
  buildBackupBundle,
  createDailyBackupSnapshot,
  deleteIconAsset,
  deleteGalleryWidget,
  deleteWallpaperAsset,
  ensureDataFile,
  importBackupBundle,
  parseWidgetSource,
  readDashboard,
  readGallery,
  readIcons,
  readWallpapers,
  saveWidgetState,
  writeDashboard,
  writeGalleryWidget
} from './storage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const uploadsDir = path.join(rootDir, 'public', 'uploads');
const iconsDir = path.join(uploadsDir, 'icons');
const wallpapersDir = path.join(uploadsDir, 'wallpapers');

await ensureDataFile();

const app = express();
const upload = multer({
  storage: multer.diskStorage({
    destination(req, file, callback) {
      const target = req.path.includes('wallpaper') ? wallpapersDir : iconsDir;
      callback(null, target);
    },
    filename(req, file, callback) {
      const safeName = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '-')}`;
      callback(null, safeName);
    }
  })
});
const widgetImportUpload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use('/uploads', express.static(uploadsDir));
app.use('/gallery', express.static(path.join(rootDir, 'gallery')));

app.get('/api/dashboard', async (_req, res, next) => {
  try {
    const [dashboard, widgetLibrary, wallpapers, iconLibrary] = await Promise.all([
      readDashboard(),
      readGallery(),
      readWallpapers(),
      readIcons()
    ]);
    res.json({ dashboard, widgetLibrary, wallpapers, iconLibrary });
  } catch (error) {
    next(error);
  }
});

app.put('/api/dashboard', async (req, res, next) => {
  try {
    const payload = {
      ...req.body,
      updatedAt: new Date().toISOString()
    };
    await writeDashboard(payload);
    await createDailyBackupSnapshot(payload);
    res.json(payload);
  } catch (error) {
    next(error);
  }
});

app.get('/api/backup/export', async (_req, res, next) => {
  try {
    const bundle = await buildBackupBundle();
    const fileName = `home-dashboard-backup-${new Date().toISOString().slice(0, 10)}.json`;
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.json(bundle);
  } catch (error) {
    next(error);
  }
});

app.post('/api/backup/import', async (req, res, next) => {
  try {
    const dashboard = await importBackupBundle(req.body);
    res.json({ ok: true, dashboard });
  } catch (error) {
    next(error);
  }
});

app.get('/api/widgets', async (_req, res, next) => {
  try {
    res.json(await readGallery());
  } catch (error) {
    next(error);
  }
});

app.delete('/api/widgets/gallery/:sourceFile', async (req, res, next) => {
  try {
    await deleteGalleryWidget(req.params.sourceFile);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.post('/api/widgets/gallery', async (req, res, next) => {
  try {
    const widget = req.body?.sourceText
      ? parseWidgetSource(req.body.sourceText, req.body.fileName || 'widget.tsx')
      : req.body;
    const savedWidget = await writeGalleryWidget({
      ...widget,
      id: widget.id || `widget-${Date.now()}`,
      type: 'widget'
    });
    res.status(201).json(savedWidget);
  } catch (error) {
    next(error);
  }
});

app.post('/api/widgets/import', widgetImportUpload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'Aucun fichier widget recu.' });
      return;
    }
    const widget = parseWidgetSource(req.file.buffer.toString('utf8'), req.file.originalname || 'widget.tsx');
    const savedWidget = await writeGalleryWidget(widget);
    res.status(201).json(savedWidget);
  } catch (error) {
    next(error);
  }
});

app.put('/api/widgets/:itemId/state', async (req, res, next) => {
  try {
    const nextDashboard = await saveWidgetState(req.params.itemId, req.body?.state ?? null);
    const item = nextDashboard.items.find((entry) => entry.id === req.params.itemId) ?? null;
    res.json({ item });
  } catch (error) {
    next(error);
  }
});

app.post('/api/upload/icon', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'Aucun fichier reçu.' });
      return;
    }
    res.json({ url: `/uploads/icons/${req.file.filename}` });
  } catch (error) {
    next(error);
  }
});

app.post('/api/upload/wallpaper', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'Aucun fichier reçu.' });
      return;
    }
    res.json({ url: `/uploads/wallpapers/${req.file.filename}` });
  } catch (error) {
    next(error);
  }
});

app.delete('/api/upload/wallpaper/:fileName', async (req, res, next) => {
  try {
    await deleteWallpaperAsset(req.params.fileName);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.delete('/api/upload/icon/:fileName', async (req, res, next) => {
  try {
    await deleteIconAsset(req.params.fileName);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

// In production, serve the built frontend assets
const distDir = path.join(rootDir, 'dist');
try {
  await fs.access(distDir);
  app.use(express.static(distDir));
} catch {
  // dist/ not built yet — dev mode, Vite handles frontend
}

app.use(async (req, res, next) => {
  if (!req.path.startsWith('/api')) {
    try {
      // Try dist/index.html first (production), fall back to root index.html (dev)
      const candidates = [path.join(distDir, 'index.html'), path.join(rootDir, 'index.html')];
      for (const candidate of candidates) {
        try {
          const html = await fs.readFile(candidate, 'utf8');
          res.type('html').send(html);
          return;
        } catch {
          continue;
        }
      }
      next();
    } catch (error) {
      next(error);
      return;
    }
  }
  next();
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: 'Erreur serveur interne.' });
});

const port = Number(process.env.PORT || 3001);
app.listen(port, () => {
  console.log(`Home dashboard API on http://localhost:${port}`);
});
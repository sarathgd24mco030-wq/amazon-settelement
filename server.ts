import express from 'express';
import path from 'path';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { reconcileData, writeReconciliationWorkbook } from './server/reconciliationEngine';

// Deriving ESM paths since package.json has "type": "module"
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// In-memory workbook cache
const workbookCache = new Map<string, { buffer: Buffer; filename: string; createdAt: number }>();

// Cache cleaner (clears reports older than 30 minutes, runs every 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of workbookCache.entries()) {
    if (now - val.createdAt > 30 * 60 * 1000) {
      workbookCache.delete(key);
    }
  }
}, 5 * 60 * 1000);

// Setup multer in-memory file handler
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // Limit files to 50MB for larger datasets
});

const uploadFields = upload.fields([
  { name: 'settlement', maxCount: 1 },
  { name: 'sale_orders', maxCount: 1 },
  { name: 'bank_statement', maxCount: 1 }
]);

// 1. Reconciliation Endpoint
app.post('/api/reconcile', uploadFields, async (req, res, next) => {
  try {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    const tolerance = req.body.tolerance ? parseFloat(req.body.tolerance) : 1.0;
    const isDemo = req.body.demo === 'true';

    const settlementFile = files?.['settlement']?.[0];
    const saleOrdersFile = files?.['sale_orders']?.[0];
    const bankFile = files?.['bank_statement']?.[0];

    let result;
    if (isDemo || (!settlementFile && !saleOrdersFile && !bankFile)) {
      result = await reconcileData(null, null, null, tolerance);
    } else {
      if (!settlementFile || !saleOrdersFile || !bankFile) {
        return res.status(400).json({
          success: false,
          error: 'Please upload all 3 required files: Amazon Settlement, Sale Orders, and Bank Statement.'
        });
      }
      result = await reconcileData(
        settlementFile.buffer,
        saleOrdersFile.buffer,
        bankFile.buffer,
        tolerance
      );
    }

    // Build the professionally styled Excel workbook
    const excelBuffer = await writeReconciliationWorkbook(result, tolerance);

    // Save workbook to cache and return download key
    const cacheId = `recon_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const filename = `Amazon_Reconciliation_${new Date().toISOString().slice(0, 10)}.xlsx`;
    
    workbookCache.set(cacheId, {
      buffer: excelBuffer,
      filename,
      createdAt: Date.now()
    });

    res.json({
      success: true,
      cacheId,
      filename,
      result
    });
  } catch (error: any) {
    next(error);
  }
});

// 2. Excel Download Endpoint
app.get('/api/download/:id', (req, res) => {
  const cacheId = req.params.id;
  const cached = workbookCache.get(cacheId);
  if (!cached) {
    return res.status(404).send('Reconciliation report not found or expired.');
  }

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${cached.filename}"`);
  res.send(cached.buffer);
});

// 3. Global Express Error Handler Middleware (ensures JSON responses instead of HTML for API errors)
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Express global error captured:', err);

  // Catch Multer limit errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      error: 'One of the uploaded files exceeds the maximum size limit (50MB). Please select a smaller or optimized spreadsheet.'
    });
  }

  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'An unexpected server-side exception occurred during reconciliation.'
  });
});

// Vite middleware setup or production server
async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

start();

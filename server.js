const jsonServer = require('json-server');
const express    = require('express');
const path       = require('path');
const fs         = require('fs');
const multer     = require('multer');

const server = jsonServer.create();
const router = jsonServer.router(path.join(__dirname, 'bd.json'));
const db     = router.db;

// ─── Helpers lowdb ────────────────────────────────────────────────────────
function getCollection(nom) {
  if (!db.has(nom).value()) db.set(nom, []).write();
  return db.get(nom);
}
function initCollections(...noms) {
  noms.forEach(nom => { if (!db.has(nom).value()) db.set(nom, []).write(); });
}

// ─── Journalisation ─────────────────────────────────────────────────────────
server.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// ─── CORS ─────────────────────────────────────────────────────────────────
server.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') { res.sendStatus(200); return; }
  next();
});

// ✅ 1. SERVIR LES FICHIERS STATIQUES (AVANT TOUT)
server.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ✅ 2. MIDDLEWARE JSON-SERVER DEFAULTS (cela inclut bodyParser)
server.use(jsonServer.defaults({ logger: false }));

// ✅ 3. PAS BESOIN D'AJOUTER express.json() car déjà inclus dans jsonServer.defaults

// ============================================================
// ROUTES PERSONNALISÉES
// ============================================================

// ─── Dossiers uploads ─────────────────────────────────────────────────────
const uploadRapportsDir    = path.join(__dirname, 'uploads', 'rapports');
const uploadRapportsPTFDir = path.join(__dirname, 'uploads', 'rapports-ptf');
const uploadsDir           = path.join(__dirname, 'uploads');

// Créer tous les dossiers
[uploadsDir, uploadRapportsDir, uploadRapportsPTFDir].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// ─── Multer configuration ─────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (req.path.includes('rapports-ptf')) {
      cb(null, uploadRapportsPTFDir);
    } else {
      cb(null, uploadsDir);
    }
  },
  filename: (req, file, cb) => {
    const clean = file.originalname
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9.]/g, '_');
    cb(null, `${Date.now()}_${clean}`);
  }
});

const upload = multer({ 
  storage, 
  limits: { fileSize: 10 * 1024 * 1024 }
});

// ============================================================
// ROUTES UPLOAD
// ============================================================

// Route upload existante
server.post('/api/upload', upload.single('fichier'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Aucun fichier fourni' });
  res.json({ success: true, url: `/uploads/${req.file.filename}`, nom: req.file.originalname, taille: req.file.size });
});

// Upload CV volontaire
server.post('/api/upload/cv', upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Aucun fichier fourni' });
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ success: true, url: fileUrl, filename: req.file.filename, originalName: req.file.originalname, size: req.file.size });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upload pièce d'identité volontaire
server.post('/api/upload/identity', upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Aucun fichier fourni' });
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ success: true, url: fileUrl, filename: req.file.filename, originalName: req.file.originalname, size: req.file.size });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Supprimer un fichier
server.delete('/api/upload/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(uploadsDir, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Fichier non trouvé' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// ROUTES RAPPORTS (vos routes existantes)
// ============================================================

server.post('/rapports-ptf/upload', upload.single('fichier'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Aucun fichier fourni' });
    const { titre, type, description, partenairePTFId, categories, periode } = req.body;
    const rapport = {
      id: Date.now(), titre: titre || req.file.originalname, type: type || 'autre',
      description: description || '', date: new Date().toISOString(),
      url: `/uploads/rapports-ptf/${req.file.filename}`, partenairePTFId: partenairePTFId || null,
      partenairePTFIds: [], categories: categories ? JSON.parse(categories) : [],
      taille: req.file.size, statut: 'actif',
      metadata: { periode: periode || null, zoneGeographique: [], themes: [] },
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    };
    getCollection('rapports-ptf').push(rapport).write();
    res.status(201).json(rapport);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

server.get('/rapports-ptf/types', (_req, res) =>
  res.json(['rapport_trimestriel', 'rapport_annuel', 'rapport_impact', 'rapport_special', 'autre'])
);

server.get('/rapports-ptf/categories', (_req, res) =>
  res.json(['Rapport officiel', 'Statistiques', 'Impact social', 'Finances', 'Évaluation', 'Projets', 'Volontaires'])
);

server.get('/rapports-ptf/stats/:partenaireId', (req, res) => {
  try {
    const id = String(req.params.partenaireId);
    const rapports = getCollection('rapports-ptf').value() || [];
    const consultations = getCollection('consultations-ptf').value() || [];
    
    const accessibles = rapports.filter(r => {
      if (Array.isArray(r.partenairePTFIds)) return r.partenairePTFIds.length === 0 || r.partenairePTFIds.some(i => String(i) === id);
      return !r.partenairePTFId || String(r.partenairePTFId) === id;
    });
    
    const miennes = consultations.filter(c => String(c.partenairePTFId) === id);
    const consultes = [...new Set(miennes.map(c => String(c.rapportId)))].length;
    const dates = miennes.map(c => c.dateConsultation).filter(Boolean).sort((a, b) => b.localeCompare(a));
    
    res.json({ 
      totalRapports: accessibles.length, 
      rapportsConsultes: consultes, 
      derniereConsultation: dates[0] ?? null, 
      tauxConsultation: accessibles.length > 0 ? Math.round((consultes / accessibles.length) * 100) : 0 
    });
  } catch (e) { 
    res.status(500).json({ error: e.message }); 
  }
});

server.get('/rapports-ptf/recents/:partenaireId', (req, res) => {
  try {
    const id = String(req.params.partenaireId);
    const lim = parseInt(req.query.limit) || 5;
    const result = (getCollection('rapports-ptf').value() || [])
      .filter(r => !r.partenairePTFId || String(r.partenairePTFId) === id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, lim);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

server.get('/rapports-ptf/:id/telecharger', (req, res) => {
  try {
    const rap = getCollection('rapports-ptf').find(r => r.id == req.params.id).value();
    if (!rap?.url) return res.status(404).json({ error: 'Rapport non trouvé' });
    const fp = path.join(__dirname, rap.url.replace(/^\//, ''));
    if (!fs.existsSync(fp)) return res.status(404).json({ error: 'Fichier non trouvé' });
    res.download(fp, `${rap.titre}.pdf`);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

server.post('/rapports-ptf/:id/consulter', (req, res) => {
  try {
    const rapportId = parseInt(req.params.id);
    const partenairePTFId = String(req.body.partenairePTFId || '');
    const dateConsultation = req.body.dateConsultation || new Date().toISOString();
    const minuteCourante = dateConsultation.substring(0, 16);
    const consultations = getCollection('consultations-ptf').value() || [];
    
    const existeDeja = consultations.some(c =>
      String(c.rapportId) === String(rapportId) &&
      String(c.partenairePTFId) === partenairePTFId &&
      String(c.dateConsultation).substring(0, 16) === minuteCourante
    );
    
    if (!existeDeja) {
      const consultation = { 
        id: Date.now(), 
        rapportId, 
        partenairePTFId, 
        dateConsultation, 
        typeConsultation: req.body.typeConsultation || 'vue' 
      };
      getCollection('consultations-ptf').push(consultation).write();
      return res.json({ success: true, consultation });
    }
    res.json({ success: true, dejaEnregistree: true });
  } catch (e) { 
    res.status(500).json({ error: e.message }); 
  }
});

server.get('/rapports-ptf', (req, res) => {
  try {
    let raps = getCollection('rapports-ptf').value() || [];
    if (req.query.type) raps = raps.filter(r => r.type === req.query.type);
    if (req.query.search) {
      const s = req.query.search.toLowerCase();
      raps = raps.filter(r => r.titre?.toLowerCase().includes(s) || r.description?.toLowerCase().includes(s));
    }
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const start = (page - 1) * limit;
    res.json({ 
      rapports: raps.slice(start, start + limit), 
      total: raps.length, 
      page, 
      limit, 
      totalPages: Math.ceil(raps.length / limit) 
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

server.delete('/rapports-ptf/:id', (req, res) => {
  try {
    const rap = getCollection('rapports-ptf').find(r => r.id == req.params.id).value();
    if (!rap) return res.status(404).json({ error: 'Rapport non trouvé' });
    if (rap.url) { 
      const fp = path.join(__dirname, rap.url.replace(/^\//, '')); 
      if (fs.existsSync(fp)) fs.unlinkSync(fp); 
    }
    getCollection('rapports-ptf').remove(r => r.id == req.params.id).write();
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================================
// AUTRES ROUTES
// ============================================================

server.get('/affectations-completes', (_req, res) => {
  try {
    const affectations = getCollection('affectations').value() || [];
    const volontaires  = getCollection('volontaires').value()  || [];
    res.json(affectations.map(aff => ({ ...aff, volontaire: volontaires.find(v => String(v.id) === String(aff.volontaireId)) || null })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

server.post('/api/synchroniser-statuts', (_req, res) => {
  try {
    const affectations = getCollection('affectations').value() || [];
    const volontaires  = getCollection('volontaires').value()  || [];
    const actifs = new Set(affectations.filter(a => a.statut === 'active').map(a => String(a.volontaireId)));
    let corrections = 0;
    volontaires.forEach(v => {
      const aMission = actifs.has(String(v.id));
      if (v.statut === 'Actif' && !aMission) {
        getCollection('volontaires').find({ id: v.id }).assign({ statut: 'En attente', updated_at: new Date().toISOString() }).write();
        corrections++;
      } else if (v.statut === 'En attente' && aMission) {
        getCollection('volontaires').find({ id: v.id }).assign({ statut: 'Actif', updated_at: new Date().toISOString() }).write();
        corrections++;
      }
    });
    res.json({ success: true, corriges: corrections, message: corrections > 0 ? `${corrections} statut(s) corrigé(s)` : 'Aucune correction nécessaire' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================================
// ROUTEUR JSON-SERVER (EN DERNIER)
// ============================================================
server.use(router);

const PORT = 3000;
server.listen(PORT, () => {
  console.log('\n=== 🚀 SERVEUR PNVB DÉMARRÉ ===');
  console.log(`📡 URL                    : http://localhost:${PORT}`);
  console.log(`📊 Synchronisation        : POST /api/synchroniser-statuts`);
  console.log(`📊 Affectations complètes : GET  /affectations-completes`);
  console.log(`📄 Upload CV volontaire   : POST /api/upload/cv`);
  console.log(`🆔 Upload pièce identité  : POST /api/upload/identity`);
  console.log('================================\n');
});
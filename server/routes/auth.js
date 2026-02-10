const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../models/database');

const router = express.Router();
const crypto = require('crypto');


// Inscription (pour créer le premier utilisateur de test)
router.post('/register', async (req, res) => {
  const { email, password, name } = req.body;

  try {
    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insérer l'utilisateur
    db.run(
      'INSERT INTO users (email, password, name) VALUES (?, ?, ?)',
      [email, hashedPassword, name],
      function (err) {
        if (err) {
          return res.status(400).json({ error: 'Email déjà utilisé' });
        }

        res.json({
          message: 'Utilisateur créé avec succès',
          userId: this.lastID
        });
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Connexion
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
    if (err || !user) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    // Vérifier le mot de passe
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    // Créer le token JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  });
});


/* =========================================================
   RESET PASSWORD (POC puis production plus tard)
   ---------------------------------------------------------
   Règles métier:
   - Ne jamais révéler si un email existe (message neutre)
   - Générer un token unique avec expiration
   - Stocker uniquement le hash du token en base
   - Un token ne peut être utilisé qu’une fois
========================================================= */

/**
 * POST /api/auth/forgot-password
 * Body: { email }
 * POC: renvoie un lien de reset utilisable immédiatement
 * Prod plus tard: envoi email et renvoie seulement un message neutre
 */
router.post('/forgot-password', (req, res) => {
  const { email } = req.body;

  // Message neutre pour éviter l’énumération d’emails
  const neutralMessage =
    "Si un compte est associé à cette adresse e-mail, un message de réinitialisation de mot de passe vient d’être envoyé.";

  // Validation minimale
  if (!email || typeof email !== 'string') {
    return res.status(200).json({ message: neutralMessage });
  }

  db.get('SELECT id FROM users WHERE email = ?', [email.trim()], (err, user) => {
    // Même en cas d’erreur, on ne révèle rien
    if (err || !user) {
      return res.status(200).json({ message: neutralMessage });
    }

    // Génération token sécurisé (brut)
    const rawToken = crypto.randomBytes(32).toString('hex');

    // Hash token pour stockage en base (jamais le token brut)
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    // Expiration
    const ttlMinutes = parseInt(process.env.RESET_TOKEN_TTL_MINUTES || '15', 10);
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString();

    // Invalidation des anciens tokens (bonne pratique)
    // Règle métier: un utilisateur ne doit avoir qu’un token actif à la fois
    db.run(
      'UPDATE password_resets SET used_at = CURRENT_TIMESTAMP WHERE user_id = ? AND used_at IS NULL',
      [user.id],
      () => {
        // Création du nouveau token
        db.run(
          'INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
          [user.id, tokenHash, expiresAt],
          function () {
            const resetMode = process.env.RESET_MODE || 'POC';

            // En POC, on renvoie un lien de reset pour démo (pas d’email)
            if (resetMode === 'POC') {
              const url =
                `/reset-password.html?email=${encodeURIComponent(email.trim())}&token=${encodeURIComponent(rawToken)}`;

              return res.status(200).json({
                message: neutralMessage,
                dev_reset_url: url
              });
            }

            // En prod: on renverra uniquement le message neutre
            return res.status(200).json({ message: neutralMessage });
          }
        );
      }
    );
  });
});

/**
 * POST /api/auth/reset-password
 * Body: { email, token, newPassword }
 * Vérifie:
    * - token valide, non expiré, non utilisé
    * - puis met à jour le password (hash bcrypt)
 */
router.post('/reset-password', async (req, res) => {
  const { email, token, newPassword } = req.body;

  if (!email || !token || !newPassword) {
    return res.status(400).json({ error: "Données manquantes" });
  }

  // Optionnel: règle de complexité minimale
  // POC: on reste simple mais on évite les mots de passe trop courts
  if (String(newPassword).length < 8) {
    return res.status(400).json({ error: "Le mot de passe doit contenir au moins 8 caractères" });
  }

  db.get('SELECT id FROM users WHERE email = ?', [email.trim()], (err, user) => {
    if (err || !user) {
      return res.status(400).json({ error: "Lien de réinitialisation invalide" });
    }

    const tokenHash = crypto.createHash('sha256').update(String(token)).digest('hex');

    // On récupère le token reset valide (non utilisé et non expiré)
    db.get(
      `
      SELECT id, expires_at, used_at
      FROM password_resets
      WHERE user_id = ?
        AND token_hash = ?
        AND used_at IS NULL
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [user.id, tokenHash],
      async (err2, resetRow) => {
        if (err2 || !resetRow) {
          return res.status(400).json({ error: "Lien de réinitialisation invalide ou expiré" });
        }

        const now = Date.now();
        const exp = new Date(resetRow.expires_at).getTime();

        if (Number.isNaN(exp) || exp < now) {
          return res.status(400).json({ error: "Lien de réinitialisation expiré" });
        }

        try {
          // Hash du nouveau mot de passe
          const hashedPassword = await bcrypt.hash(String(newPassword), 10);

          // Mise à jour mot de passe user
          db.run(
            'UPDATE users SET password = ? WHERE id = ?',
            [hashedPassword, user.id],
            (err3) => {
              if (err3) {
                return res.status(500).json({ error: "Erreur serveur" });
              }

              // Marquer le token comme utilisé (usage unique)
              db.run(
                'UPDATE password_resets SET used_at = CURRENT_TIMESTAMP WHERE id = ?',
                [resetRow.id],
                () => {
                  return res.json({ message: "Mot de passe mis à jour avec succès" });
                }
              );
            }
          );
        } catch (e) {
          return res.status(500).json({ error: "Erreur serveur" });
        }
      }
    );
  });
});




module.exports = router;
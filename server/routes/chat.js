const express = require('express');
const db = require('../models/database');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Tous les endpoints nécessitent l'authentification
router.use(authMiddleware);

// Créer une nouvelle conversation
router.post('/conversations', (req, res) => {
  const { agent_type } = req.body;
  const user_id = req.user.id;

  db.run(
    'INSERT INTO conversations (user_id, agent_type) VALUES (?, ?)',
    [user_id, agent_type],
    function (err) {
      if (err) {
        return res.status(500).json({ error: 'Erreur lors de la création de la conversation' });
      }

      res.json({
        conversation_id: this.lastID,
        agent_type
      });
    }
  );
});

// Envoyer un message (simulation sans OpenAI pour l'instant)
router.post('/messages', (req, res) => {
  const { conversation_id, content } = req.body;

  // Sauvegarder le message utilisateur
  db.run(
    'INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)',
    [conversation_id, 'user', content],
    function (err) {
      if (err) {
        return res.status(500).json({ error: 'Erreur lors de l\'envoi du message' });
      }

      // Réponse simulée (on intégrera OpenAI plus tard)
      const simulatedResponse = `Réponse simulée de l'agent IA. Vous avez dit : "${content}". L'intégration OpenAI sera ajoutée prochainement.`;

      // Sauvegarder la réponse de l'IA
      db.run(
        'INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)',
        [conversation_id, 'assistant', simulatedResponse],
        function (err) {
          if (err) {
            return res.status(500).json({ error: 'Erreur lors de la sauvegarde de la réponse' });
          }

          res.json({
            user_message_id: this.lastID - 1,
            assistant_message: {
              id: this.lastID,
              content: simulatedResponse
            }
          });
        }
      );
    }
  );
});

// Récupérer l'historique d'une conversation
router.get('/conversations/:id/messages', (req, res) => {
  const { id } = req.params;

  db.all(
    'SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC',
    [id],
    (err, messages) => {
      if (err) {
        return res.status(500).json({ error: 'Erreur lors de la récupération des messages' });
      }

      res.json({ messages });
    }
  );
});

// Récupérer toutes les conversations de l'utilisateur
router.get('/conversations', (req, res) => {
  const user_id = req.user.id;

  db.all(
    'SELECT * FROM conversations WHERE user_id = ? ORDER BY created_at DESC',
    [user_id],
    (err, conversations) => {
      if (err) {
        return res.status(500).json({ error: 'Erreur lors de la récupération des conversations' });
      }

      res.json({ conversations });
    }
  );
});

module.exports = router;
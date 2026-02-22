const BASE = '/api';

export const api = {
  // Topics
  getTopics: () => fetch(`${BASE}/topics`).then(r => r.json()),
  createTopic: (name) => fetch(`${BASE}/topics`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) }).then(r => r.json()),
  updateTopic: (id, name) => fetch(`${BASE}/topics/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) }).then(r => r.json()),
  deleteTopic: (id) => fetch(`${BASE}/topics/${id}`, { method: 'DELETE' }).then(r => r.json()),

  // Cards
  getCards: (topicId) => fetch(`${BASE}/cards${topicId ? `?topic_id=${topicId}` : ''}`).then(r => r.json()),
  createCard: (data) => fetch(`${BASE}/cards`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
  updateCard: (id, data) => fetch(`${BASE}/cards/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
  deleteCard: (id) => fetch(`${BASE}/cards/${id}`, { method: 'DELETE' }).then(r => r.json()),

  // Import
  importQuestions: (data) => fetch(`${BASE}/cards/import`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),

  // Upload
  uploadImage: (file, folder) => {
    const fd = new FormData();
    fd.append('image', file);
    if (folder) fd.append('folder', folder);
    return fetch(`${BASE}/cards/upload`, { method: 'POST', body: fd }).then(r => r.json());
  },
};

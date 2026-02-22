import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import ImportModal from './ImportModal';

export default function TopicList() {
  const [topics, setTopics] = useState([]);
  const [newName, setNewName] = useState('');
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState('');
  const [loading, setLoading] = useState(true);
  const [showImport, setShowImport] = useState(false);

  const load = () => api.getTopics().then(t => { setTopics(t); setLoading(false); });

  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    await api.createTopic(newName.trim());
    setNewName('');
    load();
  };

  const handleUpdate = async (id) => {
    if (!editName.trim()) return;
    await api.updateTopic(id, editName.trim());
    setEditId(null);
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this topic and all its cards?')) return;
    await api.deleteTopic(id);
    load();
  };

  if (loading) return <div className="text-center py-12 text-gray-400">Loading...</div>;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Topics</h2>

      {/* Create form */}
      <form onSubmit={handleCreate} className="flex gap-2 mb-6">
        <input
          type="text"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="New topic name..."
          className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none transition"
        />
        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium">
          Add
        </button>
        <button type="button" onClick={() => setShowImport(true)} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-medium">
          📥 Import
        </button>
      </form>

      {showImport && <ImportModal topics={topics} onClose={() => setShowImport(false)} onSuccess={() => { setShowImport(false); load(); }} />}

      {topics.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-3">📚</p>
          <p>No topics yet. Create one to get started!</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {topics.map(t => (
            <div key={t.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 flex items-center justify-between shadow-sm hover:shadow-md transition">
              {editId === t.id ? (
                <div className="flex gap-2 flex-1 mr-3">
                  <input
                    type="text"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleUpdate(t.id)}
                    className="flex-1 px-3 py-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 outline-none"
                    autoFocus
                  />
                  <button onClick={() => handleUpdate(t.id)} className="text-green-600 hover:text-green-500 font-medium text-sm">Save</button>
                  <button onClick={() => setEditId(null)} className="text-gray-400 hover:text-gray-300 text-sm">Cancel</button>
                </div>
              ) : (
                <div className="flex items-center gap-3 flex-1">
                  <Link to={`/topics/${t.id}/cards`} className="font-medium text-lg hover:text-blue-600 dark:hover:text-blue-400 transition">
                    {t.name}
                  </Link>
                  <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full">
                    {t.card_count} card{t.card_count !== 1 ? 's' : ''}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Link to={`/quiz/${t.id}`} className="text-sm px-3 py-1.5 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-800 transition" title="Quiz this topic">
                  ▶ Quiz
                </Link>
                <button onClick={() => { setEditId(t.id); setEditName(t.name); }} className="text-gray-400 hover:text-blue-500 transition" title="Edit">✏️</button>
                <button onClick={() => handleDelete(t.id)} className="text-gray-400 hover:text-red-500 transition" title="Delete">🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

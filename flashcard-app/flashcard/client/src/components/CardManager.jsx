import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';
import MathContent from './MathContent';

function CardSideInput({ label, type, setType, content, setContent }) {
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const res = await api.uploadImage(file);
    if (res.path) {
      setType('image');
      setContent(res.path);
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-600 dark:text-gray-400">{label}</label>
      <div className="flex gap-2 mb-2">
        <button
          type="button"
          onClick={() => { setType('text'); setContent(''); }}
          className={`text-xs px-3 py-1 rounded-full transition ${type === 'text' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}
        >
          Text
        </button>
        <button
          type="button"
          onClick={() => { setType('image'); setContent(''); }}
          className={`text-xs px-3 py-1 rounded-full transition ${type === 'image' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}
        >
          Image
        </button>
      </div>
      {type === 'text' ? (
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder={`Enter ${label.toLowerCase()}...`}
          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px] resize-y"
        />
      ) : (
        <div>
          <input type="file" accept="image/*" onChange={handleFileChange} className="text-sm" />
          {content && <img src={content} alt="preview" className="mt-2 max-h-32 rounded-lg object-contain" />}
        </div>
      )}
    </div>
  );
}

function DifficultyPicker({ value, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 dark:text-gray-400">Difficulty:</span>
      {[1,2,3,4,5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(value === n ? null : n)}
          className={`w-7 h-7 rounded-full text-xs font-bold transition ${value === n ? 'bg-blue-600 text-white shadow' : 'bg-gray-200 dark:bg-gray-700 text-gray-500 hover:bg-gray-300 dark:hover:bg-gray-600'}`}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

function TagInput({ tags, setTags }) {
  const [input, setInput] = useState('');

  const addTag = (val) => {
    const tag = val.trim();
    if (tag && !tags.includes(tag)) setTags([...tags, tag]);
    setInput('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(input);
    } else if (e.key === 'Backspace' && !input && tags.length) {
      setTags(tags.slice(0, -1));
    }
  };

  return (
    <div className="flex flex-wrap gap-1.5 items-center border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-800 min-h-[38px]">
      {tags.map(tag => (
        <span key={tag} className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs rounded-full">
          {tag}
          <button type="button" onClick={() => setTags(tags.filter(t => t !== tag))} className="text-blue-500 hover:text-blue-700 dark:hover:text-blue-200 leading-none">×</button>
        </span>
      ))}
      <input
        type="text"
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => input && addTag(input)}
        placeholder={tags.length === 0 ? 'Add tags (Enter or comma)...' : ''}
        className="flex-1 min-w-[100px] text-xs outline-none bg-transparent text-gray-700 dark:text-gray-300 placeholder-gray-400"
      />
    </div>
  );
}

function renderContent(type, content, className = '', scrollable = false) {
  if (type === 'image') return <img src={content} alt="" className={`rounded object-contain max-h-24 ${className}`} />;
  if (scrollable) {
    return (
      <div
        className={`text-sm overflow-y-auto max-h-32 pr-1 ${className}`}
        style={{ overscrollBehavior: 'contain' }}
      >
        <MathContent content={content} />
      </div>
    );
  }
  const toShow = content.length > 200 ? content.slice(0, 200) + '...' : content;
  return (
    <span className={`text-sm ${className}`}>
      <MathContent content={toShow} />
    </span>
  );
}

export default function CardManager() {
  const { topicId } = useParams();
  const [cards, setCards] = useState([]);
  const [topic, setTopic] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [addFrontType, setAddFrontType] = useState('text');
  const [addFrontContent, setAddFrontContent] = useState('');
  const [addBackType, setAddBackType] = useState('text');
  const [addBackContent, setAddBackContent] = useState('');
  const [addDifficulty, setAddDifficulty] = useState(null);
  const [addTags, setAddTags] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [cardsData, topicsData] = await Promise.all([api.getCards(topicId), api.getTopics()]);
    setCards(cardsData);
    setTopic(topicsData.find(t => t.id === topicId));
    setLoading(false);
  };

  useEffect(() => { load(); }, [topicId]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!addFrontContent || !addBackContent) return;
    await api.createCard({
      topic_id: topicId,
      front_type: addFrontType,
      front_content: addFrontContent,
      back_type: addBackType,
      back_content: addBackContent,
      difficulty: addDifficulty,
      tags: addTags,
    });
    setShowAddForm(false);
    setAddFrontType('text');
    setAddFrontContent('');
    setAddBackType('text');
    setAddBackContent('');
    setAddDifficulty(null);
    setAddTags([]);
    load();
  };

  const handleUpdate = async (e, id, payload) => {
    e.preventDefault();
    if (!payload || !payload.front_content || !payload.back_content) return;
    await api.updateCard(id, {
      topic_id: topicId,
      front_type: payload.front_type,
      front_content: payload.front_content,
      back_type: payload.back_type,
      back_content: payload.back_content,
      difficulty: payload.difficulty,
      tags: payload.tags,
    });
    setEditingId(null);
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this card?')) return;
    await api.deleteCard(id);
    if (editingId === id) setEditingId(null);
    load();
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link to="/" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition">← Back</Link>
        <h2 className="text-2xl font-bold">{topic?.name || 'Cards'}</h2>
        <span className="text-sm text-gray-400">{cards.length} card{cards.length !== 1 ? 's' : ''}</span>
      </div>

      <button
        onClick={() => { setShowAddForm(!showAddForm); setEditingId(null); }}
        className="mb-6 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-medium shadow-sm"
      >
        {showAddForm ? 'Cancel' : '+ Add Card'}
      </button>

      {showAddForm && (
        <div className="mb-6 rounded-2xl border-2 border-dashed border-blue-200 dark:border-blue-800 bg-white dark:bg-gray-800 shadow-lg overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-blue-50/50 dark:bg-blue-900/20">
            <span className="text-sm font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">New card</span>
          </div>
          <form onSubmit={handleCreate} className="p-5 space-y-4">
            <CardSideInput label="Front (Question)" type={addFrontType} setType={setAddFrontType} content={addFrontContent} setContent={setAddFrontContent} />
            <CardSideInput label="Back (Answer)" type={addBackType} setType={setAddBackType} content={addBackContent} setContent={setAddBackContent} />
            <DifficultyPicker value={addDifficulty} onChange={setAddDifficulty} />
            <TagInput tags={addTags} setTags={setAddTags} />
            <div className="flex gap-2">
              <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium">
                Create
              </button>
              <button type="button" onClick={() => setShowAddForm(false)} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {cards.length === 0 && !showAddForm ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-3">🃏</p>
          <p>No cards yet. Add some to start studying!</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {cards.map(c => {
            const isEditing = editingId === c.id;
            return (
              <CardItem
                key={c.id}
                card={c}
                isEditing={isEditing}
                onStartEdit={() => { setEditingId(c.id); setShowAddForm(false); }}
                onCancelEdit={() => setEditingId(null)}
                onSave={(e, payload) => handleUpdate(e, c.id, payload)}
                onDelete={() => handleDelete(c.id)}
                renderContent={renderContent}
                CardSideInput={CardSideInput}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function CardItem({ card, isEditing, onStartEdit, onCancelEdit, onSave, onDelete, renderContent, CardSideInput }) {
  const [frontType, setFrontType] = useState(card.front_type);
  const [frontContent, setFrontContent] = useState(card.front_content);
  const [backType, setBackType] = useState(card.back_type);
  const [backContent, setBackContent] = useState(card.back_content);
  const [difficulty, setDifficulty] = useState(card.difficulty);
  const [tags, setTags] = useState(card.tags || []);

  React.useEffect(() => {
    if (isEditing) {
      setFrontType(card.front_type);
      setFrontContent(card.front_content);
      setBackType(card.back_type);
      setBackContent(card.back_content);
      setDifficulty(card.difficulty);
      setTags(card.tags || []);
    }
  }, [isEditing, card.front_type, card.front_content, card.back_type, card.back_content, card.difficulty, card.tags]);

  if (isEditing) {
    return (
      <div className="rounded-2xl border-2 border-blue-300 dark:border-blue-700 bg-white dark:bg-gray-800 shadow-lg overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-blue-50/50 dark:bg-blue-900/20 flex items-center justify-between">
          <span className="text-sm font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Edit card</span>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); onSave(e, { front_type: frontType, front_content: frontContent, back_type: backType, back_content: backContent, difficulty, tags }); }} className="p-5 space-y-4">
          <CardSideInput label="Front (Question)" type={frontType} setType={setFrontType} content={frontContent} setContent={setFrontContent} />
          <CardSideInput label="Back (Answer)" type={backType} setType={setBackType} content={backContent} setContent={setBackContent} />
          <DifficultyPicker value={difficulty} onChange={setDifficulty} />
          <TagInput tags={tags} setTags={setTags} />
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium">
              Update
            </button>
            <button type="button" onClick={onCancelEdit} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition">
              Cancel
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      <div className="grid grid-cols-2 gap-0">
        <div className="p-4 border-r border-b border-gray-200 dark:border-gray-700">
          <div className="text-xs text-blue-600 dark:text-blue-400 uppercase tracking-wider font-semibold mb-2">Front</div>
          <div className="text-gray-900 dark:text-gray-100">{renderContent(card.front_type, card.front_content, '', true)}</div>
        </div>
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="text-xs text-green-600 dark:text-green-400 uppercase tracking-wider font-semibold mb-2">Back</div>
          <div className="text-gray-900 dark:text-gray-100">{renderContent(card.back_type, card.back_content)}</div>
        </div>
      </div>
      <div className="bg-gray-50 dark:bg-gray-800/80 border-t border-gray-200 dark:border-gray-700">
        {(card.source_title != null || card.source_question_number != null) && (
          <div className="px-4 pt-2 pb-1 text-xs text-gray-500 dark:text-gray-400">
            From: {[card.source_title, card.source_question_number != null && `Q#${card.source_question_number}`].filter(Boolean).join(' · ')}
          </div>
        )}
        {(card.difficulty != null || (card.tags && card.tags.length > 0)) && (
          <div className="px-4 pt-1 pb-1 flex flex-wrap items-center gap-2">
            {card.difficulty != null && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Difficulty: <span className="font-semibold text-blue-600 dark:text-blue-400">{card.difficulty}</span>
              </span>
            )}
            {card.tags && card.tags.map(tag => (
              <span key={tag} className="px-2 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded-full">{tag}</span>
            ))}
          </div>
        )}
        <div className="p-3 flex justify-end gap-2">
          <button type="button" onClick={onStartEdit} className="px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition" title="Edit">
            ✏️ Edit
          </button>
          <button type="button" onClick={onDelete} className="px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition" title="Delete">
            🗑️ Delete
          </button>
        </div>
      </div>
    </div>
  );
}

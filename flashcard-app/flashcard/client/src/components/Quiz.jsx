import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';
import MathContent from './MathContent';
import { Pencil, Shuffle } from 'lucide-react';
import CustomQuizSetup from './CustomQuizSetup';

function FlipCard({ card, flipped, onClick }) {
  const scrollingRef = React.useRef(false);

  const handleCardClick = (e) => {
    if (scrollingRef.current) return;
    onClick(e);
  };

  const handleScrollStart = (e) => {
    scrollingRef.current = true;
    e.stopPropagation();
  };

  const handleScrollEnd = () => {
    setTimeout(() => { scrollingRef.current = false; }, 100);
  };

  return (
    <div className="flip-card w-full h-96 cursor-pointer select-none" onClick={handleCardClick}>
      <div className={`flip-card-inner ${flipped ? 'flipped' : ''}`}>
        <div className="flip-card-front bg-white dark:bg-gray-800 border-2 border-blue-200 dark:border-blue-800 shadow-lg rounded-2xl">
          <div className="w-full h-full flex flex-col min-h-0">
            <div
              className="w-full flex justify-between items-start gap-2 px-6 pt-5 pb-3 shrink-0"
              onClick={(e) => { e.stopPropagation(); onClick(e); }}
            >
              <div className="text-sm text-blue-600 dark:text-blue-400 uppercase tracking-wider font-semibold">Question</div>
              {(card.source_title != null || card.source_question_number != null) && (
                <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
                  {[card.source_title, card.source_question_number != null && `Q#${card.source_question_number}`].filter(Boolean).join(' · ')}
                </span>
              )}
            </div>
            <div
              className="w-full flex-1 min-h-0 overflow-y-auto overflow-x-hidden text-left text-gray-900 dark:text-gray-100 text-base leading-relaxed px-6 pb-5"
              style={{ touchAction: 'pan-y', overscrollBehavior: 'contain' }}
              onTouchStart={handleScrollStart}
              onTouchEnd={handleScrollEnd}
              onMouseDown={handleScrollStart}
              onMouseUp={handleScrollEnd}
              onClick={(e) => e.stopPropagation()}
            >
              {card.front_type === 'image'
                ? <img src={card.front_content} alt="" className="max-h-64 max-w-full rounded-lg object-contain" />
                : <MathContent content={card.front_content} className="math-content" />
              }
            </div>
          </div>
        </div>
        <div className="flip-card-back bg-white dark:bg-gray-800 border-2 border-green-200 dark:border-green-800 shadow-lg rounded-2xl">
          <div className="w-full h-full flex flex-col min-h-0">
            <div
              className="shrink-0 text-center px-6 pt-5 pb-3"
              onClick={(e) => { e.stopPropagation(); onClick(e); }}
            >
              <div className="text-sm text-green-600 dark:text-green-400 uppercase tracking-wider font-semibold">Answer</div>
              {(card.source_title != null || card.source_question_number != null) && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  From: {[card.source_title, card.source_question_number != null && `Q#${card.source_question_number}`].filter(Boolean).join(' · ')}
                </p>
              )}
            </div>
            <div
              className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden text-center text-xl leading-relaxed px-6 pb-5"
              style={{ touchAction: 'pan-y', overscrollBehavior: 'contain' }}
              onTouchStart={handleScrollStart}
              onTouchEnd={handleScrollEnd}
              onMouseDown={handleScrollStart}
              onMouseUp={handleScrollEnd}
              onClick={(e) => e.stopPropagation()}
            >
              {card.back_type === 'image'
                ? <img src={card.back_content} alt="" className="max-h-64 max-w-full rounded-lg object-contain" />
                : <MathContent content={card.back_content} className="math-content" />
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function shuffleArr(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function sortCards(cards) {
  const hasQNumbers = cards.some(c => c.source_question_number != null);
  if (hasQNumbers) {
    return [...cards].sort((a, b) => {
      if (a.source_question_number == null) return 1;
      if (b.source_question_number == null) return -1;
      return a.source_question_number - b.source_question_number;
    });
  }
  return [...cards].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
}

function QuizEditModal({ card, onSave, onClose }) {
  const [frontContent, setFrontContent] = useState(card.front_content);
  const [backContent, setBackContent] = useState(card.back_content);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave({ front_content: frontContent, back_content: backContent });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Edit Card</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl leading-none">×</button>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Front (Question)</label>
          {card.front_type === 'image' ? (
            <p className="text-xs text-gray-400 italic">Image content — edit in Card Manager</p>
          ) : (
            <textarea
              value={frontContent}
              onChange={e => setFrontContent(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px] resize-y text-sm"
            />
          )}
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Back (Answer)</label>
          {card.back_type === 'image' ? (
            <p className="text-xs text-gray-400 italic">Image content — edit in Card Manager</p>
          ) : (
            <textarea
              value={backContent}
              onChange={e => setBackContent(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px] resize-y text-sm"
            />
          )}
        </div>

        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition text-sm">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium text-sm disabled:opacity-60">
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Quiz() {
  const { topicId } = useParams();
  const [cards, setCards] = useState([]);
  const [topics, setTopics] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState(topicId || '');
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [started, setStarted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editModalCard, setEditModalCard] = useState(null);
  const [tagInput, setTagInput] = useState('');
  const [customMode, setCustomMode] = useState(false);

  useEffect(() => {
    api.getTopics().then(t => { setTopics(t); setLoading(false); });
  }, []);

  useEffect(() => {
    if (topicId) {
      setSelectedTopic(topicId);
      startQuiz(topicId);
    }
  }, [topicId]);

  // Clear tag input when navigating between cards
  useEffect(() => { setTagInput(''); }, [index]);

  const startQuiz = async (tid) => {
    const data = await api.getCards(tid || '');
    if (data.length === 0) return;
    setCards(sortCards(data));
    setIndex(0);
    setFlipped(false);
    setStarted(true);
  };

  const next = () => {
    if (index < cards.length - 1) {
      setFlipped(false);
      setTimeout(() => setIndex(i => i + 1), 100);
    }
  };

  const prev = () => {
    if (index > 0) {
      setFlipped(false);
      setTimeout(() => setIndex(i => i - 1), 100);
    }
  };

  const restart = () => {
    setCards(c => sortCards(c));
    setIndex(0);
    setFlipped(false);
  };

  const doShuffle = () => {
    setCards(shuffleArr(cards));
    setIndex(0);
    setFlipped(false);
  };

  const handleRateDifficulty = async (cardId, diff) => {
    const updated = await api.updateCard(cardId, { difficulty: diff });
    setCards(cs => cs.map(c => c.id === cardId ? { ...c, difficulty: updated.difficulty } : c));
  };

  const handleUpdateTags = async (cardId, newTags) => {
    const updated = await api.updateCard(cardId, { tags: newTags });
    setCards(cs => cs.map(c => c.id === cardId ? { ...c, tags: updated.tags } : c));
  };

  const handleAddTag = async (tag) => {
    const trimmed = tag.trim();
    const currentCard = cards[index];
    if (!trimmed || (currentCard.tags || []).includes(trimmed)) { setTagInput(''); return; }
    await handleUpdateTags(currentCard.id, [...(currentCard.tags || []), trimmed]);
    setTagInput('');
  };

  const handleRemoveTag = async (tag) => {
    const currentCard = cards[index];
    await handleUpdateTags(currentCard.id, (currentCard.tags || []).filter(t => t !== tag));
  };

  const handleOpenEdit = () => setEditModalCard({ ...cards[index] });
  const handleCloseEdit = () => setEditModalCard(null);

  const handleSaveEdit = async (updates) => {
    const result = await api.updateCard(editModalCard.id, {
      front_content: updates.front_content,
      back_content: updates.back_content,
    });
    setCards(cs => cs.map(c => c.id === result.id ? result : c));
    setEditModalCard(null);
  };

  if (loading) return <div className="text-center py-12 text-gray-400">Loading...</div>;

  if (customMode) {
    return (
      <CustomQuizSetup
        onStart={(selectedCards) => {
          if (!selectedCards.length) return;
          setCards(sortCards(selectedCards));
          setIndex(0);
          setFlipped(false);
          setCustomMode(false);
          setStarted(true);
        }}
        onCancel={() => setCustomMode(false)}
      />
    );
  }

  if (!started) {
    return (
      <div className="max-w-md mx-auto text-center">
        <h2 className="text-2xl font-bold mb-6">🧠 Quiz Mode</h2>
        <div className="space-y-3 mb-6">
          <button
            onClick={() => startQuiz('')}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-medium text-lg"
          >
            All Topics
          </button>
          <button
            onClick={() => setCustomMode(true)}
            className="w-full px-4 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition font-medium text-lg"
          >
            Custom Quiz
          </button>
          {topics.map(t => (
            <button
              key={t.id}
              onClick={() => startQuiz(t.id)}
              className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-750 transition text-left flex justify-between items-center"
            >
              <span className="font-medium">{t.name}</span>
              <span className="text-sm text-gray-400">{t.card_count} cards</span>
            </button>
          ))}
        </div>
        <Link to="/" className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">← Back to topics</Link>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-4xl mb-3">😕</p>
        <p className="text-gray-400 mb-4">No cards found for this selection.</p>
        <button onClick={() => setStarted(false)} className="text-blue-600 hover:text-blue-500">← Back to quiz menu</button>
      </div>
    );
  }

  const card = cards[index];

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center mb-4">
        <button onClick={() => setStarted(false)} className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">← Back</button>
        <span className="flex-1 text-center text-sm text-gray-400 font-medium">{index + 1} / {cards.length}</span>
        <button
          onClick={handleOpenEdit}
          title="Edit card"
          className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
        >
          <Pencil size={15} />
        </button>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mb-6">
        <div className="bg-blue-600 h-1.5 rounded-full transition-all duration-300" style={{ width: `${((index + 1) / cards.length) * 100}%` }} />
      </div>

      <div className="mb-1 text-center text-xs text-gray-400">Tap card to flip</div>

      <FlipCard card={card} flipped={flipped} onClick={() => setFlipped(!flipped)} />

      {/* Difficulty row */}
      <div className="flex items-center gap-2 mt-4 justify-center">
        <span className="text-xs text-gray-400 uppercase tracking-wider">Difficulty</span>
        {[1,2,3,4,5].map(n => (
          <button key={n} onClick={() => handleRateDifficulty(card.id, n)}
            className={`w-8 h-8 rounded-full text-sm font-bold transition
              ${card.difficulty === n ? 'bg-blue-600 text-white shadow'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-500 hover:bg-gray-300 dark:hover:bg-gray-600'}`}>
            {n}
          </button>
        ))}
        {card.difficulty && (
          <button onClick={() => handleRateDifficulty(card.id, null)} className="text-xs text-gray-400 hover:text-gray-600 ml-1">×</button>
        )}
      </div>

      {/* Tags — inline editable */}
      <div className="flex flex-wrap gap-1.5 mt-2 justify-center items-center min-h-[28px]">
        {(card.tags || []).map(tag => (
          <span key={tag} className="flex items-center gap-0.5 px-2 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded-full">
            {tag}
            <button
              onClick={() => handleRemoveTag(tag)}
              className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-100 ml-0.5 leading-none"
            >×</button>
          </span>
        ))}
        <input
          type="text"
          value={tagInput}
          onChange={e => setTagInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); handleAddTag(tagInput); }
          }}
          onBlur={() => tagInput && handleAddTag(tagInput)}
          placeholder="+ tag"
          className="text-xs outline-none bg-transparent text-gray-500 dark:text-gray-400 w-12 placeholder-gray-400 dark:placeholder-gray-500"
        />
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center mt-6">
        <button
          onClick={prev}
          disabled={index === 0}
          className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 disabled:opacity-30 hover:bg-gray-300 dark:hover:bg-gray-600 transition"
        >
          ← Prev
        </button>
        <button
          onClick={doShuffle}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
        >
          <Shuffle size={15} />
          Shuffle
        </button>
        {index === cards.length - 1 ? (
          <button onClick={restart} className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition font-medium">
            ↻ Restart
          </button>
        ) : (
          <button onClick={next} className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition font-medium">
            Next →
          </button>
        )}
      </div>

      {editModalCard && <QuizEditModal card={editModalCard} onSave={handleSaveEdit} onClose={handleCloseEdit} />}
    </div>
  );
}

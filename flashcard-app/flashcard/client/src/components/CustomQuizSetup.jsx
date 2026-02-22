import React, { useState, useEffect, useMemo, useRef } from 'react';
import { api } from '../api';
import MathContent from './MathContent';

export default function CustomQuizSetup({ onStart, onCancel, initialFilters }) {
  const [allCards, setAllCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTags, setSelectedTags] = useState(() => new Set(initialFilters?.tags || []));
  const [selectedDifficulties, setSelectedDifficulties] = useState(() => new Set(initialFilters?.difficulties || []));
  const [selectedSources, setSelectedSources] = useState(() => new Set(initialFilters?.sources || []));
  const [checkedCardIds, setCheckedCardIds] = useState(new Set());

  // Save-quiz UI state
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const saveInputRef = useRef(null);

  useEffect(() => {
    api.getCards().then(cards => {
      setAllCards(cards);
      setLoading(false);
    });
  }, []);

  const allTags = useMemo(() => {
    const tags = new Set();
    allCards.forEach(c => (c.tags || []).forEach(t => tags.add(t)));
    return [...tags].sort();
  }, [allCards]);

  const allDifficulties = useMemo(() => {
    const diffs = new Set();
    allCards.forEach(c => diffs.add(c.difficulty ?? null));
    return [...diffs].sort((a, b) => {
      if (a === null) return 1;
      if (b === null) return -1;
      return a - b;
    });
  }, [allCards]);

  const allSources = useMemo(() => {
    const sources = new Set();
    allCards.forEach(c => { if (c.source_title) sources.add(c.source_title); });
    return [...sources].sort();
  }, [allCards]);

  const filteredCards = useMemo(() => {
    return allCards.filter(card => {
      const tagMatch = selectedTags.size === 0 || (card.tags || []).some(t => selectedTags.has(t));
      const diffMatch = selectedDifficulties.size === 0 || selectedDifficulties.has(card.difficulty ?? null);
      const srcMatch = selectedSources.size === 0 || selectedSources.has(card.source_title);
      return tagMatch && diffMatch && srcMatch;
    });
  }, [allCards, selectedTags, selectedDifficulties, selectedSources]);

  // Auto-select cards when filters change
  useEffect(() => {
    setCheckedCardIds(new Set(filteredCards.map(c => c.id)));
    setSavedMsg('');
  }, [filteredCards]);

  const toggleTag = (tag) => {
    setSelectedTags(prev => {
      const next = new Set(prev);
      next.has(tag) ? next.delete(tag) : next.add(tag);
      return next;
    });
  };

  const toggleDifficulty = (diff) => {
    setSelectedDifficulties(prev => {
      const next = new Set(prev);
      next.has(diff) ? next.delete(diff) : next.add(diff);
      return next;
    });
  };

  const toggleSource = (src) => {
    setSelectedSources(prev => {
      const next = new Set(prev);
      next.has(src) ? next.delete(src) : next.add(src);
      return next;
    });
  };

  const toggleCard = (id) => {
    setCheckedCardIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => setCheckedCardIds(new Set(filteredCards.map(c => c.id)));
  const clearAll = () => setCheckedCardIds(new Set());

  const selectedCards = allCards.filter(c => checkedCardIds.has(c.id));

  const handleSaveQuiz = async () => {
    if (!saveName.trim()) return;
    setSaving(true);
    const filters = {
      tags: [...selectedTags],
      difficulties: [...selectedDifficulties],
      sources: [...selectedSources],
    };
    await api.createSavedQuiz({ name: saveName.trim(), filters });
    setSaving(false);
    setSaveOpen(false);
    setSaveName('');
    setSavedMsg('Quiz saved!');
  };

  const openSave = () => {
    setSaveOpen(true);
    setSavedMsg('');
    setTimeout(() => saveInputRef.current?.focus(), 50);
  };

  if (loading) return <div className="text-center py-12 text-gray-400">Loading...</div>;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onCancel} className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
          ← Back
        </button>
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Custom Quiz Setup</h2>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 mb-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Filters</div>
          {savedMsg ? (
            <span className="text-xs text-green-600 dark:text-green-400 font-medium">{savedMsg}</span>
          ) : saveOpen ? (
            <div className="flex items-center gap-2">
              <input
                ref={saveInputRef}
                type="text"
                value={saveName}
                onChange={e => setSaveName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSaveQuiz(); if (e.key === 'Escape') setSaveOpen(false); }}
                placeholder="Quiz name…"
                className="text-sm px-2.5 py-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-purple-500 w-36"
              />
              <button
                onClick={handleSaveQuiz}
                disabled={!saveName.trim() || saving}
                className="text-xs px-2.5 py-1 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition font-medium"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button onClick={() => setSaveOpen(false)} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                Cancel
              </button>
            </div>
          ) : (
            <button onClick={openSave} className="text-xs text-purple-600 hover:text-purple-500 font-medium">
              Save this quiz
            </button>
          )}
        </div>

        {allTags.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400">Tags</div>
            <div className="flex flex-wrap gap-1.5">
              {allTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition ${
                    selectedTags.has(tag)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}

        {allDifficulties.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400">Difficulty</div>
            <div className="flex flex-wrap gap-1.5">
              {allDifficulties.map(diff => (
                <button
                  key={diff ?? 'unrated'}
                  onClick={() => toggleDifficulty(diff)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition ${
                    selectedDifficulties.has(diff)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  {diff === null ? 'Unrated' : `★${diff}`}
                </button>
              ))}
            </div>
          </div>
        )}

        {allSources.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400">Paper</div>
            <div className="flex flex-wrap gap-1.5">
              {allSources.map(src => (
                <button
                  key={src}
                  onClick={() => toggleSource(src)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition ${
                    selectedSources.has(src)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  {src}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Card list */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Cards &mdash; {checkedCardIds.size} selected
          </div>
          <div className="flex gap-3">
            <button onClick={selectAll} className="text-xs text-blue-600 hover:text-blue-500 font-medium">
              Select All
            </button>
            <button onClick={clearAll} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 font-medium">
              Clear
            </button>
          </div>
        </div>

        <div className="overflow-y-auto max-h-96 space-y-1">
          {filteredCards.length === 0 ? (
            <div className="text-center py-6 text-gray-400 text-sm">No cards match current filters</div>
          ) : (
            filteredCards.map(card => (
              <label
                key={card.id}
                className={`flex items-start gap-3 p-2.5 rounded-lg cursor-pointer transition ${
                  checkedCardIds.has(card.id)
                    ? 'bg-blue-50 dark:bg-blue-900/20'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checkedCardIds.has(card.id)}
                  onChange={() => toggleCard(card.id)}
                  className="mt-0.5 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-800 dark:text-gray-200 line-clamp-2">
                    {card.front_type === 'image'
                      ? <img src={card.front_content} alt="" className="h-10 object-contain" />
                      : <MathContent content={card.front_content} className="math-content" />
                    }
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                    {card.source_title && (
                      <span className="text-xs text-gray-400">{card.source_title}</span>
                    )}
                    {card.difficulty != null && (
                      <span className="text-xs text-gray-400">★{card.difficulty}</span>
                    )}
                    {(card.tags || []).map(t => (
                      <span key={t} className="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-full">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </label>
            ))
          )}
        </div>
      </div>

      <button
        onClick={() => onStart(selectedCards)}
        disabled={checkedCardIds.size === 0}
        className={`w-full px-4 py-3 bg-purple-600 text-white rounded-xl font-medium text-lg transition ${
          checkedCardIds.size === 0
            ? 'opacity-50 cursor-not-allowed'
            : 'hover:bg-purple-700'
        }`}
      >
        Start Quiz ({checkedCardIds.size} cards)
      </button>
    </div>
  );
}

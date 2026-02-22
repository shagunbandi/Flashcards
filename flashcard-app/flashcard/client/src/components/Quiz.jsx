import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';
import MathContent from './MathContent';

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

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
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

  useEffect(() => {
    api.getTopics().then(t => { setTopics(t); setLoading(false); });
  }, []);

  useEffect(() => {
    if (topicId) {
      setSelectedTopic(topicId);
      startQuiz(topicId);
    }
  }, [topicId]);

  const startQuiz = async (tid) => {
    const data = await api.getCards(tid || '');
    if (data.length === 0) return;
    setCards(shuffle(data));
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
    setCards(shuffle(cards));
    setIndex(0);
    setFlipped(false);
  };

  if (loading) return <div className="text-center py-12 text-gray-400">Loading...</div>;

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
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setStarted(false)} className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">← Back</button>
        <span className="text-sm text-gray-400 font-medium">{index + 1} / {cards.length}</span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mb-6">
        <div className="bg-blue-600 h-1.5 rounded-full transition-all duration-300" style={{ width: `${((index + 1) / cards.length) * 100}%` }} />
      </div>

      <div className="mb-1 text-center text-xs text-gray-400">Tap card to flip</div>

      <FlipCard card={card} flipped={flipped} onClick={() => setFlipped(!flipped)} />

      {/* Navigation */}
      <div className="flex justify-between items-center mt-6">
        <button
          onClick={prev}
          disabled={index === 0}
          className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 disabled:opacity-30 hover:bg-gray-300 dark:hover:bg-gray-600 transition"
        >
          ← Prev
        </button>
        <button onClick={restart} className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition">
          🔀 Shuffle
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
    </div>
  );
}

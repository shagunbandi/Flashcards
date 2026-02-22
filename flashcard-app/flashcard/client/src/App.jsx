import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import TopicList from './components/TopicList';
import CardManager from './components/CardManager';
import Quiz from './components/Quiz';

function App() {
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark');
  const location = useLocation();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold flex items-center gap-2">
            🃏 <span>Flashcards</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className={`text-sm px-3 py-1.5 rounded-lg transition ${location.pathname === '/' ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-medium' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
            >
              Topics
            </Link>
            <Link
              to="/quiz"
              className={`text-sm px-3 py-1.5 rounded-lg transition ${location.pathname.startsWith('/quiz') ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-medium' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
            >
              Quiz
            </Link>
            <button
              onClick={() => setDark(!dark)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              aria-label="Toggle theme"
            >
              {dark ? '☀️' : '🌙'}
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        <Routes>
          <Route path="/" element={<TopicList />} />
          <Route path="/topics/:topicId/cards" element={<CardManager />} />
          <Route path="/quiz" element={<Quiz />} />
          <Route path="/quiz/:topicId" element={<Quiz />} />
        </Routes>
      </main>

      {/* Footer */}
      <footer className="text-center text-sm text-gray-400 dark:text-gray-600 py-6">
        Built with ⚡️ by Nitya Bot
      </footer>
    </div>
  );
}

export default App;

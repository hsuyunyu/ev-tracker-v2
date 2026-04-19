import React from 'react';
import { Sun, Moon, Upload, LogOut } from 'lucide-react';

export default function NavBar({ user, darkMode, onToggleDark, onSignOut, onImportClick, importing }) {
  return (
    <nav className="bg-white dark:bg-neutral-900 border-b border-gray-200 dark:border-neutral-800 sticky top-0 z-10">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg className="w-6 h-6 text-tesla" viewBox="0 0 342 512" fill="currentColor">
            <path d="M171 0C76.5 0 0 76.5 0 171c0 62.9 34 117.9 84.7 147.9V512l86.3-86.3 86.3 86.3V318.9C308 288.9 342 233.9 342 171 342 76.5 265.5 0 171 0zm0 36c74.4 0 135 60.6 135 135S245.4 306 171 306 36 245.4 36 171 96.6 36 171 36zm0 45c-49.7 0-90 40.3-90 90h36c0-29.8 24.2-54 54-54s54 24.2 54 54h36c0-49.7-40.3-90-90-90z"/>
          </svg>
          <span className="font-semibold text-gray-900 dark:text-white tracking-wide">EV Tracker</span>
        </div>

        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-400 dark:text-neutral-500 hidden sm:block mr-2 truncate max-w-[140px]">
            {user.email}
          </span>

          <button
            onClick={onToggleDark}
            className="p-2 rounded-lg text-gray-500 dark:text-neutral-400 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
            title={darkMode ? '切換亮色模式' : '切換暗色模式'}
          >
            {darkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          <button
            onClick={onImportClick}
            disabled={importing}
            className="p-2 rounded-lg text-gray-500 dark:text-neutral-400 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors disabled:opacity-40"
            title="匯入備份 JSON"
          >
            <Upload size={16} />
          </button>

          <button
            onClick={onSignOut}
            className="p-2 rounded-lg text-gray-500 dark:text-neutral-400 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
            title="登出"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </nav>
  );
}

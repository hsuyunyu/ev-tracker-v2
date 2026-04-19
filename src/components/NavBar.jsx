import React from 'react';

export default function NavBar({ user, onSignOut, onImportClick, importing }) {
  return (
    <nav className="bg-white shadow-sm border-b sticky top-0 z-10">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">⚡</span>
          <h1 className="font-bold text-gray-800">特透費用記錄</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 hidden sm:block truncate max-w-[140px]">
            {user.email}
          </span>
          <button
            onClick={onImportClick}
            disabled={importing}
            className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
          >
            {importing ? '匯入中...' : '匯入備份'}
          </button>
          <button
            onClick={onSignOut}
            className="text-xs text-red-500 hover:text-red-600 px-2 py-1 rounded-lg border border-red-200 hover:bg-red-50"
          >
            登出
          </button>
        </div>
      </div>
    </nav>
  );
}

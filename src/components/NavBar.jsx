import React from 'react';
import { Sun, Moon, Upload, LogOut } from 'lucide-react';
import BrandMark from './BrandMark';

export default function NavBar({ user, darkMode, onToggleDark, onSignOut, onImportClick, importing }) {
  const iconBtn =
    'p-2 rounded-full text-ww-sub hover:text-ww-ink hover:bg-ww-seg transition-colors disabled:opacity-40';

  return (
    <nav className="bg-ww-barbg/95 backdrop-blur border-b border-ww-line sticky top-0 z-30 ww-safe-top">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BrandMark size={26} />
          <span className="font-semibold text-ww-ink tracking-wide">WattWise</span>
        </div>

        <div className="flex items-center gap-0.5">
          <span className="text-xs text-ww-sub hidden sm:block mr-2 truncate max-w-[140px]">
            {user.email}
          </span>

          <button onClick={onToggleDark} className={iconBtn} title={darkMode ? '切換亮色模式' : '切換暗色模式'}>
            {darkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          <button onClick={onImportClick} disabled={importing} className={iconBtn} title="匯入備份 JSON">
            <Upload size={16} />
          </button>

          <button onClick={onSignOut} className={iconBtn} title="登出">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </nav>
  );
}

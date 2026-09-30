import React, { useState } from 'react';
import { Download, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showModal, setShowModal] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-amber-500/60 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        title="Install StaticDock as a standalone offline desktop or mobile app"
      >
        <Download className="w-3.5 h-3.5 text-amber-400" />
        <span>Install Offline App</span>
      </button>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-1.5 rounded-md border border-slate-800 bg-slate-900/80 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-slate-700 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        title="Install StaticDock for offline standalone use"
      >
        <Download className="w-3.5 h-3.5 text-amber-400" />
        <span>{isIOS ? 'Install on iOS' : 'Install PWA'}</span>
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-md rounded-lg border border-slate-800 bg-[#0f1623] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-semibold text-slate-100">
                Install StaticDock Offline Runtime
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-sm text-slate-300 leading-relaxed">
              <p>
                StaticDock precaches all application shells, compilers, and IndexedDB workspaces via Service Worker so you can host and preview HTML files with zero internet connectivity.
              </p>
              {isIOS ? (
                <div className="rounded-md border border-slate-800 bg-slate-950 p-3.5 text-xs space-y-2">
                  <p className="font-semibold text-slate-200">iOS Safari Installation:</p>
                  <p>1. Tap the <strong>Share</strong> button in the Safari toolbar.</p>
                  <p>2. Scroll down and select <strong>Add to Home Screen</strong>.</p>
                </div>
              ) : (
                <div className="rounded-md border border-slate-800 bg-slate-950 p-3.5 text-xs space-y-2">
                  <p className="font-semibold text-slate-200">Desktop / Chromium Installation:</p>
                  <p>
                    1. Open this app in a top-level browser tab (outside any preview iframe).
                  </p>
                  <p>
                    2. Click the <strong>Install StaticDock</strong> icon in your browser address bar, or deploy the built <code>dist/</code> folder directly to GitHub Pages.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="rounded-md bg-amber-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-amber-400 transition-colors cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

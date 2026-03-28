import { useState } from 'react';
import { Key, ExternalLink, Eye, EyeOff, X, Settings } from 'lucide-react';

interface ApiKeyModalProps {
  onSave: (key: string) => void;
  existingKey?: string;
}

export function ApiKeyModal({ onSave, existingKey }: ApiKeyModalProps) {
  const sanitize = (v: string) => v.replace(/[^\x20-\x7E]/g, '').trim();
  const [key, setKey] = useState(sanitize(existingKey || ''));
  const [show, setShow] = useState(false);

  const isFirstTime = !existingKey;
  const hasChanged = sanitize(key) !== sanitize(existingKey || '');

  const handleSave = () => {
    const safe = sanitize(key);
    if (safe) onSave(safe);
  };

  const handleClose = () => {
    // Only allow closing if there's already a valid key saved
    if (existingKey) onSave(existingKey);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 w-full max-w-md shadow-2xl relative">

        {/* Close button — only shown when an existing key is set */}
        {!isFirstTime && (
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 w-7 h-7 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 flex items-center justify-center text-gray-400 hover:text-gray-200 transition-all"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-amber-500 flex items-center justify-center">
            {isFirstTime ? (
              <span className="text-2xl">🎰</span>
            ) : (
              <Settings className="w-6 h-6 text-white" />
            )}
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">
              {isFirstTime ? 'SlotMind AI' : 'System Settings'}
            </h2>
            <p className="text-gray-400 text-sm">
              {isFirstTime ? 'Casino Slot Design Panel' : 'API key & connection'}
            </p>
          </div>
        </div>

        {/* API Key input */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Key className="w-4 h-4 text-amber-400" />
            <label className="text-sm font-medium text-gray-300">OpenRouter API Key</label>
          </div>
          <div className="relative">
            <input
              type={show ? 'text' : 'password'}
              value={key}
              onChange={(e) => setKey(sanitize(e.target.value))}
              placeholder="sk-or-v1-..."
              className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 pr-12"
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              onPaste={(e) => {
                e.preventDefault();
                const pasted = e.clipboardData.getData('text');
                setKey(sanitize(pasted));
              }}
            />
            <button
              onClick={() => setShow(!show)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
            >
              {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Status indicator for existing key */}
          {!isFirstTime && (
            <div className="mt-2 flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${existingKey ? 'bg-green-400' : 'bg-red-400'}`} />
              <p className="text-xs text-gray-500">
                {existingKey
                  ? hasChanged
                    ? 'New key entered — save to apply'
                    : 'Key active · stored locally in your browser'
                  : 'No key saved yet'}
              </p>
            </div>
          )}
          {isFirstTime && (
            <p className="text-xs text-gray-500 mt-2">
              Your key is stored locally in your browser and never sent anywhere except OpenRouter.
            </p>
          )}
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={!key.trim()}
          className="w-full bg-gradient-to-r from-purple-600 to-amber-500 text-white font-semibold py-3 rounded-xl hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          {isFirstTime ? 'Enter the Panel Room' : hasChanged ? 'Save New Key' : 'Confirm & Close'}
        </button>

        {/* Link to get key */}
        <div className="mt-4 flex items-center justify-center gap-1 text-xs text-gray-500">
          <span>Get your API key at</span>
          <a
            href="https://openrouter.ai/keys"
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-400 hover:text-purple-300 flex items-center gap-1"
          >
            openrouter.ai/keys
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}

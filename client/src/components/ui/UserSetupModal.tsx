import React, { useState } from 'react';
import { setUsername } from '../../lib/user';
import { Music2 } from 'lucide-react';

interface Props {
  onComplete: (name: string) => void;
}

export function UserSetupModal({ onComplete }: Props) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Please enter a name');
      return;
    }
    if (trimmed.length < 2) {
      setError('Name must be at least 2 characters');
      return;
    }
    setUsername(trimmed);
    onComplete(trimmed);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="glass-card w-full max-w-sm mx-4 animate-slide-up">
        <div className="flex flex-col items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-accent-600/20 border border-accent-500/30 flex items-center justify-center">
            <Music2 className="text-accent-400" size={28} />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-semibold text-white">Welcome to ChordSync</h1>
            <p className="text-slate-400 text-sm mt-1">What should we call you?</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            id="username-input"
            type="text"
            className="input"
            placeholder="Your display name"
            value={name}
            onChange={(e) => { setName(e.target.value); setError(''); }}
            autoFocus
            maxLength={32}
          />
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <button type="submit" className="btn-primary justify-center py-3">
            Get Started
          </button>
        </form>
      </div>
    </div>
  );
}

import { ChevronUp, ChevronDown, RotateCcw, ZoomIn, ZoomOut, PlayCircle, StopCircle, Minus, Plus } from 'lucide-react';
import { KeySelector } from './KeySelector';

interface Props {
  originalKey: string | null;
  selectedKey: string | null;
  onKeyChange: (key: string, semitoneOffset: number) => void;
  transposeOffset: number;
  onTransposeChange: (offset: number) => void;
  fontSize: number;
  onFontSizeChange: (size: number) => void;
  autoscroll: boolean;
  autoscrollSpeed: number;
  onAutoscrollToggle: () => void;
  onAutoscrollSpeedChange: (speed: number) => void;
}

export function SongControls({
  originalKey,
  selectedKey,
  onKeyChange,
  transposeOffset,
  onTransposeChange,
  fontSize,
  onFontSizeChange,
  autoscroll,
  autoscrollSpeed,
  onAutoscrollToggle,
  onAutoscrollSpeedChange,
}: Props) {
  return (
    <div className="glass rounded-2xl p-3 space-y-3">
      {/* Row 1: Key selector + capo suggestions */}
      <KeySelector
        originalKey={originalKey}
        selectedKey={selectedKey}
        onKeyChange={onKeyChange}
      />

      {/* Row 2: Fine transpose + font size + autoscroll */}
      <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-white/[0.06]">
        {/* Fine-tune transpose (semitones) */}
        <div className="flex items-center gap-2">
          <span className="text-slate-500 text-[11px] font-medium">Fine</span>
          <div className="flex items-center gap-1">
            <button
              id="transpose-down"
              onClick={() => onTransposeChange(transposeOffset - 1)}
              className="btn-ghost p-1.5 rounded-lg"
              title="−1 semitone"
            >
              <ChevronDown size={14} />
            </button>
            <span className="text-white font-mono text-xs w-7 text-center">
              {transposeOffset > 0 ? `+${transposeOffset}` : transposeOffset}
            </span>
            <button
              id="transpose-up"
              onClick={() => onTransposeChange(transposeOffset + 1)}
              className="btn-ghost p-1.5 rounded-lg"
              title="+1 semitone"
            >
              <ChevronUp size={14} />
            </button>
            {transposeOffset !== 0 && (
              <button
                id="transpose-reset"
                onClick={() => onTransposeChange(0)}
                className="btn-ghost p-1.5 rounded-lg text-slate-500"
                title="Reset semitone offset"
              >
                <RotateCcw size={12} />
              </button>
            )}
          </div>
        </div>

        <div className="w-px h-4 bg-white/10" />

        {/* Font size */}
        <div className="flex items-center gap-2">
          <span className="text-slate-500 text-[11px] font-medium">Size</span>
          <div className="flex items-center gap-1">
            <button
              id="font-decrease"
              onClick={() => onFontSizeChange(Math.max(10, fontSize - 1))}
              className="btn-ghost p-1.5 rounded-lg"
            >
              <ZoomOut size={14} />
            </button>
            <span className="text-white font-mono text-xs w-5 text-center">{fontSize}</span>
            <button
              id="font-increase"
              onClick={() => onFontSizeChange(Math.min(24, fontSize + 1))}
              className="btn-ghost p-1.5 rounded-lg"
            >
              <ZoomIn size={14} />
            </button>
          </div>
        </div>

        <div className="w-px h-4 bg-white/10" />

        {/* Autoscroll */}
        <div className="flex items-center gap-2">
          <button
            id="autoscroll-toggle"
            onClick={onAutoscrollToggle}
            className={`btn text-xs py-1.5 px-3 rounded-xl gap-1.5 ${
              autoscroll
                ? 'bg-accent-600/30 border border-accent-500/50 text-accent-400'
                : 'btn-ghost'
            }`}
          >
            {autoscroll ? <StopCircle size={13} /> : <PlayCircle size={13} />}
            {autoscroll ? 'Stop' : 'Autoscroll'}
          </button>
          {autoscroll && (
            <div className="flex items-center gap-1">
              <Minus size={11} className="text-slate-500" />
              <input
                type="range"
                min={10}
                max={100}
                step={5}
                value={autoscrollSpeed}
                onChange={(e) => onAutoscrollSpeedChange(Number(e.target.value))}
                className="w-16 accent-accent-500 h-1"
              />
              <Plus size={11} className="text-slate-500" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

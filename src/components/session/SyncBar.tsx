import { Crown, Wifi, WifiOff, RotateCcw } from 'lucide-react';
import type { SessionState } from '../../lib/types';
import { getUserId } from '../../lib/user';

interface Props {
  sessionState: SessionState | null;
  isConnected: boolean;
  isFollowing: boolean;
  onClaimLeader: () => void;
  onBackToSync: () => void;
}

export function SyncBar({ sessionState, isConnected, isFollowing, onClaimLeader, onBackToSync }: Props) {
  const userId = getUserId();
  const isLeader = sessionState?.leaderUserId === userId;
  const hasLeader = !!sessionState?.leaderUserId;

  return (
    <div className={`glass rounded-2xl px-4 py-2.5 flex items-center justify-between gap-4
                    ${isLeader ? 'border-gold-500/30' : 'border-white/10'}`}>
      <div className="flex items-center gap-3">
        {/* Connection indicator */}
        <div className={`flex items-center gap-1.5 text-xs ${isConnected ? 'text-success' : 'text-slate-500'}`}>
          {isConnected ? <Wifi size={13} /> : <WifiOff size={13} />}
          <span className="hidden sm:inline">{isConnected ? 'Live' : 'Offline'}</span>
        </div>

        {/* Leader info */}
        {hasLeader && (
          <div className="flex items-center gap-1.5">
            <Crown size={13} className="text-gold-400" />
            <span className="text-xs text-slate-400">
              {isLeader ? (
                <span className="text-gold-400 font-medium">You're leading</span>
              ) : (
                <>
                  Following <span className="text-slate-300">{sessionState?.leaderUserName}</span>
                </>
              )}
            </span>
          </div>
        )}

        {!hasLeader && (
          <span className="text-xs text-slate-500">No leader — anyone can take control</span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Back to sync button (for followers who scrolled away) */}
        {!isLeader && !isFollowing && hasLeader && (
          <button
            id="back-to-sync"
            onClick={onBackToSync}
            className="btn-ghost text-xs py-1 px-2.5 gap-1"
          >
            <RotateCcw size={12} />
            Back to sync
          </button>
        )}

        {/* Take control */}
        {!isLeader && (
          <button
            id="claim-leader"
            onClick={onClaimLeader}
            className="btn text-xs py-1 px-3 bg-gold-500/20 border border-gold-500/30 text-gold-400
                       hover:bg-gold-500/30 hover:text-gold-300"
          >
            <Crown size={12} />
            Take control
          </button>
        )}
      </div>
    </div>
  );
}

import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Playlist, PlaylistItem } from '../../lib/types';
import { api } from '../../lib/api';
import { GripVertical, Trash2, Music, ExternalLink, Play } from 'lucide-react';

interface Props {
  playlist: Playlist;
  onItemClick: (item: PlaylistItem) => void;
  onReorder: (updatedItems: PlaylistItem[]) => void;
  onRemove: (itemId: string) => void;
  activeItemId?: string | null;
}

export function PlaylistPanel({ playlist, onItemClick, onReorder, onRemove, activeItemId }: Props) {
  const [items, setItems] = useState<PlaylistItem[]>(playlist.items);
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Sync items when playlist prop changes
  if (playlist.items !== items && playlist.items.length !== items.length) {
    setItems(playlist.items);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);

    const reordered = [...items];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);
    setItems(reordered);
    onReorder(reordered);

    try {
      await api.reorderPlaylistItem(playlist.id, active.id as string, newIndex);
    } catch (err) {
      console.error('Reorder failed:', err);
    }
  }

  async function handleRemove(itemId: string) {
    try {
      await api.removeFromPlaylist(playlist.id, itemId);
      setItems((prev) => prev.filter((i) => i.id !== itemId));
      onRemove(itemId);
    } catch (err) {
      console.error('Remove failed:', err);
    }
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        <Music size={36} className="mx-auto mb-3 opacity-30" />
        <p className="text-sm">No songs yet. Search for a song and add it here.</p>
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {items.map((item, index) => (
            <SortableItem
              key={item.id}
              item={item}
              index={index}
              isActive={activeItemId === item.id}
              onClick={() => onItemClick(item)}
              onRemove={() => handleRemove(item.id)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

interface SortableItemProps {
  item: PlaylistItem;
  index: number;
  isActive: boolean;
  onClick: () => void;
  onRemove: () => void;
}

function SortableItem({ item, index, isActive, onClick, onRemove }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`glass rounded-xl flex items-center gap-3 px-3 py-3 group
                  ${isActive ? 'border-accent-500/60 bg-accent-600/10' : 'hover:border-white/20 hover:bg-white/5'}
                  transition-all`}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="text-slate-600 hover:text-slate-400 cursor-grab active:cursor-grabbing p-1 rounded"
        aria-label="Drag to reorder"
      >
        <GripVertical size={16} />
      </button>

      {/* Index */}
      <span className="text-slate-600 text-xs font-mono w-5 text-center">{index + 1}</span>

      {/* Song info */}
      <div
        className="flex-1 min-w-0 cursor-pointer"
        onClick={onClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onClick()}
      >
        <p className={`text-sm font-medium truncate transition-colors ${isActive ? 'text-accent-400' : 'text-white group-hover:text-accent-400'}`}>
          {item.title}
        </p>
        <p className="text-slate-500 text-xs mt-0.5 truncate">{item.artist}</p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <span className={item.source === 'chordlanka' ? 'badge-cl' : 'badge-ug'}>
          {item.source === 'chordlanka' ? 'CL' : 'UG'}
        </span>
        <a
          href={item.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="btn-ghost p-1.5"
          title="Open source"
        >
          <ExternalLink size={12} />
        </a>
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="btn-danger p-1.5"
          title="Remove from playlist"
        >
          <Trash2 size={12} />
        </button>
      </div>

      {/* Active indicator */}
      {isActive && (
        <div className="flex-shrink-0">
          <Play size={14} className="text-accent-400 fill-accent-400 animate-pulse-soft" />
        </div>
      )}
    </div>
  );
}

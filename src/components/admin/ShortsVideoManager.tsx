import { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Edit3,
  Film,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import {
  extractYouTubeVideoId,
  getDefaultYouTubeThumbnail,
  isValidMediaImageUrl,
  type ShortVideoItem,
} from '../../../shared/youtube';

interface ShortsVideoManagerProps {
  token: string;
  onUnauthorized: () => void;
}

export function ShortsVideoManager({ token, onUnauthorized }: ShortsVideoManagerProps) {
  const [shorts, setShorts] = useState<ShortVideoItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Add / Edit Draft Form
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftThumbnailUrl, setDraftThumbnailUrl] = useState('');
  const [draftYoutubeUrl, setDraftYoutubeUrl] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const loadVideos = useCallback(
    async (signal?: AbortSignal) => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const res = await fetch('/api/admin/videos', {
          signal,
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (res.status === 401) {
          onUnauthorized();
          return;
        }
        const data = await res.json().catch(() => null);
        if (!res.ok || !Array.isArray(data?.shorts)) {
          setLoadError(data?.error ?? 'Failed to load App Screenshots Shorts videos.');
          return;
        }
        setShorts(data.shorts as ShortVideoItem[]);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setLoadError('Network error while loading Shorts settings.');
      } finally {
        if (!signal?.aborted) {
          setIsLoading(false);
        }
      }
    },
    [token, onUnauthorized]
  );

  useEffect(() => {
    const controller = new AbortController();
    loadVideos(controller.signal);
    return () => controller.abort();
  }, [loadVideos]);

  const persistShortsList = async (nextList: ShortVideoItem[], message: string) => {
    setIsSaving(true);
    setSaveError(null);
    setSaveMessage(null);
    try {
      const res = await fetch('/api/admin/videos/shorts', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ shorts: nextList }),
      });
      if (res.status === 401) {
        onUnauthorized();
        return false;
      }
      const data = await res.json().catch(() => null);
      if (!res.ok || !Array.isArray(data?.shorts)) {
        setSaveError(data?.error ?? 'Failed to save Shorts changes.');
        return false;
      }
      setShorts(data.shorts as ShortVideoItem[]);
      setSaveMessage(message);
      window.setTimeout(() => setSaveMessage(null), 2500);
      return true;
    } catch {
      setSaveError('Network error while saving Shorts.');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setDraftTitle('');
    setDraftThumbnailUrl('');
    setDraftYoutubeUrl('');
    setFormError(null);
  };

  const handleAddOrUpdateDraft = async () => {
    setFormError(null);
    const cleanThumb = draftThumbnailUrl.trim();
    const cleanYoutube = draftYoutubeUrl.trim();
    const cleanTitle = draftTitle.trim();

    if (!isValidMediaImageUrl(cleanThumb)) {
      setFormError('Please enter a valid Thumbnail Image URL (https:// or /...).');
      return;
    }

    if (!extractYouTubeVideoId(cleanYoutube)) {
      setFormError(
        'Please enter a valid YouTube Shorts URL (e.g., https://youtube.com/shorts/...).'
      );
      return;
    }

    let nextList: ShortVideoItem[];
    if (editingId) {
      nextList = shorts.map((item, idx) =>
        item.id === editingId
          ? {
              ...item,
              title: cleanTitle || `App Short #${idx + 1}`,
              thumbnailUrl: cleanThumb,
              youtubeUrl: cleanYoutube,
            }
          : item
      );
    } else {
      const newItem: ShortVideoItem = {
        id: `short-${Date.now()}`,
        title: cleanTitle || `App Short #${shorts.length + 1}`,
        thumbnailUrl: cleanThumb,
        youtubeUrl: cleanYoutube,
      };
      nextList = [...shorts, newItem];
    }

    const ok = await persistShortsList(
      nextList,
      editingId ? 'Short updated and published live.' : 'New Short added and published live.'
    );
    if (ok) {
      resetForm();
    }
  };

  const handleStartEdit = (item: ShortVideoItem) => {
    setEditingId(item.id);
    setDraftTitle(item.title);
    setDraftThumbnailUrl(item.thumbnailUrl);
    setDraftYoutubeUrl(item.youtubeUrl);
    setFormError(null);
    setSaveError(null);
  };

  const handleDeleteShort = async (id: string) => {
    if (isSaving) return;
    const nextList = shorts.filter((item) => item.id !== id);
    const ok = await persistShortsList(nextList, 'Short removed.');
    if (ok && editingId === id) {
      resetForm();
    }
  };

  const handleManualSaveAll = async () => {
    await persistShortsList(shorts, 'All App Screenshots Shorts saved.');
  };

  const detectedYoutubeId = extractYouTubeVideoId(draftYoutubeUrl);

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/85 py-14 flex flex-col items-center justify-center gap-2 text-[#5F6368]">
        <Loader2 className="w-6 h-6 animate-spin text-[#1A73E8]" />
        <span className="text-[13px]">Loading App Screenshots video settings...</span>
      </div>
    );
  }

  if (loadError) {
    return (
      <div
        role="alert"
        className="rounded-2xl bg-red-50 border border-red-200 p-4 flex items-center justify-between gap-3 text-[13px] text-red-700"
      >
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{loadError}</span>
        </div>
        <button
          type="button"
          onClick={() => loadVideos()}
          className="px-3 py-1.5 rounded-full bg-white border border-red-200 font-semibold text-red-700 hover:bg-red-100 cursor-pointer shrink-0 inline-flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200/85 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="font-display font-bold text-[15.5px] text-[#1F1F1F]">
            App Screenshots Video Management (YouTube Shorts)
          </h2>
          <p className="text-[12.5px] text-[#5F6368] mt-0.5">
            Add YouTube Shorts with custom thumbnails. When Shorts are added, they replace the
            static screenshots in the App Screenshots slider and play inside a popup player on click.
          </p>
        </div>
        <button
          type="button"
          disabled={isSaving}
          onClick={handleManualSaveAll}
          className="px-4 min-h-[38px] rounded-full bg-[#1A73E8] hover:bg-[#0D5BD9] text-white font-display font-semibold text-[12.5px] inline-flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-60"
        >
          {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          <span>Save Changes</span>
        </button>
      </div>

      {saveMessage && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3.5 py-2.5 text-[12.5px] font-semibold text-emerald-700 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{saveMessage}</span>
        </div>
      )}

      {saveError && (
        <div
          role="alert"
          className="rounded-xl bg-red-50 border border-red-200 px-3.5 py-2.5 text-[12.5px] text-red-700 flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Add / Edit Form */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/85 p-4 sm:p-5 space-y-3.5 h-fit">
          <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
            <h3 className="font-display font-bold text-[14.5px] text-[#1F1F1F]">
              {editingId ? 'Edit YouTube Short' : 'Add YouTube Short'}
            </h3>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="text-[12px] font-semibold text-[#5F6368] hover:text-[#1F1F1F] inline-flex items-center gap-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Cancel Edit</span>
              </button>
            )}
          </div>

          <div>
            <label className="block text-[12px] font-medium text-[#3C4043] mb-1">
              YouTube Shorts Video URL <span className="text-[#D93025]">*</span>
            </label>
            <input
              type="url"
              value={draftYoutubeUrl}
              onChange={(e) => {
                setDraftYoutubeUrl(e.target.value);
                setFormError(null);
              }}
              placeholder="https://www.youtube.com/shorts/XXXXXXXXXXX"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-[13px] text-[#1F1F1F] focus:outline-none focus:border-[#1A73E8]"
            />
            {detectedYoutubeId && (
              <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-emerald-700 font-medium">
                <span>Detected YouTube ID: {detectedYoutubeId}</span>
                {!draftThumbnailUrl.trim() && (
                  <button
                    type="button"
                    onClick={() => {
                      const thumb = getDefaultYouTubeThumbnail(draftYoutubeUrl);
                      if (thumb) setDraftThumbnailUrl(thumb);
                    }}
                    className="text-[#1A73E8] hover:underline font-semibold cursor-pointer"
                  >
                    Use YT Thumbnail
                  </button>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-[12px] font-medium text-[#3C4043] mb-1">
              Thumbnail Image URL <span className="text-[#D93025]">*</span>
            </label>
            <input
              type="url"
              value={draftThumbnailUrl}
              onChange={(e) => {
                setDraftThumbnailUrl(e.target.value);
                setFormError(null);
              }}
              placeholder="https://example.com/shorts-thumb.jpg"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-[13px] text-[#1F1F1F] focus:outline-none focus:border-[#1A73E8]"
            />
          </div>

          <div>
            <label className="block text-[12px] font-medium text-[#3C4043] mb-1">
              Short Title <span className="text-[#5F6368] font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              placeholder="e.g., Dashboard Overview Short"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-[13px] text-[#1F1F1F] focus:outline-none focus:border-[#1A73E8]"
            />
          </div>

          {formError && (
            <div
              role="alert"
              className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-[12px] text-red-700 flex items-start gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          <button
            type="button"
            disabled={isSaving}
            onClick={handleAddOrUpdateDraft}
            className="w-full min-h-[42px] px-4 rounded-full bg-[#1A73E8] hover:bg-[#0D5BD9] text-white font-display font-semibold text-[13px] inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : editingId ? (
              <Save className="w-4 h-4" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            <span>{editingId ? 'Update & Save Short' : 'Add & Save Short'}</span>
          </button>
        </div>

        {/* Configured Shorts List */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/85 p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
            <h3 className="font-display font-bold text-[14.5px] text-[#1F1F1F]">
              Saved Shorts ({shorts.length})
            </h3>
            <span className="text-[11.5px] text-[#5F6368]">
              {shorts.length === 0 ? 'Using default screenshot gallery' : 'Live on storefront'}
            </span>
          </div>

          {shorts.length === 0 ? (
            <div className="py-10 text-center space-y-2 text-[#5F6368]">
              <Film className="w-8 h-8 text-slate-300 mx-auto" />
              <div className="font-display font-semibold text-[13.5px] text-[#1F1F1F]">
                No YouTube Shorts added yet
              </div>
              <p className="text-[12px] max-w-xs mx-auto">
                Add a YouTube Shorts link and Thumbnail URL on the left to display playable Shorts
                in the App Screenshots slider.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {shorts.map((item, idx) => (
                <div
                  key={item.id}
                  className={`rounded-xl border p-3 flex items-center gap-3 ${
                    editingId === item.id
                      ? 'border-[#1A73E8] bg-blue-50/40'
                      : 'border-slate-200/85 bg-slate-50/40'
                  }`}
                >
                  <div className="w-12 aspect-[9/16] rounded-lg overflow-hidden bg-slate-900 shrink-0 border border-slate-200">
                    <img
                      src={item.thumbnailUrl}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="font-display font-bold text-[13.5px] text-[#1F1F1F] truncate">
                      {idx + 1}. {item.title}
                    </div>
                    <div className="text-[11.5px] text-[#1A73E8] truncate font-mono">
                      {item.youtubeUrl}
                    </div>
                    <div className="text-[11px] text-[#5F6368] truncate">
                      Thumb: {item.thumbnailUrl}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleStartEdit(item)}
                      aria-label={`Edit ${item.title}`}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[12px] font-semibold text-[#1F1F1F] inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Edit</span>
                    </button>
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => handleDeleteShort(item.id)}
                      aria-label={`Delete ${item.title}`}
                      className="px-2.5 py-1.5 rounded-lg border border-red-200 bg-white hover:bg-red-50 text-[12px] font-semibold text-[#D93025] inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

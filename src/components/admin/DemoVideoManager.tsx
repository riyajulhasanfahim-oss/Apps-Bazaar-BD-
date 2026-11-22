import { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Play,
  RefreshCw,
  Save,
  Trash2,
} from 'lucide-react';
import {
  extractYouTubeVideoId,
  getDefaultYouTubeThumbnail,
  isValidMediaImageUrl,
  type DemoVideoItem,
} from '../../../shared/youtube';

interface DemoVideoManagerProps {
  token: string;
  onUnauthorized: () => void;
}

export function DemoVideoManager({ token, onUnauthorized }: DemoVideoManagerProps) {
  const [savedVideo, setSavedVideo] = useState<DemoVideoItem | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const loadDemoVideo = useCallback(
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
        if (!res.ok || !data) {
          setLoadError(data?.error ?? 'Failed to load Demo Video settings.');
          return;
        }
        const demo = (data.demoVideo ?? null) as DemoVideoItem | null;
        setSavedVideo(demo);
        setTitle(demo?.title ?? '');
        setDescription(demo?.description ?? '');
        setThumbnailUrl(demo?.thumbnailUrl ?? '');
        setYoutubeUrl(demo?.youtubeUrl ?? '');
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setLoadError('Network error while loading Demo Video settings.');
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
    loadDemoVideo(controller.signal);
    return () => controller.abort();
  }, [loadDemoVideo]);

  const handleSave = async () => {
    if (isSaving) return;
    setFormError(null);
    setSaveMessage(null);

    const cleanThumb = thumbnailUrl.trim();
    const cleanYoutube = youtubeUrl.trim();

    if (!isValidMediaImageUrl(cleanThumb)) {
      setFormError('Please enter a valid Thumbnail Image URL (https:// or /...).');
      return;
    }

    if (!extractYouTubeVideoId(cleanYoutube)) {
      setFormError(
        'Please enter a valid YouTube Video URL (e.g., https://www.youtube.com/watch?v=... or https://youtu.be/...).'
      );
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/videos/demo', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          demoVideo: {
            title: title.trim(),
            description: description.trim(),
            thumbnailUrl: cleanThumb,
            youtubeUrl: cleanYoutube,
          },
        }),
      });
      if (res.status === 401) {
        onUnauthorized();
        return;
      }
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.demoVideo) {
        setFormError(data?.error ?? 'Failed to save Video Demo settings.');
        return;
      }
      const updated = data.demoVideo as DemoVideoItem;
      setSavedVideo(updated);
      setTitle(updated.title);
      setDescription(updated.description);
      setThumbnailUrl(updated.thumbnailUrl);
      setYoutubeUrl(updated.youtubeUrl);
      setSaveMessage('Video Demo & Review saved and published live.');
      window.setTimeout(() => setSaveMessage(null), 2500);
    } catch {
      setFormError('Network error while saving Demo Video.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (isSaving) return;
    setFormError(null);
    setSaveMessage(null);
    setIsSaving(true);

    try {
      const res = await fetch('/api/admin/videos/demo', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.status === 401) {
        onUnauthorized();
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setFormError(data?.error ?? 'Failed to delete Demo Video.');
        return;
      }
      setSavedVideo(null);
      setTitle('');
      setDescription('');
      setThumbnailUrl('');
      setYoutubeUrl('');
      setSaveMessage('Custom Demo Video removed. Reverted to default banner.');
      window.setTimeout(() => setSaveMessage(null), 2500);
    } catch {
      setFormError('Network error while removing Demo Video.');
    } finally {
      setIsSaving(false);
    }
  };

  const detectedYoutubeId = extractYouTubeVideoId(youtubeUrl);

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/85 py-14 flex flex-col items-center justify-center gap-2 text-[#5F6368]">
        <Loader2 className="w-6 h-6 animate-spin text-[#1A73E8]" />
        <span className="text-[13px]">Loading Video Demo &amp; Review settings...</span>
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
          onClick={() => loadDemoVideo()}
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
      <div className="bg-white rounded-2xl border border-slate-200/85 p-4">
        <h2 className="font-display font-bold text-[15.5px] text-[#1F1F1F]">
          Video Demo &amp; Review Management (YouTube Long Video)
        </h2>
        <p className="text-[12.5px] text-[#5F6368] mt-0.5">
          Configure the YouTube Long Video and custom Thumbnail Image shown in the Video Demo /
          Review section on the product page.
        </p>
      </div>

      {saveMessage && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3.5 py-2.5 text-[12.5px] font-semibold text-emerald-700 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{saveMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Form Card */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/85 p-4 sm:p-5 space-y-3.5">
          <div>
            <label className="block text-[12px] font-medium text-[#3C4043] mb-1">
              YouTube Video URL <span className="text-[#D93025]">*</span>
            </label>
            <input
              type="url"
              value={youtubeUrl}
              onChange={(e) => {
                setYoutubeUrl(e.target.value);
                setFormError(null);
              }}
              placeholder="https://www.youtube.com/watch?v=XXXXXXXXXXX"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-[13px] text-[#1F1F1F] focus:outline-none focus:border-[#1A73E8]"
            />
            {detectedYoutubeId && (
              <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-emerald-700 font-medium">
                <span>Detected YouTube ID: {detectedYoutubeId}</span>
                {!thumbnailUrl.trim() && (
                  <button
                    type="button"
                    onClick={() => {
                      const thumb = getDefaultYouTubeThumbnail(youtubeUrl);
                      if (thumb) setThumbnailUrl(thumb);
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
              value={thumbnailUrl}
              onChange={(e) => {
                setThumbnailUrl(e.target.value);
                setFormError(null);
              }}
              placeholder="https://example.com/demo-thumbnail.jpg"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-[13px] text-[#1F1F1F] focus:outline-none focus:border-[#1A73E8]"
            />
          </div>

          <div>
            <label className="block text-[12px] font-medium text-[#3C4043] mb-1">
              Video Title <span className="text-[#5F6368] font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ad Earning — Full App Walkthrough"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-[13px] text-[#1F1F1F] focus:outline-none focus:border-[#1A73E8]"
            />
          </div>

          <div>
            <label className="block text-[12px] font-medium text-[#3C4043] mb-1">
              Short Description <span className="text-[#5F6368] font-normal">(Optional)</span>
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Watch a quick tour of the dark-blue interface, ad viewing flow, and wallet layout."
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

          <div className="pt-1 flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSave}
              className="flex-1 min-w-[160px] min-h-[42px] px-4 rounded-full bg-[#1A73E8] hover:bg-[#0D5BD9] text-white font-display font-semibold text-[13px] inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{savedVideo ? 'Update & Save Video' : 'Add & Save Video'}</span>
            </button>

            {savedVideo && (
              <button
                type="button"
                disabled={isSaving}
                onClick={handleDelete}
                className="min-h-[42px] px-4 rounded-full border border-red-200 bg-white hover:bg-red-50 text-[#D93025] font-display font-semibold text-[13px] inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Video</span>
              </button>
            )}
          </div>
        </div>

        {/* Live Preview Card */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/85 p-4 sm:p-5 space-y-3 h-fit">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
            <h3 className="font-display font-bold text-[14.5px] text-[#1F1F1F]">
              Thumbnail Preview
            </h3>
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                savedVideo
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
            >
              {savedVideo ? 'Live Custom Video' : 'Default Banner'}
            </span>
          </div>

          <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 flex items-center justify-center">
            {isValidMediaImageUrl(thumbnailUrl) ? (
              <>
                <img
                  src={thumbnailUrl.trim()}
                  alt={title || 'Demo Video Thumbnail Preview'}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-slate-950/20">
                  <div className="w-11 h-11 rounded-full bg-slate-950/65 border border-white/50 flex items-center justify-center text-white">
                    <Play className="w-5 h-5 fill-white ml-0.5" />
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center p-4 text-slate-400 text-[12.5px]">
                Enter a Thumbnail Image URL to preview how it will appear in the Video Demo /
                Review card.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

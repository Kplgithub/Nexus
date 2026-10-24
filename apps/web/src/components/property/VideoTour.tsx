import { youtubeId } from '@nexus/shared';

/** YouTube embed on the privacy-enhanced domain; nothing loads until the frame is visible. */
export function VideoTour({ url, title }: { url: string; title: string }) {
  const id = youtubeId(url);
  if (!id) return null;
  return (
    <div className="relative aspect-video overflow-hidden rounded-xl bg-ink">
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${id}?rel=0`}
        title={`Video tour: ${title}`}
        loading="lazy"
        allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        className="absolute inset-0 size-full"
      />
    </div>
  );
}

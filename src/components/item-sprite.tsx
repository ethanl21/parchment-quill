import { useEffect, useState } from "react";
import { resolveItemSprite } from "../lib/sprites";

function Placeholder({ itemId }: { itemId: string }) {
  return (
    <div className="inline-block rounded border border-dashed border-stone-400 bg-stone-100 px-3 py-2 text-center">
      <p className="font-mono text-[11px] text-stone-500">{itemId}</p>
    </div>
  );
}

export function ItemSprite({ itemId, scale }: { itemId: string; scale?: number }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    void resolveItemSprite(itemId).then((u) => {
      if (live) setUrl(u);
    });
    return () => {
      live = false;
    };
  }, [itemId]);
  if (!url) return <Placeholder itemId={itemId} />;
  const size = 16 * (scale ?? 1);
  return (
    <img
      src={url}
      alt={itemId}
      width={size}
      height={size}
      draggable={false}
      className="inline [image-rendering:pixelated]"
    />
  );
}

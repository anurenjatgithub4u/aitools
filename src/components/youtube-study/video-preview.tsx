"use client"

/* eslint-disable @next/next/no-img-element */

import { CheckCircle2, Clock, RotateCcw, Zap } from "lucide-react"
import type { VideoMetadata } from "@/lib/youtube-study/types"
import { formatDuration } from "@/lib/youtube-study/url"

// The preview that follows validation (spec §6). Its job is to let the user
// confirm we found the right video before anything expensive happens.
//
// Thumbnails come from i.ytimg.com and are plain <img> rather than next/image:
// adding a remote pattern to next.config for one decorative image isn't worth
// the coupling, and these are already correctly sized by YouTube.

interface VideoPreviewProps {
  metadata: VideoMetadata
  cached: boolean
  isShort?: boolean
  onReplace: () => void
}

export function VideoPreview({ metadata, cached, isShort, onReplace }: VideoPreviewProps) {
  return (
    <div className="rounded-2xl border border-border bg-background p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative shrink-0 overflow-hidden rounded-xl bg-secondary sm:w-56">
          <img
            src={metadata.thumbnailUrl}
            alt=""
            className="h-32 w-full object-cover sm:h-full"
            loading="lazy"
          />
          <span className="absolute bottom-1.5 right-1.5 rounded-md bg-black/80 px-1.5 py-0.5 text-xs font-semibold text-white tabular-nums">
            {formatDuration(metadata.durationSeconds)}
          </span>
        </div>

        <div className="min-w-0 flex-1 flex flex-col">
          <h2 className="text-base font-bold leading-snug text-foreground line-clamp-2">
            {metadata.title}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{metadata.channelTitle}</p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
              <Clock className="h-3 w-3" aria-hidden="true" />
              {formatDuration(metadata.durationSeconds)}
            </span>
            {isShort && (
              <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
                Short
              </span>
            )}
            {/* A cache hit means the expensive extraction is already paid for,
                so it's worth telling the user it'll be quick (spec §17). */}
            {cached && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-500">
                <Zap className="h-3 w-3" aria-hidden="true" />
                Already analysed — instant
              </span>
            )}
          </div>

          <div className="mt-auto pt-3">
            <button
              type="button"
              onClick={onReplace}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Use a different video
            </button>
          </div>
        </div>
      </div>

      <p className="mt-4 flex items-center gap-2 border-t border-border/60 pt-3 text-sm font-medium text-foreground">
        <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-hidden="true" />
        Video looks good. Choose what you want to generate.
      </p>
    </div>
  )
}

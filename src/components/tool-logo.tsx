"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"

interface ToolLogoProps {
  name: string
  website: string
  className?: string
  fallbackTextClassName?: string
  imageClassName?: string
}

export function ToolLogo({
  name,
  website,
  className,
  fallbackTextClassName,
  imageClassName
}: ToolLogoProps) {
  const [domain, setDomain] = useState<string>("")
  const [imageError, setImageError] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    try {
      if (website) {
        const parsedUrl = new URL(website)
        // Clean hostname (e.g. chat.openai.com or www.midjourney.com)
        setDomain(parsedUrl.hostname)
      }
    } catch (e) {
      console.error("Invalid URL for tool:", website, e)
      setImageError(true)
    }
  }, [website])

  const initial = name ? name.charAt(0).toUpperCase() : "?"

  // Dynamic favicon service from Google (using 128px size for clear display)
  const faviconUrl = domain 
    ? `https://www.google.com/s2/favicons?domain=${domain}&sz=128`
    : ""

  return (
    <div className={cn("relative overflow-hidden flex items-center justify-center bg-muted rounded-xl shrink-0 select-none", className)}>
      {faviconUrl && !imageError ? (
        <>
          {/* Loading Skeleton Pulse */}
          {!isLoaded && (
            <div className="absolute inset-0 bg-muted-foreground/10 animate-pulse flex items-center justify-center">
              <span className={cn("font-bold text-muted-foreground/40", fallbackTextClassName)}>
                {initial}
              </span>
            </div>
          )}
          
          {/* Favicon Image */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={faviconUrl}
            alt={`${name} logo`}
            className={cn(
              "object-contain w-[65%] h-[65%] transition-all duration-300",
              isLoaded ? "opacity-100 scale-100" : "opacity-0 scale-90",
              imageClassName
            )}
            onLoad={() => setIsLoaded(true)}
            onError={() => {
              setImageError(true)
              setIsLoaded(true)
            }}
          />
        </>
      ) : (
        /* Fallback Text Placeholder */
        <span className={cn("font-bold text-muted-foreground", fallbackTextClassName)}>
          {initial}
        </span>
      )}
    </div>
  )
}

import { Facebook, Ghost, Instagram, Linkedin, Music2, Youtube } from "lucide-react";

import type { SiteSettings } from "@/lib/types";

function XLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

const NETWORKS = [
  { key: "x_url", label: "X", Icon: XLogo },
  { key: "instagram_url", label: "Instagram", Icon: Instagram },
  { key: "snapchat_url", label: "Snapchat", Icon: Ghost },
  { key: "tiktok_url", label: "TikTok", Icon: Music2 },
  { key: "youtube_url", label: "YouTube", Icon: Youtube },
  { key: "linkedin_url", label: "LinkedIn", Icon: Linkedin },
  { key: "facebook_url", label: "Facebook", Icon: Facebook },
] as const;

export function SocialLinks({ settings, className = "", iconClass = "size-4" }: { settings: SiteSettings; className?: string; iconClass?: string }) {
  const items = NETWORKS.filter((n) => settings[n.key]);
  if (!items.length) return null;
  return (
    <ul className={`flex items-center gap-1 ${className}`}>
      {items.map(({ key, label, Icon }) => (
        <li key={key}>
          <a
            href={settings[key]}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={label}
            className="flex size-9 items-center justify-center rounded-full transition-colors hover:bg-white/15"
          >
            <Icon className={iconClass} />
          </a>
        </li>
      ))}
    </ul>
  );
}

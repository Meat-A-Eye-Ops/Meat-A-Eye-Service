"use client";

import { cn } from "@/lib/utils";

/** 돼지고기 부위 라인아트 아이콘 (소고기 Beef 아이콘과 구분용) */
export function PorkIcon({ className, size = 32 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("text-pink-600", className)}
      aria-hidden
    >
      {/* 돼지고기 부위 실루엣 - 뼈 있는 부위 느낌 */}
      <path
        d="M6 10c0-1 2-3 5-3s5 1 6 3c1 2 2 6 2 10s-1 8-2 10c-1 2-3 3-6 3s-5-2-5-3l-1-6c0-2 0-5 1-7s2-4 2-6z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M16 8c2 0 4 1 5 3 1 2 1 5 1 8s0 6-1 8c-1 2-3 3-5 3"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        fill="none"
      />
      <ellipse cx="10" cy="14" rx="2.5" ry="3" stroke="currentColor" strokeWidth="1" fill="none" />
    </svg>
  );
}

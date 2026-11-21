/** Biểu tượng trang quản trị: logo TaskFlow phiên bản màu hổ phách có hình khiên. */
export function AdminMark({ size = 34 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className="shrink-0">
      <defs>
        <clipPath id="admin-clip">
          <rect x="4" y="4" width="56" height="56" rx="18" />
        </clipPath>
        <linearGradient id="admin-water" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#ffc145" />
          <stop offset="1" stopColor="#e08a00" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="56" height="56" rx="18" fill="#0d1526" stroke="#f5a524" strokeWidth="3" />
      <g clipPath="url(#admin-clip)">
        <path d="M0 38 Q8 32 16 38 T32 38 T48 38 T64 38 V64 H0 Z" fill="url(#admin-water)" />
      </g>
      <path d="M32 15 l13 5 v9 c0 9-6 15-13 18 c-7-3-13-9-13-18 v-9 z" fill="none" stroke="#fff" strokeWidth="4" strokeLinejoin="round" />
    </svg>
  );
}

export function AdminWordmark() {
  return (
    <span className="flex items-baseline gap-1.5">
      <span className="font-display text-[16px] font-bold tracking-tight">TaskFlow</span>
      <span className="rounded-md bg-admin/15 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-admin uppercase">Admin</span>
    </span>
  );
}

export function catCls(cat?: string) {
  // Keep forum functional area visually unified:
  // category only acts as a subtle brand-tinted badge, not a full-color theme.
  void cat;
  return "bg-brand/10 text-brand border-brand/15";
}

export function getAccentClass(roomCategory?: string) {
  void roomCategory;
  return "text-brand border-brand/15";
}

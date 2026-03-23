export const POLISH_STYLES = [
  'colloquial',
  'light',
  'deep',
  'condensed',
  'formal',
  'business',
  'technical',
  'humorous',
  'custom',
] as const;

export type PolishStyle = (typeof POLISH_STYLES)[number];

export const POLISH_STYLE_LABELS: Record<PolishStyle, string> = {
  colloquial: '口语化',
  light: '轻度润色',
  deep: '深度润色',
  condensed: '精简压缩',
  formal: '正式规范',
  business: '商务专业',
  technical: '技术文档',
  humorous: '轻松幽默',
  custom: '自定义',
};

export function isValidPolishStyle(value: unknown): value is PolishStyle {
  return POLISH_STYLES.includes(value as PolishStyle);
}

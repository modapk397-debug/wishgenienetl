import type { AnimationTheme, ColorTheme, Occasion } from './api'

/** Color themes: gradient background + accent used across public pages. */
export const COLOR_THEMES: Record<ColorTheme, { label: string; bg: string; accent: string; ink: string; chip: string }> = {
  rose: { label: 'Rose', bg: 'linear-gradient(160deg, #fff1f3 0%, #ffe4e6 45%, #fecdd3 100%)', accent: '#e11d48', ink: '#4c0519', chip: '#ffe4e6' },
  ocean: { label: 'Ocean', bg: 'linear-gradient(160deg, #ecfeff 0%, #cffafe 45%, #a5f3fc 100%)', accent: '#0891b2', ink: '#083344', chip: '#cffafe' },
  sunset: { label: 'Sunset', bg: 'linear-gradient(160deg, #fff7ed 0%, #ffedd5 45%, #fed7aa 100%)', accent: '#ea580c', ink: '#431407', chip: '#ffedd5' },
  royal: { label: 'Royal', bg: 'linear-gradient(160deg, #f5f3ff 0%, #ede9fe 45%, #ddd6fe 100%)', accent: '#7c3aed', ink: '#2e1065', chip: '#ede9fe' },
  mint: { label: 'Mint', bg: 'linear-gradient(160deg, #ecfdf5 0%, #d1fae5 45%, #a7f3d0 100%)', accent: '#059669', ink: '#022c22', chip: '#d1fae5' },
  midnight: { label: 'Midnight', bg: 'linear-gradient(160deg, #0f172a 0%, #1e1b4b 55%, #312e81 100%)', accent: '#a5b4fc', ink: '#e0e7ff', chip: 'rgba(165,180,252,0.16)' },
}

/** Animation themes offered in the editor. */
export const ANIMATIONS: { value: AnimationTheme; label: string; hint: string }[] = [
  { value: 'confetti', label: 'Confetti', hint: 'Falling confetti burst' },
  { value: 'hearts', label: 'Floating Hearts', hint: 'Hearts drifting upward' },
  { value: 'balloons', label: 'Balloons', hint: 'Balloons floating up' },
  { value: 'fireworks', label: 'Fireworks', hint: 'Sparkling sky bursts' },
  { value: 'particles', label: 'Gentle Particles', hint: 'Soft ambient dots' },
]

export const OCCASIONS: { value: Occasion; label: string; emoji: string }[] = [
  { value: 'birthday', label: 'Birthday', emoji: '🎂' },
  { value: 'anniversary', label: 'Anniversary', emoji: '💞' },
  { value: 'congratulations', label: 'Congratulations', emoji: '🎉' },
  { value: 'thank-you', label: 'Thank You', emoji: '🙏' },
  { value: 'wedding', label: 'Wedding', emoji: '💍' },
  { value: 'new-baby', label: 'New Baby', emoji: '👶' },
  { value: 'good-luck', label: 'Good Luck', emoji: '🍀' },
  { value: 'just-because', label: 'Just Because', emoji: '💝' },
  { value: 'other', label: 'Other', emoji: '✨' },
]

export function occasionEmoji(occasion: Occasion) {
  return OCCASIONS.find((o) => o.value === occasion)?.emoji || '✨'
}

export function occasionLabel(occasion: Occasion) {
  return OCCASIONS.find((o) => o.value === occasion)?.label || 'Greeting'
}

# Interface Contracts: Theme System & Zero-Flicker Injection

**Feature**: STORY-1.4: Global Light/Dark Theme Mode with Zero-Hydration-Flicker Persistence (Jira: SIAA-11)
**Date**: 2026-10-07

## 1. Zero-Flicker Script Contract (`components/theme-script.tsx`)

```typescript
/**
 * Synchronously executes before DOM paint to read localStorage
 * and apply the active theme class/attribute without FOUC or hydration warnings.
 */
export function ThemeScript(): React.JSX.Element;
```

Inline script logic executed in `<head>`:
```javascript
(function() {
  try {
    var key = 'swift-theme';
    var theme = localStorage.getItem(key);
    var root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
    } else {
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
    }
  } catch (e) {}
})();
```

## 2. Theme Toggle Component Contract (`components/theme-toggle.tsx`)

```typescript
export interface ThemeToggleProps {
  /** Optional custom CSS class name */
  className?: string;
  /** Optional display variant: 'button' (default) | 'icon-only' | 'badge' */
  variant?: 'button' | 'icon-only' | 'badge';
}

export function ThemeToggle(props: ThemeToggleProps): React.JSX.Element;
```

## 3. Theme Helper Utilities Contract (`lib/theme.ts` / `lib/tokens.ts`)

```typescript
export function getStoredTheme(): ThemeMode;
export function setStoredTheme(mode: ThemeMode): void;
export function applyDocumentTheme(mode: ThemeMode): void;
```

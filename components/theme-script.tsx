import { THEME_STORAGE_KEY } from "@/lib/theme";

const themeInitScript = `(function() {
  try {
    var storedTheme = localStorage.getItem('${THEME_STORAGE_KEY}');
    var root = document.documentElement;
    if (storedTheme === 'dark') {
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
    } else {
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
    }
  } catch (e) {}
})();`;

/**
 * Blocking Theme Script to prevent Flash of Unstyled Content (FOUC) and hydration flicker.
 * Placed in <head> to execute synchronously before the browser paints the DOM.
 */
export function ThemeScript() {
  return (
    <script
      id="swift-theme-init"
      dangerouslySetInnerHTML={{ __html: themeInitScript }}
    />
  );
}

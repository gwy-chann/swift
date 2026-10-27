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

  try {
    var extAttrs = [
      'bis_skin_checked',
      'bis_register',
      'data-cz-shortcut-listen',
      'cz-shortcut-listen',
      'data-new-gr-c-s-check-loaded',
      'data-gr-ext-installed'
    ];
    function clean(el) {
      if (!el || !el.removeAttribute) return;
      for (var i = 0; i < extAttrs.length; i++) {
        if (el.hasAttribute(extAttrs[i])) {
          el.removeAttribute(extAttrs[i]);
        }
      }
    }
    function cleanAll() {
      for (var i = 0; i < extAttrs.length; i++) {
        var nodes = document.querySelectorAll('[' + extAttrs[i] + ']');
        for (var j = 0; j < nodes.length; j++) {
          nodes[j].removeAttribute(extAttrs[i]);
        }
      }
    }
    cleanAll();
    if (typeof MutationObserver !== 'undefined') {
      var observer = new MutationObserver(function(mutations) {
        for (var i = 0; i < mutations.length; i++) {
          var m = mutations[i];
          if (m.type === 'attributes' && m.target && m.target.nodeType === 1) {
            clean(m.target);
          } else if (m.type === 'childList') {
            for (var j = 0; j < m.addedNodes.length; j++) {
              var n = m.addedNodes[j];
              if (n && n.nodeType === 1) {
                clean(n);
                for (var a = 0; a < extAttrs.length; a++) {
                  var els = n.querySelectorAll ? n.querySelectorAll('[' + extAttrs[a] + ']') : [];
                  for (var b = 0; b < els.length; b++) {
                    els[b].removeAttribute(extAttrs[a]);
                  }
                }
              }
            }
          }
        }
      });
      observer.observe(document.documentElement, {
        attributes: true,
        subtree: true,
        childList: true,
        attributeFilter: extAttrs
      });
    }
  } catch (e) {}
})();`;

/**
 * Blocking Theme Script to prevent Flash of Unstyled Content (FOUC), hydration flicker,
 * and strip browser-extension injected attributes (like bis_skin_checked) before React hydrates.
 * Placed in <head> to execute synchronously before the browser paints or hydrates the DOM.
 */
export function ThemeScript() {
  return (
    <script
      id="swift-theme-init"
      dangerouslySetInnerHTML={{ __html: themeInitScript }}
    />
  );
}

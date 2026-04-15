import { useEffect, useRef } from 'react';
import { Grip, Trash2 } from 'lucide-react';
import { saveWidgetState } from '../lib/api.js';

const WIDGET_BASE_THEME = `
  :host {
    --background-primary: #0f172a;
    --background-secondary: rgba(30, 41, 59, 0.92);
    --background-modifier-border: rgba(148, 163, 184, 0.18);
    --background-modifier-error: #ef4444;
    --background-modifier-error-hover: rgba(239, 68, 68, 0.16);
    --interactive-accent: #60a5fa;
    --text-normal: #f8fafc;
    --text-muted: rgba(226, 232, 240, 0.68);
    --text-on-accent: #ffffff;
    --text-error: #f87171;
    --text-success: #34d399;
    --font-interface: "Segoe UI", "SF Pro Display", sans-serif;
    --font-monospace: Consolas, "SFMono-Regular", monospace;
    --shadow-s: 0 10px 24px rgba(2, 6, 23, 0.22);
  }
`;

function bindInlineHandlers(shadowRoot, scope) {
  const subscriptions = [];
  const eventMap = [
    ['click', 'onclick', false],
    ['input', 'oninput', false],
    ['change', 'onchange', false],
    ['blur', 'onblur', true],
    ['keydown', 'onkeydown', false],
    ['submit', 'onsubmit', false]
  ];

  eventMap.forEach(([eventName, attributeName, capture]) => {
    const listener = (event) => {
      const element = event.target.closest?.(`[${attributeName}]`);
      if (!element || !shadowRoot.contains(element)) {
        return;
      }
      const source = element.getAttribute(attributeName);
      if (!source) {
        return;
      }
      try {
        scope.event = event;
        const callback = new Function('scope', 'event', `with (scope) { ${source} }`);
        callback.call(element, scope, event);
      } catch (error) {
        console.error(`Inline handler ${attributeName} error`, error);
      }
    };

    shadowRoot.addEventListener(eventName, listener, capture);
    subscriptions.push(() => shadowRoot.removeEventListener(eventName, listener, capture));
  });

  return () => {
    subscriptions.forEach((dispose) => dispose());
  };
}

function exposeFunctionDeclarations(source) {
  const matches = [...source.matchAll(/(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g)];
  const names = [...new Set(matches.map((match) => match[1]))];
  return `${source}\n${names.map((name) => `scope.${name} = ${name};`).join('\n')}`;
}

export default function ShadowWidget({ item, isEditing, onDelete, onResizeStart }) {
  const containerRef = useRef(null);

  function handleResizePointerDown(event) {
    if (typeof event.currentTarget.setPointerCapture === 'function') {
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // Some mobile browsers can reject capture during quick gesture transitions.
      }
    }
    onResizeStart(event, item.id);
  }

  useEffect(() => {
    if (!containerRef.current || !item) {
      return undefined;
    }

    const host = containerRef.current;
    const shadowRoot = host.shadowRoot || host.attachShadow({ mode: 'open' });
    shadowRoot.replaceChildren();

    const styleTag = document.createElement('style');
    styleTag.textContent = `${WIDGET_BASE_THEME}\n${item.css || ''}`;
    shadowRoot.appendChild(styleTag);

    const wrapper = document.createElement('div');
    wrapper.style.width = '100%';
    wrapper.style.height = '100%';
    wrapper.innerHTML = item.html || '';
    shadowRoot.appendChild(wrapper);

    const api = {
      root: shadowRoot,
      saveState: async (state) => {
        await saveWidgetState(item.id, state);
      },
      getState: async () => item.widgetState ?? null
    };

    const scope = {
      api,
      root: shadowRoot,
      host,
      wrapper,
      console,
      navigator: window.navigator,
      document,
      window,
      alert: window.alert.bind(window),
      confirm: window.confirm.bind(window),
      setTimeout: window.setTimeout.bind(window),
      clearTimeout: window.clearTimeout.bind(window),
      setInterval: window.setInterval.bind(window),
      clearInterval: window.clearInterval.bind(window)
    };

    const disposeInlineHandlers = bindInlineHandlers(shadowRoot, scope);

    try {
      if (item.js) {
        const executable = new Function('api', 'scope', exposeFunctionDeclarations(item.js));
        executable(api, scope);
      }
    } catch (error) {
      console.error(`Widget ${item.id} error`, error);
      wrapper.innerHTML = '<div style="padding:12px;color:#fecaca;font:12px sans-serif;">Erreur widget</div>';
    }

    return () => {
      disposeInlineHandlers();
      if (host.shadowRoot) {
        host.shadowRoot.replaceChildren();
      }
    };
  }, [item]);

  return (
    <div className={`widget-shell ${isEditing ? 'widget-shell--editing' : ''}`}>
      <div ref={containerRef} className="widget-shell__host" />
      {isEditing ? (
        <>
          <button className="widget-shell__delete" onClick={() => onDelete(item.id)} type="button">
            <Trash2 size={15} />
          </button>
          <button className="widget-shell__resize" onPointerDown={handleResizePointerDown} type="button">
            <Grip size={16} />
          </button>
        </>
      ) : null}
    </div>
  );
}
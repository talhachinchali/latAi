export const inspectorScript = `
<script>
  let currentHighlightedElement = null;
  let clickHandler = null;
  let isInspectorEnabled = false;
 
  // Handle messages from parent
  window.addEventListener('message', (event) => {
    if (event.data?.type === 'set-inspector-mode') {
      isInspectorEnabled = event.data.enabled;
      // Clear any existing highlights when disabling
      if (!isInspectorEnabled) {
        currentHighlightedElement = null;
        const highlight = document.getElementById('inspector-overlay');
        if (highlight) highlight.remove();
      }
    }
  });
 
  document.addEventListener('mousemove', (e) => {
    if (!isInspectorEnabled) return;
    const x = e.clientX;
    const y = e.clientY;
    let el = document.elementFromPoint(x, y);
    if (!el) return;
 
    let deepElement = el;
    while (deepElement.shadowRoot) {
      const nested = deepElement.shadowRoot.elementFromPoint(x, y);
      if (!nested || nested === deepElement) break;
      deepElement = nested;
    }
 
    if (currentHighlightedElement === null) {
      let highlight = document.getElementById('inspector-overlay');
      if (!highlight) {
        highlight = document.createElement('div');
        highlight.id = 'inspector-overlay';
        document.body.appendChild(highlight);
      }
 
      const rect = deepElement.getBoundingClientRect();
      Object.assign(highlight.style, {
        position: 'fixed',
        top: \`\${rect.top}px\`,
        left: \`\${rect.left}px\`,
        width: \`\${rect.width}px\`,
        height: \`\${rect.height}px\`,
        border: '2px solid red',
        background: 'rgba(255,0,0,0.1)',
        zIndex: 9999,
        pointerEvents: 'none',
      });
 
      if (clickHandler) {
        deepElement.removeEventListener('click', clickHandler);
      }
 
      clickHandler = (e) => {
        if (!isInspectorEnabled) return;
        e.preventDefault();
        e.stopPropagation();
        currentHighlightedElement = deepElement;
        const elementData = {
          type: 'element-clicked',
          tagName: deepElement.tagName,
          className: deepElement.className,
          id: deepElement.id,
          innerText: deepElement.innerText,
          outerHTML: deepElement.outerHTML,
          rect: deepElement.getBoundingClientRect()
        };
        window.parent.postMessage(elementData, '*');
        console.log('Fixed Highlighted Element:', deepElement);
      };
      deepElement.addEventListener('click', clickHandler, { once: true });
    } else {
      const rectFixed = currentHighlightedElement.getBoundingClientRect();
      let highlight = document.getElementById('inspector-overlay');
      if (highlight) {
        Object.assign(highlight.style, {
          top: \`\${rectFixed.top}px\`,
          left: \`\${rectFixed.left}px\`,
          width: \`\${rectFixed.width}px\`,
          height: \`\${rectFixed.height}px\`,
        });
      }
    }
  });
 
  document.addEventListener('keydown', (e) => {
    if (!isInspectorEnabled) return;
    if (e.key === 'Escape') {
      currentHighlightedElement = null;
      const highlight = document.getElementById('inspector-overlay');
      if (highlight) highlight.remove();
    }
  });
</script>`



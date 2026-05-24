function escapeAttr(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// 片段加载失败时，渲染一个可见的错误卡片。i18n 此时尚未加载，所以用中英双语硬编码文案。
function renderPartialError(el, name, err) {
    const message = escapeAttr(err?.message || String(err || 'Unknown error'));
    const safeName = escapeAttr(name);
    el.setAttribute('role', 'alert');
    el.style.cssText = [
        'margin:12px',
        'padding:12px 14px',
        'border:1px solid #ff6b6b',
        'border-radius:6px',
        'background:rgba(255,107,107,0.08)',
        'color:#ff6b6b',
        'font-size:12px',
        'line-height:1.5'
    ].join(';');
    el.innerHTML = `
        <div style="font-weight:600;margin-bottom:4px;">⚠ ${safeName}</div>
        <div>加载失败 · Failed to load partial</div>
        <div style="margin-top:4px;opacity:0.75;word-break:break-all;">${message}</div>
    `;
}

const ALLOWED_PARTIALS = new Set([
    'header.html',
    'cleanup-panel.html',
    'history-panel.html',
    'permission-panel.html',
    'privacy-panel.html'
]);

function validatePartialMarkup(name, html) {
    if (!ALLOWED_PARTIALS.has(name)) {
        throw new Error(`unsupported partial: ${name}`);
    }
    const trimmed = String(html || '').trim();
    if (!trimmed.startsWith('<section') && !trimmed.startsWith('<header')) {
        throw new Error(`invalid partial root: ${name}`);
    }
}

export async function loadPartials() {
    const mounts = Array.from(document.querySelectorAll('[data-partial]'));
    await Promise.all(mounts.map(async el => {
        const name = el.dataset.partial;
        if (!name) return;
        try {
            const url = chrome.runtime.getURL(`partials/${name}`);
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const html = await res.text();
            validatePartialMarkup(name, html);
            el.outerHTML = html;
        } catch (err) {
            console.error(`加载片段失败 partials/${name}:`, err);
            renderPartialError(el, name, err);
        }
    }));
}

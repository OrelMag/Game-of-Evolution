export class Tooltip {
  constructor() {
    this._el = null;
  }

  show(x, y, text) {
    if (!this._el) {
      this._el = document.createElement('div');
      this._el.className = 'tooltip';
      document.body.appendChild(this._el);
    }
    this._el.textContent = text;
    const flipLeft = x + 14 + 220 > window.innerWidth;
    const left = flipLeft ? x - 234 : x + 14;
    this._el.style.cssText = `left:${left}px;top:${y - 10}px;display:block;`;
  }

  hide() {
    if (this._el) this._el.style.display = 'none';
  }

  static makeIcon(text) {
    const span = document.createElement('span');
    span.className = 'help-icon';
    span.textContent = 'ⓘ';
    span.addEventListener('mouseenter', e => tooltip.show(e.clientX, e.clientY, text));
    span.addEventListener('mousemove',  e => tooltip.show(e.clientX, e.clientY, text));
    span.addEventListener('mouseleave', () => tooltip.hide());
    return span;
  }
}

export const tooltip = new Tooltip();

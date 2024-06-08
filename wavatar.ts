class WavatarComponent extends HTMLElement {
  private shadow: ShadowRoot;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: "open" });
  }
  connectedCallback() {
    this.shadow.innerHTML = `
      <canvas></canvas>
    `;
  }
}

window.customElements.define("w-avatar", WavatarComponent);

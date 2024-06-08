class WavatarComponent extends HTMLElement {
    shadow;
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

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Vector2 {
  x: number;
  y: number;
}

class WavatarComponent extends HTMLElement {
  private shadow: ShadowRoot;
  private image: HTMLImageElement;
  private canvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D;
  private scale: number;
  private zoom: number;
  private scaleMax: number;
  private dragging: boolean;
  private start1: Vector2
  private start2: Vector2
  private finger1: Vector2
  private finger2: Vector2
  private pinching: boolean
  private start_distance: number
  private viewRect: Rect;
  private imageOrigin: Vector2;
  private mouseOnCanvas: Vector2;
  private mouseOnImage: Vector2;
  private dragStart: Vector2;
  private offset: Vector2;
  private clipRound: Function;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: "open" });

    this.image = new Image();
    this.image.addEventListener("load", this.imageChange.bind(this));

    this.scale = 1;
    this.zoom = 1;
    this.scaleMax = 5;
    this.dragging = false;
    this.viewRect = { x: 0, y: 0, width: 0, height: 0 };
    this.imageOrigin = { x: 0, y: 0 };
    this.mouseOnCanvas = { x: 0, y: 0 };
    this.mouseOnImage = { x: 0, y: 0 };
    this.dragStart = { x: 0, y: 0 };
    this.offset = { x: 0, y: 0 };
    this.start1 = { x: 0, y: 0 };
    this.start2 = { x: 0, y: 0 };
    this.finger1 = { x: 0, y: 0 };
    this.finger2 = { x: 0, y: 0 };
    this.pinching = false;
    this.start_distance = 0
  }

  static get observedAttributes() {
    return ["src", "max", "round"];
  }

  get width() {
    return this.getAttribute("width");
  }

  set width(value) {
    this.setAttribute("width", value);
  }

  get height() {
    return this.getAttribute("height");
  }

  set height(value) {
    this.setAttribute("height", value);
  }
  get src() {
    return this.getAttribute("src");
  }

  set src(value) {
    this.setAttribute("src", value);
  }

  get max() {
    return this.getAttribute("max");
  }

  set max(value) {
    this.setAttribute("max", value);
  }

  get round() {
    return this.hasAttribute("round");
  }

  set round(value) {
    this.setAttribute("round", "");
  }

  private attributeChangedCallback(attr: string, oldVal: any, newVal: string) {
    switch (attr) {
      case "src":
        this.image.src = newVal;
        break;
      case "max":
        this.scaleMax = parseInt(newVal);
        break;
      default:
        break;
    }
  }

  private connectedCallback() {
    this.shadow.innerHTML = `
    <style>
      :host {
        display: inline-block;
        padding: 0;
        margin: 0;
        line-height: 0;
      }
    </style>
    <canvas></canvas>
    `;

    this.canvas = this.shadow.querySelector("canvas");
    this.context = this.canvas.getContext("2d");
    this.canvas.width = parseInt(this.getAttribute("width")) || 200;
    this.canvas.height = parseInt(this.getAttribute("height")) || 200;
    this.image.crossOrigin = "anonymous";
    this.image.src = this.src;

    this.clipRound = () => {
      this.context.arc(
        this.canvas.width / 2,
        this.canvas.height / 2,
        this.canvas.height / 2,
        0,
        2 * Math.PI,
        false,
      );
    };

    this.canvas.addEventListener("mousedown", (e) => {
      this.dragging = true;
      this.dragStart = this.getCanvasPoint(e.clientX, e.clientY);
      this.emit("mousedown");
    });

    this.canvas.addEventListener(
      "touchstart",
      (e) => {
        e.preventDefault();
        this.finger1 = this.getCanvasPoint(e.touches[0].clientX, e.touches[0].clientY)
        this.start1 = this.finger1
        this.dragging = true;
        this.dragStart = this.finger1

        if (e.touches.length == 2) {
          this.pinching = true
          this.finger2 = this.getCanvasPoint(e.touches[1].clientX, e.touches[1].clientY)
          this.start2 = this.finger2
          this.start_distance = this.distanceBetweenPoints(this.finger1, this.finger2)
          this.dragStart = this.centerPoint(this.finger1, this.finger2)
        }

        this.emit("touchstart");
      },
      { passive: false },
    );

    this.canvas.addEventListener("mouseup", () => {
      this.canvasUp();
      this.emit("mouseup");
      this.draw();
    });

    this.canvas.addEventListener("touchend", () => {
      this.finger1 = { x: 0, y: 0 }
      this.finger2 = { x: 0, y: 0 }
      this.pinching = false
      this.canvasUp();
      this.emit("touchend");
      this.draw();
    });

    this.canvas.addEventListener("mousemove", (e) => {
      this.canvasMove(e.clientX, e.clientY);
      this.emit("mousemove");
    });

    this.canvas.addEventListener("touchmove", (e) => {
      this.finger1 = this.getCanvasPoint(e.touches[0].clientX, e.touches[0].clientY)
      if (this.pinching) {
        this.finger2 = this.getCanvasPoint(e.touches[1].clientX, e.touches[1].clientY)
        let dist_change = this.distanceBetweenPoints(this.finger1, this.finger2) - this.start_distance
        let scale = this.zoom + dist_change * 0.02
        scale = Math.min(this.scaleMax, Math.max(1, scale));
        this.zoom = scale;
        this.start_distance = this.distanceBetweenPoints(this.finger1, this.finger2)
        let midpoint = this.centerPoint(this.finger1, this.finger2)
        this.canvasMove(midpoint.x, midpoint.y);
        this.emit("pinchzoom");
      } else {
        this.canvasMove(this.finger1.x, this.finger1.y);
      }
      this.emit("touchmove");
    });

    this.canvas.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        let scale = this.zoom + e.deltaY * -0.025;
        scale = Math.min(this.scaleMax, Math.max(1, scale));
        this.zoom = scale;
        this.emit("wheel");
        this.draw();
      },
      { passive: false },
    );
  }

  private getCanvasPoint(canvasX: number, canvasY: number) {
    let canvasRect = this.canvas.getBoundingClientRect();
    let x = canvasX - canvasRect.left;
    let y = canvasY - canvasRect.top;
    return { x, y };
  }

  private canvasMove(canvasX: number, canvasY: number) {
    this.mouseOnCanvas = this.getCanvasPoint(canvasX, canvasY);

    this.mouseOnImage.x =
      this.mouseOnCanvas.x / (this.scale * this.zoom) + this.viewRect.x;
    this.mouseOnImage.y =
      this.mouseOnCanvas.y / (this.scale * this.zoom) + this.viewRect.y;

    if (this.dragging) {
      this.offset.x =
        (this.mouseOnCanvas.x - this.dragStart.x) / (this.scale * this.zoom);
      this.offset.y =
        (this.mouseOnCanvas.y - this.dragStart.y) / (this.scale * this.zoom);
      this.draw();
    }
  }

  private centerPoint(p1: Vector2, p2: Vector2) {
    let dx = p2.x - p1.x
    let dy = p2.y - p1.y
    return { x: p1.x + dx * 0.5, y: p1.y + dy * 0.5 }
  }

  private distanceBetweenPoints(p1: Vector2, p2: Vector2) {
    let dx = p1.x - p2.x
    let dy = p1.y - p2.y
    return Math.sqrt(dx * dx + dy + dy)
  }

  private canvasUp() {
    this.dragging = false;
    this.imageOrigin.x = this.imageOrigin.x - this.offset.x;
    this.imageOrigin.y = this.imageOrigin.y - this.offset.y;
    this.offset = { x: 0, y: 0 };
  }

  private clearCanvas() {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private imageChange() {
    this.scale = Math.max(
      this.canvas.width / this.image.width,
      this.canvas.height / this.image.height,
    );
    this.zoom = 1;
    this.imageOrigin.x = this.image.width / 2;
    this.imageOrigin.y = this.image.height / 2;
    this.emit("src");
    this.draw();
  }

  private draw() {
    this.calculateViewRect();

    this.clearCanvas();

    this.context.save();

    if (this.round) {
      this.clipRound();
      this.context.clip();
    }

    this.context.drawImage(
      this.image,
      this.viewRect.x,
      this.viewRect.y,
      this.viewRect.width,
      this.viewRect.height,
      0,
      0,
      this.canvas.width,
      this.canvas.height,
    );

    this.context.restore();
    this.emit("draw");
  }

  private calculateViewRect() {
    let scale = this.scale * this.zoom;
    this.viewRect.width = this.canvas.width / scale;
    this.viewRect.height = this.canvas.height / scale;
    this.viewRect.x =
      this.imageOrigin.x - this.offset.x - this.viewRect.width / 2;
    this.viewRect.y =
      this.imageOrigin.y - this.offset.y - this.viewRect.height / 2;
    this.checkViewRectBounds();
  }

  private checkViewRectBounds() {
    if (this.imageOrigin.x - this.offset.x - this.viewRect.width / 2 < 0) {
      let overX = this.imageOrigin.x - this.offset.x - this.viewRect.width / 2;
      this.viewRect.x = this.viewRect.x - overX;
      this.imageOrigin.x = this.viewRect.width / 2;
    }
    if (
      this.imageOrigin.x - this.offset.x + this.viewRect.width / 2 >
      this.image.width
    ) {
      let overX =
        this.image.width -
        (this.imageOrigin.x - this.offset.x + this.viewRect.width / 2);
      this.viewRect.x = this.viewRect.x + overX;
      this.imageOrigin.x = this.image.width - this.viewRect.width / 2;
    }
    if (this.imageOrigin.y - this.offset.y - this.viewRect.height / 2 < 0) {
      let overY = this.imageOrigin.y - this.offset.y - this.viewRect.height / 2;
      this.viewRect.y = this.viewRect.y - overY;
      this.imageOrigin.y = this.viewRect.height / 2;
    }
    if (
      this.imageOrigin.y - this.offset.y + this.viewRect.height / 2 >
      this.image.height
    ) {
      let overY =
        this.image.height -
        (this.imageOrigin.y - this.offset.y + this.viewRect.height / 2);
      this.viewRect.y = this.viewRect.y + overY;
      this.imageOrigin.y = this.image.height - this.viewRect.height / 2;
    }
  }

  private debugInfo() {
    return {
      canvas: { width: this.canvas.width, height: this.canvas.height },
      image: {
        src: this.image.src,
        width: this.image.width,
        height: this.image.height,
      },
      viewRect: this.viewRect,
      scale: this.scale,
      zoom: this.zoom,
      mouseOnCanvas: this.mouseOnCanvas,
      mouseOnImage: this.mouseOnImage,
      round: this.round,
      start1: this.start1,
      start2: this.start2,
      finger1: this.finger1,
      figner2: this.finger2,
      dragging: this.dragging,
      pinching: this.pinching
    };
  }

  private debug() {
    return this.debugInfo();
  }

  private emit(value: string) {
    let db = this.debugInfo();
    window.dispatchEvent(
      new CustomEvent("wavatar-debug", { detail: { ...db, event: value } }),
    );
  }

  fileSelect(cb: Function) {
    let fileselect = document.createElement("input");
    fileselect.type = "file";
    fileselect.addEventListener("change", (e) => {
      let imgfile = (<HTMLInputElement>e.target).files![0];
      this.src = URL.createObjectURL(imgfile);
      if (typeof cb === "function") {
        cb();
      }
    });
    fileselect.click();
    fileselect.remove();
  }

  setZoom(value: number | string) {
    this.zoom = Math.min(Math.max(Number(value), 1), this.scaleMax);
  }

  toPNG() {
    return this.canvas.toDataURL("image/png");
  }

  toJPEG() {
    return this.canvas.toDataURL("image/jpeg");
  }

  toBlob(cb: Function) {
    this.canvas.toBlob((blob) => {
      cb(blob);
    });
  }
}

window.customElements.define("w-avatar", WavatarComponent);

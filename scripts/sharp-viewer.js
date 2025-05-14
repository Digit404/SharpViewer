function createElement(tag) {
    if (document.contentType === "image/svg+xml") {
        return document.createElementNS("http://www.w3.org/1999/xhtml", tag);
    }
    return document.createElement(tag);
}

class Keybind {
    static bindings = [];
    static hintElement;

    constructor(keys, action, name, ctrl = false, shift = false, alt = false) {
        this.keys = keys;
        this.action = action;
        this.name = name;
        this.ctrl = ctrl;
        this.shift = shift;
        this.alt = alt;

        Keybind.bindings.push(this);
    }

    static setListeners() {
        document.addEventListener("keydown", (e) => {
            const key = e.key.toLowerCase();
            const code = e.code;

            for (const bind of Keybind.bindings) {
                // match key/code
                if (bind.keys.includes(key) || bind.keys.includes(code)) {
                    // match modifiers
                    if (bind.ctrl !== e.ctrlKey) continue;
                    if (bind.shift !== e.shiftKey) continue;
                    if (bind.alt !== e.altKey) continue;

                    e.preventDefault();
                    bind.action();
                }
            }
        });
    }

    static createKeybindHint(mediaContainer) {
        const hint = createElement("table");
        hint.classList.add("keybind-hint");

        const nameToKeys = new Map(); // group keybinds by action name
        for (const bind of Keybind.bindings) {
            const modifierParts = [];
            if (bind.ctrl) modifierParts.push("Ctrl");
            if (bind.shift) modifierParts.push("Shift");
            if (bind.alt) modifierParts.push("Alt");
            const keyName = bind.keys[0].length === 1 ? bind.keys[0].toUpperCase() : bind.keys[0];
            const keyCombo = [...modifierParts, keyName].join("+");

            if (nameToKeys.has(bind.name)) {
                nameToKeys.get(bind.name).push(keyCombo);
            } else {
                nameToKeys.set(bind.name, [keyCombo]);
            }
        }

        for (const [name, keys] of nameToKeys) {
            const row = createElement("tr");
            const keysCell = createElement("td");
            const actionCell = createElement("td");

            keysCell.textContent = "";
            keys.forEach((key, index) => {
                if (index > 0) keysCell.appendChild(document.createTextNode(" / "));
                const kbdElement = createElement("kbd");
                kbdElement.textContent = key;
                keysCell.appendChild(kbdElement);
            });
            actionCell.textContent = name;

            row.appendChild(keysCell);
            row.appendChild(actionCell);
            hint.appendChild(row);
        }

        mediaContainer.appendChild(hint);
        Keybind.hintElement = hint;
    }

    static toggleKeybindHint() {
        const current = Keybind.hintElement.style.opacity;
        Keybind.hintElement.style.opacity = current === "1" ? 0 : 1;
    }
}

class SharpViewer {
    constructor(mediaContainer, media) {
        this.mediaContainer = mediaContainer;
        this.media = media;
        this.source = media.src;

        // create popup
        this.popup = createElement("div");
        this.popup.classList.add("popup");
        this.mediaContainer.appendChild(this.popup);

        // initialize variables
        this.naturalHeight = this.media.naturalHeight || this.media.height || this.media.videoHeight;
        this.naturalWidth = this.media.naturalWidth || this.media.width || this.media.videoWidth;
        this.aspectRatio = this.naturalWidth / this.naturalHeight;

        this.scaleX = 1;
        this.scaleY = 1;
        this.scale = 1;

        // calculate initial positions based on the loaded image
        this.currentLeft = parseFloat(getComputedStyle(this.media).left) || 0;
        this.currentTop = parseFloat(getComputedStyle(this.media).top) || 0;

        // dragging variables
        this.startX = 0;
        this.startY = 0;

        this.popupTimeout = null;
        this.dragging = false;
        this.viewMode = "fit";

        this.MAX_SCALE = 50;
        this.MIN_SCALE = 100;

        // replace the image with a new one to prevent the default image viewer
        if (this.media.tagName.toLowerCase() === "img") {
            const newMedia = createElement("img");
            newMedia.src = this.source;
            this.media.parentNode.replaceChild(newMedia, this.media);
            this.media = newMedia;
        }

        this.media.classList.add("media");
        this.media.classList.add("checkerboard");

        // clear all stylesheets except sharp-viewer.css
        document.querySelectorAll('link[rel="stylesheet"]').forEach((link) => {
            if (!link.href.includes("sharp-viewer.css")) link.parentNode.removeChild(link);
        });

        this.resetTransform("fit");

        // create keybinds
        new Keybind(["Space"], () => this.toggleViewMode(), "Toggle View Mode");
        new Keybind(["f"], () => this.fullscreen(), "Fullscreen");
        new Keybind(["0"], () => this.resetTransform("fit"), "Fit / Actual / Fill");
        new Keybind(["1"], () => this.resetTransform("actual"), "Fit / Actual / Fill");
        new Keybind(["2"], () => this.resetTransform("fill"), "Fit / Actual / Fill");
        new Keybind(["+", "Equal"], () => this.zoomImage(1.1), "Zoom");
        new Keybind(["-"], () => this.zoomImage(0.9), "Zoom");
        new Keybind(["p"], () => this.toggleInterpolation(), "Toggle Interpolation");
        new Keybind(["b"], () => this.media.classList.toggle("checkerboard"), "Toggle Checkerboard");
        new Keybind(["/"], () => Keybind.toggleKeybindHint(), "Show Keybinds");
        new Keybind(["c"], () => this.copyImage(), "Copy Image", true);
        new Keybind(["c"], () => this.copyImageLink(), "Copy Image Link", true, true);
        new Keybind(["h"], () => this.flipHorizontal(), "Flip Image");
        new Keybind(["v"], () => this.flipVertical(), "Flip Image");

        // create the keybind hint table and set listeners
        Keybind.createKeybindHint(this.mediaContainer);
        Keybind.setListeners();

        this.setListeners();
    }

    setListeners() {
        // handle wheel event for zoom
        document.addEventListener(
            "wheel",
            (e) => {
                e.preventDefault();
                this.viewMode = "zoom";
                const delta = Math.sign(e.deltaY);
                const factor = delta > 0 ? 0.9 : 1.1;
                const x = e.clientX;
                const y = e.clientY;

                const relativeX = x - this.mediaContainer.getBoundingClientRect().left;
                const relativeY = y - this.mediaContainer.getBoundingClientRect().top;
                this.zoomImage(factor, relativeX, relativeY);
            },
            { passive: false } // prevent default
        );

        // handle mousedown for dragging
        this.mediaContainer.addEventListener("mousedown", (e) => {
            if (e.button !== 0) return;
            e.preventDefault();
            this.dragging = true;
            this.startX = e.clientX;
            this.startY = e.clientY;
        });

        // prevent default image dragging
        this.media.addEventListener("dragstart", (e) => {
            e.preventDefault();
        });

        // handle mousemove for dragging
        document.addEventListener("mousemove", (e) => {
            if (!this.dragging) return;
            this.mediaContainer.style.cursor = "grabbing";
            const dx = e.clientX - this.startX;
            const dy = e.clientY - this.startY;
            this.media.style.left = this.currentLeft + dx + "px";
            this.media.style.top = this.currentTop + dy + "px";
            this.clampPosition();
        });

        // handle mouseup for drag end
        document.addEventListener("mouseup", (e) => {
            e.preventDefault();
            if (!this.dragging) return;
            this.mediaContainer.style.cursor = "auto";
            this.dragging = false;

            const dx = e.clientX - this.startX;
            const dy = e.clientY - this.startY;

            if (dx === 0 && dy === 0) {
                if (this.viewMode === "fit") {
                    this.resetTransform("actual");
                    this.popupText("View: Actual");
                } else {
                    this.resetTransform("fit");
                    this.popupText("View: Fit");
                }
            }

            this.currentLeft = parseFloat(this.media.style.left);
            this.currentTop = parseFloat(this.media.style.top);
        });

        // handle resize event
        window.addEventListener("resize", () => {
            this.resetTransform(this.viewMode);
        });
    }

    popupText(text) {
        // display popup with text then fade out
        this.popup.textContent = text;
        this.popup.style.opacity = 1;

        clearTimeout(this.popupTimeout);
        this.popupTimeout = setTimeout(() => {
            this.popup.style.opacity = 0;
        }, 2000);
    }

    resetTransform(mode) {
        // reset image position and size
        const containerRect = this.mediaContainer.getBoundingClientRect();
        this.viewMode = mode;

        if (mode !== "zoom") {
            let newWidth, newHeight;
            if (mode === "fit") {
                newWidth = containerRect.width;
                newHeight = newWidth / this.aspectRatio;
                if (newHeight > containerRect.height) {
                    newHeight = containerRect.height;
                    newWidth = newHeight * this.aspectRatio;
                }
                this.popupText("View: Fit");
            } else if (mode === "actual") {
                newWidth = this.naturalWidth;
                newHeight = this.naturalHeight;
                this.popupText("View: Actual");
            } else if (mode === "fill") {
                newWidth = containerRect.width;
                newHeight = newWidth / this.aspectRatio;
                if (newHeight < containerRect.height) {
                    newHeight = containerRect.height;
                    newWidth = newHeight * this.aspectRatio;
                }
                this.popupText("View: Fill");
            }
            this.media.style.width = newWidth + "px";
            this.media.style.height = newHeight + "px";
        }

        // re-center image
        const containerCenterX = containerRect.left + containerRect.width / 2;
        const containerCenterY = containerRect.top + containerRect.height / 2;

        const imgRect = this.media.getBoundingClientRect();
        const oldCenterX = imgRect.left + imgRect.width / 2;
        const oldCenterY = imgRect.top + imgRect.height / 2;
        const offsetX = oldCenterX - containerCenterX;
        const offsetY = oldCenterY - containerCenterY;

        this.media.style.left = containerCenterX - offsetX - imgRect.width / 2 + "px";
        this.media.style.top = containerCenterY - offsetY - imgRect.height / 2 + "px";

        this.currentLeft = parseFloat(this.media.style.left);
        this.currentTop = parseFloat(this.media.style.top);

        this.scale = imgRect.width / this.naturalWidth; // scale is the ratio of displayed width to natural width
        this.media.style.transform = `scale(${this.scaleX}, ${this.scaleY})`; // apply flip

        this.clampPosition();
    }

    zoomImage(factor, x = this.mediaContainer.clientWidth / 2, y = this.mediaContainer.clientHeight / 2) {
        let newScale = this.scale * factor;

        // Limit the scale
        if (newScale > this.MAX_SCALE) {
            newScale = this.MAX_SCALE;
            factor = this.MAX_SCALE / this.scale;
        } else {
            const newWidth = this.naturalWidth * newScale;
            const newHeight = this.naturalHeight * newScale;
            if (newWidth < this.MIN_SCALE || newHeight < this.MIN_SCALE) {
                const scaleByWidth = this.MIN_SCALE / this.naturalWidth;
                const scaleByHeight = this.MIN_SCALE / this.naturalHeight;
                newScale = Math.max(scaleByWidth, scaleByHeight);
                factor = newScale / this.scale;
            }
        }

        this.scale = newScale;
        this.viewMode = "zoom";

        const mediaRect = this.media.getBoundingClientRect();
        const containerRect = this.mediaContainer.getBoundingClientRect();
        const offsetX = (x - (mediaRect.left - containerRect.left)) * (1 - factor);
        const offsetY = (y - (mediaRect.top - containerRect.top)) * (1 - factor);

        const newWidth = mediaRect.width * factor;
        const newHeight = mediaRect.height * factor;

        this.media.style.width = newWidth + "px";
        this.media.style.height = newHeight + "px";

        const newLeft = mediaRect.left - containerRect.left + offsetX;
        const newTop = mediaRect.top - containerRect.top + offsetY;

        this.media.style.left = newLeft + "px";
        this.media.style.top = newTop + "px";

        this.clampPosition();
        this.currentLeft = parseFloat(this.media.style.left);
        this.currentTop = parseFloat(this.media.style.top);

        const zoomPercent = Math.round(this.scale * 100);
        this.popupText(`Zoom: ${zoomPercent}%`);
    }

    clampPosition() {
        const containerRect = this.mediaContainer.getBoundingClientRect();
        const imgRect = this.media.getBoundingClientRect();

        let changed = false;
        let newLeft = parseFloat(this.media.style.left);
        let newTop = parseFloat(this.media.style.top);

        if (imgRect.width <= containerRect.width) {
            newLeft = (containerRect.width - imgRect.width) / 2;
            changed = true;
        } else {
            if (newLeft > 0) {
                newLeft = 0;
                changed = true;
            }
            if (newLeft + imgRect.width < containerRect.width) {
                newLeft = containerRect.width - imgRect.width;
                changed = true;
            }
        }

        if (imgRect.height <= containerRect.height) {
            newTop = (containerRect.height - imgRect.height) / 2;
            changed = true;
        } else {
            if (newTop > 0) {
                newTop = 0;
                changed = true;
            }
            if (newTop + imgRect.height < containerRect.height) {
                newTop = containerRect.height - imgRect.height;
                changed = true;
            }
        }

        if (changed) {
            this.media.style.left = newLeft + "px";
            this.media.style.top = newTop + "px";
        }
    }

    toggleViewMode() {
        if (this.viewMode === "fit") {
            this.resetTransform("actual");
        } else {
            this.resetTransform("fit");
        }
    }

    toggleInterpolation() {
        // toggle interpolation
        const pixelated = this.media.style.imageRendering === "pixelated";
        this.media.style.imageRendering = pixelated ? "auto" : "pixelated";
        const text = pixelated ? "Linear" : "Nearest";
        this.popupText(`Interpolation: ${text}`);
    }

    copyImage() {
        const img = new Image();
        img.crossOrigin = "anonymous"; // allow cross-origin image loading
        img.src = this.media.src;

        // use canvas to convert image to blob and copy to clipboard as png
        img.onload = () => {
            const canvas = createElement("canvas");
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0);

            // convert to blob
            canvas.toBlob((blob) => {
                if (blob) {
                    const item = new ClipboardItem({ "image/png": blob });
                    navigator.clipboard
                        .write([item])
                        .then(() => {
                            this.popupText("Image Copied");
                        })
                        .catch((error) => {
                            console.error("Failed to copy image:", error);
                        });
                }
            }, "image/png");
        };
    }

    copyImageLink() {
        // copy image link to clipboard
        navigator.clipboard.writeText(this.media.src);
        this.popupText("Image Link Copied");
    }

    flipHorizontal() {
        this.scaleX *= -1; // toggle between 1 and -1
        this.resetTransform(this.viewMode);
        this.popupText("Flipped Horizontally");
    }

    flipVertical() {
        this.scaleY *= -1; // toggle between 1 and -1
        this.resetTransform(this.viewMode);
        this.popupText("Flipped Vertically");
    }

    fullscreen() {
        // toggle fullscreen
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            this.mediaContainer.requestFullscreen();
        }
    }
}

const mediaContainer = document.querySelector("#sharp-viewer") || document.body;
mediaContainer.id = "sharp-viewer";
const media = mediaContainer.querySelector("img") || mediaContainer.querySelector("video");

function initializeSharpViewer() {
    new SharpViewer(mediaContainer, media);
}

if (media) {
    if (media.tagName.toLowerCase() === "img") {
        // for an image
        if (media.complete) {
            initializeSharpViewer();
        } else {
            media.addEventListener("load", initializeSharpViewer);
        }
    } else if (media.tagName.toLowerCase() === "video") {
        // for a video
        if (media.readyState >= 4) {
            // wait for video to load
            initializeSharpViewer();
        } else {
            media.addEventListener("canplaythrough", initializeSharpViewer);
        }
    }
} else {
    console.log("SharpViewer: No image or video found in the container.");
}

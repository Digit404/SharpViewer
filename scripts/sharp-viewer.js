const body = document.body;
let image = document.querySelector("img");
const source = image.src;
const popup = document.createElement("div");
popup.classList.add("popup");
body.appendChild(popup);

let naturalHeight;
let naturalWidth;
let aspectRatio;

let scaleX = 1;
let scaleY = 1;

// replace the image with a new one to prevent the default image viewer
newImage = document.createElement("img");
newImage.src = source;
image.parentNode.replaceChild(newImage, image);
image = newImage;

const MAX_SCALE = 50; // in multiples
const MIN_SCALE = 100; // in px

// variables for dragging
let viewMode = "fit";

let popupTimeout;

let dragging = false,
    startX = 0,
    startY = 0;
let scale = 1;

let currentLeft;
let currentTop;

function popupText(text) {
    // display popup with text then fade out
    popup.textContent = text;
    popup.style.opacity = 1;

    clearTimeout(popupTimeout);
    popupTimeout = setTimeout(() => {
        popup.style.opacity = 0;
    }, 2000);
}

function resetTransform(mode) {
    // reset image position and size

    const containerRect = body.getBoundingClientRect();

    viewMode = mode;

    if (mode !== "zoom") {
        let newWidth, newHeight;

        if (mode === "fit") {
            newWidth = containerRect.width;
            newHeight = newWidth / aspectRatio;

            if (newHeight > containerRect.height) {
                newHeight = containerRect.height;
                newWidth = newHeight * aspectRatio;
            }

            popupText("View: Fit");
        } else if (mode === "actual") {
            newWidth = naturalWidth;
            newHeight = naturalHeight;
            popupText("View: Actual");
        } else if (mode === "fill") {
            newWidth = containerRect.width;
            newHeight = newWidth / aspectRatio;

            if (newHeight < containerRect.height) {
                newHeight = containerRect.height;
                newWidth = newHeight * aspectRatio;
            }
            popupText("View: Fill");
        }

        image.style.width = newWidth + "px";
        image.style.height = newHeight + "px";
    }

    // re-center image
    const containerCenterX = containerRect.left + containerRect.width / 2;
    const containerCenterY = containerRect.top + containerRect.height / 2;

    const imgRect = image.getBoundingClientRect();
    const oldCenterX = imgRect.left + imgRect.width / 2;
    const oldCenterY = imgRect.top + imgRect.height / 2;

    const offsetX = oldCenterX - containerCenterX;
    const offsetY = oldCenterY - containerCenterY;

    image.style.left = containerCenterX - offsetX - imgRect.width / 2 + "px";
    image.style.top = containerCenterY - offsetY - imgRect.height / 2 + "px";

    currentLeft = parseFloat(image.style.left);
    currentTop = parseFloat(image.style.top);

    scale = imgRect.width / naturalWidth;

    image.style.transform = `scale(${scaleX}, ${scaleY})`; // apply flip

    clampPosition();
}

function zoomImage(factor, x = window.innerWidth / 2, y = window.innerHeight / 2) {
    // calculate the new scale
    let newScale = scale * factor;

    // limit the scale
    if (newScale > MAX_SCALE) {
        newScale = MAX_SCALE;
        factor = MAX_SCALE / scale;
    } else if (naturalWidth * newScale < MIN_SCALE || naturalHeight * newScale < MIN_SCALE) {
        newScale = MIN_SCALE / Math.min(naturalWidth, naturalHeight);
        factor = newScale / scale;
    }

    scale = newScale;

    viewMode = "zoom";
    const imageRect = image.getBoundingClientRect();
    let offsetX = (x - imageRect.left) * (1 - factor);
    let offsetY = (y - imageRect.top) * (1 - factor);
    let newWidth = imageRect.width * factor;
    let newHeight = imageRect.height * factor;

    // manipulate the image
    image.style.width = newWidth + "px";
    image.style.height = newHeight + "px";

    const newLeft = imageRect.left + offsetX;
    const newTop = imageRect.top + offsetY;
    image.style.left = newLeft + "px";
    image.style.top = newTop + "px";

    clampPosition();
    currentLeft = parseFloat(image.style.left);
    currentTop = parseFloat(image.style.top);

    const zoomPercent = Math.round(scale * 100);
    popupText(`Zoom: ${zoomPercent}%`);
}

function clampPosition() {
    const containerRect = body.getBoundingClientRect();
    const imgRect = image.getBoundingClientRect();

    let changed = false;

    let newLeft = parseFloat(image.style.left);
    let newTop = parseFloat(image.style.top);

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
        image.style.left = newLeft + "px";
        image.style.top = newTop + "px";
    }
}

function toggleViewMode() {
    if (viewMode === "fit") {
        resetTransform("actual");
    } else {
        resetTransform("fit");
    }
}

function toggleInterpolation() {
    // toggle interpolation
    const pixelated = image.style.imageRendering === "pixelated";
    image.style.imageRendering = pixelated ? "auto" : "pixelated";

    // pixelated contains the value of the previous state
    const text = pixelated ? "Linear" : "Nearest";
    popupText(`Interpolation: ${text}`);
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
                if (bind.keys.includes(key) || bind.keys.includes(code)) {
                    if (bind.ctrl !== e.ctrlKey) continue;
                    if (bind.shift !== e.shiftKey) continue;
                    if (bind.alt !== e.altKey) continue;

                    e.preventDefault();
                    bind.action();
                }
            }
        });
    }

    static createKeybindHint() {
        const hint = document.createElement("table");
        hint.classList.add("keybind-hint");

        // group keybinds by action name
        const nameToKeys = new Map();

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
            const row = document.createElement("tr");
            const keysCell = document.createElement("td");
            const actionCell = document.createElement("td");

            // join multiple keys with "/"
            keysCell.textContent = "";

            keys.forEach((key, index) => {
                if (index > 0) keysCell.appendChild(document.createTextNode(" / "));

                const kbdElement = document.createElement("kbd");
                kbdElement.textContent = key;

                keysCell.appendChild(kbdElement);
            });

            actionCell.textContent = name;

            row.appendChild(keysCell);
            row.appendChild(actionCell);
            hint.appendChild(row);
        }

        document.body.appendChild(hint);
        Keybind.hintElement = hint;
    }

    static toggleKeybindHint() {
        Keybind.hintElement.style.opacity = Keybind.hintElement.style.opacity === "1" ? 0 : 1;
    }
}

async function copyImage() {
    const url = image.src;
    const response = await fetch(url, { mode: "cors" });
    const blob = await response.blob();
    const item = new ClipboardItem({ [blob.type]: blob });
    try {
        await navigator.clipboard.write([item]);
    } catch (error) {
        console.error("Failed to copy image:", error);
    }
    popupText("Image Copied");
}

function copyImageLink() {
    navigator.clipboard.writeText(image.src);
    popupText("Image Link Copied");
}

function flipHorizontal() {
    scaleX *= -1; // toggle between 1 and -1
    resetTransform();
    popupText("Flipped Horizontally");
}

function flipVertical() {
    scaleY *= -1; // toggle between 1 and -1
    resetTransform();
    popupText("Flipped Vertically");
}

function fullscreen() {
    // toggle fullscreen
    if (document.fullscreenElement) {
        document.exitFullscreen();
    } else {
        document.documentElement.requestFullscreen();
    }
}

function init() {
    // clear all other stylesheets
    document.querySelectorAll('link[rel="stylesheet"]').forEach((link) => {
        if (!link.href.includes("sharp-viewer.css")) link.parentNode.removeChild(link);
    });

    // calculate the initial position based on the loaded image
    currentLeft = parseFloat(getComputedStyle(image).left) || 0;
    currentTop = parseFloat(getComputedStyle(image).top) || 0;

    naturalHeight = image.naturalHeight;
    naturalWidth = image.naturalWidth;

    if (naturalHeight === 0 || naturalWidth === 0) {
        // some svg images have 0 natural dimensions
        naturalHeight = image.height;
        naturalWidth = image.width;
    }

    aspectRatio = naturalWidth / naturalHeight;

    resetTransform("fit");

    new Keybind(["Space"], toggleViewMode, "Toggle View Mode");
    new Keybind(["f"], fullscreen, "Fullscreen");
    new Keybind(["0"], () => resetTransform("fit"), "Fit / Actual / Fill");
    new Keybind(["1"], () => resetTransform("actual"), "Fit / Actual / Fill");
    new Keybind(["2"], () => resetTransform("fill"), "Fit / Actual / Fill");
    new Keybind(["+", "Equal"], () => zoomImage(1.1), "Zoom");
    new Keybind(["-"], () => zoomImage(0.9), "Zoom");
    new Keybind(["p"], toggleInterpolation, "Toggle Interpolation");
    new Keybind(["b"], () => image.classList.toggle("checkerboard"), "Toggle Checkerboard");
    new Keybind(["/"], Keybind.toggleKeybindHint, "Show Keybinds");
    new Keybind(["c"], copyImage, "Copy Image", (ctrl = true));
    new Keybind(["c"], copyImageLink, "Copy Image Link", (ctrl = true), (shift = true));
    new Keybind(["h"], flipHorizontal, "Flip Image");
    new Keybind(["v"], flipVertical, "Flip Image");

    Keybind.createKeybindHint();
    Keybind.setListeners();
}

if (image.complete) {
    init();
} else {
    image.addEventListener("load", init);
}

document.addEventListener(
    "wheel",
    (e) => {
        e.preventDefault();

        viewMode = "zoom";

        const delta = Math.sign(e.deltaY);
        const factor = delta > 0 ? 0.9 : 1.1;

        const x = e.clientX;
        const y = e.clientY;

        zoomImage(factor, x, y);
    },
    {
        passive: false, // prevent default
    }
);

body.addEventListener("mousedown", (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    dragging = true;
    startX = e.clientX;
    startY = e.clientY;
});

image.addEventListener("dragstart", (e) => {
    e.preventDefault(); // prevent default image dragging
});

document.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    body.style.cursor = "grabbing";
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    image.style.left = currentLeft + dx + "px";
    image.style.top = currentTop + dy + "px";

    clampPosition();
});

document.addEventListener("mouseup", (e) => {
    e.preventDefault();
    if (!dragging) return;
    body.style.cursor = "auto";
    dragging = false;

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    if (dx === 0 && dy === 0) {
        if (viewMode === "fit") {
            resetTransform("actual");
            popupText("View: Actual");
        } else {
            resetTransform("fit");
            popupText("View: Fit");
        }
    }

    currentLeft = parseFloat(image.style.left);
    currentTop = parseFloat(image.style.top);
});

window.addEventListener("resize", () => {
    resetTransform(viewMode);
});

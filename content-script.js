const body = document.body;
const image = document.querySelector("img");
const popup = document.createElement("div");
popup.classList.add("popup");
body.appendChild(popup);

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

    // calculate viewport size and aspect ratio
    const containerRect = body.getBoundingClientRect();
    const ratio = image.naturalWidth / image.naturalHeight;

    viewMode = mode;

    if (mode !== "zoom") {
        let newWidth, newHeight;

        if (mode === "fit") {
            newWidth = containerRect.width;
            newHeight = newWidth / ratio;

            if (newHeight > containerRect.height) {
                newHeight = containerRect.height;
                newWidth = newHeight * ratio;
            }
        } else if (mode === "actual") {
            newWidth = image.naturalWidth;
            newHeight = image.naturalHeight;
        } else if (mode === "fill") {
            newWidth = containerRect.width;
            newHeight = newWidth / ratio;

            if (newHeight < containerRect.height) {
                newHeight = containerRect.height;
                newWidth = newHeight * ratio;
            }
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

    scale = imgRect.width / image.naturalWidth;

    clampPosition();
}

function zoomImage(factor, x = window.innerWidth / 2, y = window.innerHeight / 2) {
    // calculate the new scale
    let newScale = scale * factor;

    // limit the scale
    if (newScale > MAX_SCALE) {
        newScale = MAX_SCALE;
        factor = MAX_SCALE / scale;
    } else if (image.naturalWidth * newScale < MIN_SCALE || image.naturalHeight * newScale < MIN_SCALE) {
        newScale = MIN_SCALE / Math.min(image.naturalWidth, image.naturalHeight);
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

function init() {
    // clear all other stylesheets
    document.querySelectorAll('link[rel="stylesheet"]').forEach((link) => {
        if (!link.href.includes("sharp-viewer.css"))
            link.parentNode.removeChild(link);
    });

    // calculate the initial position based on the loaded image
    currentLeft = parseFloat(getComputedStyle(image).left) || 0;
    currentTop = parseFloat(getComputedStyle(image).top) || 0;

    resetTransform("fit");
}

if (image.complete) {
    init();
} else {
    image.addEventListener("load", init);
}

document.addEventListener("keydown", (e) => {
    if (e.code === "KeyP") {
        // toggle interpolation
        const pixelated = image.style.imageRendering === "pixelated";
        image.style.imageRendering = pixelated ? "auto" : "pixelated";

        // pixelated contains the value of the previous state
        const text = pixelated ? "Linear" : "Nearest";
        popupText(`Interpolation: ${text}`);
    } else if (e.key === "0" || e.code === "KeyF") {
        resetTransform("fit");
        popupText("View: Fit");
    } else if (e.key === "1" || e.code === "KeyA") {
        resetTransform("actual");
        popupText("View: Actual");
    } else if (e.key === "2") {
        resetTransform("fill");
        popupText("View: Fill");
    } else if (e.key === "+" || e.code === "Equal") {
        zoomImage(1.1);
    } else if (e.key === "-") {
        zoomImage(0.9);
    } else if (e.code === "Space") {
        if (viewMode === "fit") {
            resetTransform("actual");
            popupText("View: Actual");
        } else {
            resetTransform("fit");
            popupText("View: Fit");
        }
    } else if (e.code === "KeyB") {
        image.classList.toggle("checkerboard");
    }
});

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
    dragging = true;
    startX = e.clientX;
    startY = e.clientY;
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

(() => {
    try {
        const head = document.head;
        if (head.querySelector('link[href*="ImageDocument.css"]')) {
            return true;
        }

        const body = document.body;
        if (body && body.children.length === 1 && body.firstElementChild?.tagName === "IMG") {
            const img = body.firstElementChild;
            if (img.src === window.location.href) {
                return true;
            }
        }

        return false;
    } catch (error) {
        return false;
    }
})();

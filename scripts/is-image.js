(() => {
    try {
        const head = document.head;
        const link = head.querySelector('link[href="resource://content-accessible/ImageDocument.css"]');
        return !!link;
    } catch (error) {
        return false;
    }
})();

browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete") {
        try {
            // check if the document head contains the specific structure for image documents
            const isImageDocument = await browser.tabs.executeScript(tabId, {
                code: `
                    (() => {
                        const head = document.head;
                        const link = head.querySelector('link[href="resource://content-accessible/ImageDocument.css"]');
                        return !!(link);
                    })()
                `,
            });

            if (isImageDocument && isImageDocument[0]) {
                // inject viewer
                await browser.tabs.insertCSS(tabId, { file: "sharp-viewer.css" });
                await browser.tabs.executeScript(tabId, { file: "content-script.js" });
            }
        } catch (error) {
            console.error("failed to inject scripts:", error);
        }
    }
});
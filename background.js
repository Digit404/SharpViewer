browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete") {
        try {
            let isOtherDocument = false;

            // check if the document head contains the specific structure for image documents
            const isImageDocument = await browser.tabs.executeScript(tabId, {
                file: "scripts/is-image.js",
            });

            // check if the document is an SVG
            const isSVG = await browser.tabs.executeScript(tabId, {
                file: "scripts/is-svg.js",
            });

            // convert the svg into a pseudo html document
            if (isSVG && isSVG[0]) {
                console.log("SVG detected, converting to image...");
                await browser.tabs.executeScript(tabId, { file: "scripts/convert-svg.js" });
                await browser.tabs.insertCSS(tabId, { file: "sharp-viewer.css" });
                await browser.tabs.executeScript(tabId, { file: "scripts/sharp-viewer.js" });
            }

            // find reddit.com/media pages
            if (tab.url.match(/www\.reddit\.com\/media/)) {
                await browser.tabs.executeScript(tabId, { file: "scripts/fix-reddit.js" });
                isOtherDocument = true;
            }

            if ((isImageDocument && isImageDocument[0]) || isOtherDocument) {
                // inject viewer
                await browser.tabs.insertCSS(tabId, { file: "sharp-viewer.css" });
                await browser.tabs.executeScript(tabId, { file: "scripts/sharp-viewer.js" });
            }
        } catch (error) {
            console.error("failed to inject scripts:", error);
        }
    }
});

browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete") {
        // prevent errors by ignoring browser urls
        if (!tab.url || tab.url.startsWith("chrome://") || tab.url.startsWith("about:") || tab.url.startsWith("moz-extension://")) {
            return;
        }

        try {
            let isOtherDocument = false;

            // check if the document head contains the specific structure for image documents
            const isImageResult = await browser.scripting.executeScript({
                target: { tabId: tabId },
                files: ["scripts/is-image.js"],
            });
            const isImageDocument = isImageResult && isImageResult[0]?.result;

            // check if the document is an SVG
            const isSVGResult = await browser.scripting.executeScript({
                target: { tabId: tabId },
                files: ["scripts/is-svg.js"],
            });
            const isSVG = isSVGResult && isSVGResult[0]?.result;

            // convert the svg into a pseudo html document
            if (isSVG) {
                console.log("SVG detected, converting to image...");
                await browser.scripting.executeScript({
                    target: { tabId: tabId },
                    files: ["scripts/convert-svg.js"],
                });
                await browser.scripting.insertCSS({
                    target: { tabId: tabId },
                    files: ["sharp-viewer.css"],
                });
                await browser.scripting.executeScript({
                    target: { tabId: tabId },
                    files: ["scripts/sharp-viewer.js"],
                });
                return;
            }

            // find reddit.com/media pages (fixing script needs updating, better to be disabled for now)
            // if (tab.url.match(/www\.reddit\.com\/media/)) {
            //     await browser.scripting.executeScript({
            //         target: { tabId: tabId },
            //         files: ["scripts/fix-reddit.js"],
            //     });
            //     isOtherDocument = true;
            // }
            
            else if (isImageDocument || isOtherDocument) {
                // inject viewer
                await browser.scripting.insertCSS({
                    target: { tabId: tabId },
                    files: ["sharp-viewer.css"],
                });
                await browser.scripting.executeScript({
                    target: { tabId: tabId },
                    files: ["scripts/sharp-viewer.js"],
                });
            }
        } catch (error) {
            console.error("failed to inject scripts:", error);
        }
    }
});

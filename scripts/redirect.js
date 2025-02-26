const URL = window.location.href;

const sharpURL = browser.runtime.getURL("sharp-viewer.html");
const fullURL = `${sharpURL}?url=${encodeURIComponent(URL)}`;

window.location.replace(fullURL);

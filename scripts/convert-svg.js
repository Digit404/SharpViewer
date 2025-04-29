const XHTML = "http://www.w3.org/1999/xhtml";
const doc = document;

const html = doc.createElementNS(XHTML, "html");
const head = doc.createElementNS(XHTML, "head");
const body = doc.createElementNS(XHTML, "body");

html.appendChild(head);
html.appendChild(body);

const meta = doc.createElementNS(XHTML, "meta");
meta.setAttribute("charset", "utf-8");
head.appendChild(meta);

const svg = doc.replaceChild(html, doc.documentElement); // <svg> is gone, <html> is king

const xml = new XMLSerializer().serializeToString(svg);
const svg64 = btoa(unescape(encodeURIComponent(xml)));
const imgSrc = 'data:image/svg+xml;base64,' + svg64;

const image = doc.createElementNS(XHTML, "img");
image.setAttribute("src", imgSrc);

body.appendChild(image);

undefined;
const form = document.getElementById("settings-form");

// load settings on open
document.addEventListener("DOMContentLoaded", async () => {
    const data = await browser.storage.sync.get({
        defaultView: "fit",
        backgroundColor: "#111111",
        checkerboard: true,
        lockPanning: true,
        interpolation: "linear",
        checkerboardBg: "#ffffff",
        checkerboardColor: "#cccccc",
    });

    form.defaultView.value = data.defaultView;
    form.backgroundColor.value = data.backgroundColor;
    form.checkerboard.checked = data.checkerboard;
    form.lockPanning.checked = data.lockPanning;
    form.interpolation.value = data.interpolation;
    form.checkerboardBg.value = data.checkerboardBg;
    form.checkerboardColor.value = data.checkerboardColor;
});

// save on submit
form.addEventListener("change", async () => {
    await browser.storage.sync.set({
        defaultView: form.defaultView.value,
        backgroundColor: form.backgroundColor.value,
        checkerboard: form.checkerboard.checked,
        lockPanning: form.lockPanning.checked,
        interpolation: form.interpolation.value,
        checkerboardBg: form.checkerboardBg.value,
        checkerboardColor: form.checkerboardColor.value,
    });
});

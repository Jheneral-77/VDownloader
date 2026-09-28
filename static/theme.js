(function () {


const savedSettings =
    localStorage.getItem("vdownloader_settings");

let theme = "light";

if (savedSettings) {

    try {

        const settings =
            JSON.parse(savedSettings);

        theme =
            settings.theme || "light";

    } catch (error) {

        theme = "light";

    }

}

document.documentElement.setAttribute(
    "data-theme",
    theme
);


})();

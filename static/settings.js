
document.addEventListener("DOMContentLoaded", () => {

    const themeSelect =
        document.getElementById("themeSelect");

    const qualitySelect =
        document.getElementById("qualitySelect");

    const formatSelect =
        document.getElementById("formatSelect");

    const completedNotification =
        document.getElementById("completedNotification");

    const failedNotification =
        document.getElementById("failedNotification");

    const resetButton =
        document.getElementById("resetButton");

    const clearCompletedButton =
        document.getElementById("clearCompletedButton");

    const saveMessage =
        document.getElementById("saveMessage");


    const DEFAULT_SETTINGS = {
        theme: "light",
        quality: "best",
        format: "ask",
        completedNotification: true,
        failedNotification: true
    };


    function getSettings() {

        try {

            const saved =
                localStorage.getItem(
                    "vdownloader_settings"
                );

            if (!saved) {

                return {
                    ...DEFAULT_SETTINGS
                };

            }

            return {
                ...DEFAULT_SETTINGS,
                ...JSON.parse(saved)
            };

        } catch (error) {

            console.error(
                "Could not load settings:",
                error
            );

            return {
                ...DEFAULT_SETTINGS
            };

        }

    }


    function saveSettings(settings) {

        localStorage.setItem(
            "vdownloader_settings",
            JSON.stringify(settings)
        );

    }


    function applyTheme(theme) {

        document.documentElement.setAttribute(
            "data-theme",
            theme
        );

    }


    function showSavedMessage() {

        if (!saveMessage) {
            return;
        }

        saveMessage.classList.add(
            "show"
        );

        clearTimeout(
            window.settingsMessageTimer
        );

        window.settingsMessageTimer =
            setTimeout(() => {

                saveMessage.classList.remove(
                    "show"
                );

            }, 1800);

    }


    function loadSettings() {

        const settings =
            getSettings();


        applyTheme(
            settings.theme
        );


        if (themeSelect) {

            themeSelect.value =
                settings.theme;

        }


        if (qualitySelect) {

            qualitySelect.value =
                settings.quality;

        }


        if (formatSelect) {

            formatSelect.value =
                settings.format;

        }


        if (completedNotification) {

            completedNotification.checked =
                settings.completedNotification;

        }


        if (failedNotification) {

            failedNotification.checked =
                settings.failedNotification;

        }

    }


    function updateSetting(
        key,
        value
    ) {

        const settings =
            getSettings();


        settings[key] =
            value;


        saveSettings(
            settings
        );


        if (key === "theme") {

            applyTheme(
                value
            );

        }


        showSavedMessage();

    }


    if (themeSelect) {

        themeSelect.addEventListener(
            "change",
            () => {

                updateSetting(
                    "theme",
                    themeSelect.value
                );

            }
        );

    }


    if (qualitySelect) {

        qualitySelect.addEventListener(
            "change",
            () => {

                updateSetting(
                    "quality",
                    qualitySelect.value
                );

            }
        );

    }


    if (formatSelect) {

        formatSelect.addEventListener(
            "change",
            () => {

                updateSetting(
                    "format",
                    formatSelect.value
                );

            }
        );

    }


    if (completedNotification) {

        completedNotification.addEventListener(
            "change",
            () => {

                updateSetting(
                    "completedNotification",
                    completedNotification.checked
                );

            }
        );

    }


    if (failedNotification) {

        failedNotification.addEventListener(
            "change",
            () => {

                updateSetting(
                    "failedNotification",
                    failedNotification.checked
                );

            }
        );

    }


    if (resetButton) {

        resetButton.addEventListener(
            "click",
            () => {

                const confirmed =
                    window.confirm(
                        "Reset all VDownloader settings to their defaults?"
                    );


                if (!confirmed) {
                    return;
                }


                const settings = {
                    ...DEFAULT_SETTINGS
                };


                saveSettings(
                    settings
                );


                loadSettings();


                showSavedMessage();

            }
        );

    }


    if (clearCompletedButton) {

        clearCompletedButton.addEventListener(
            "click",
            async () => {

                const confirmed =
                    window.confirm(
                        "Clear all completed downloads?"
                    );


                if (!confirmed) {
                    return;
                }


                try {

                    clearCompletedButton.disabled =
                        true;

                    clearCompletedButton.textContent =
                        "Clearing...";


                    const response =
                        await fetch(
                            "/api/clear-completed",
                            {
                                method: "DELETE"
                            }
                        );


                    const data =
                        await response.json();


                    if (!response.ok) {

                        throw new Error(
                            data.error ||
                            "Failed to clear downloads."
                        );

                    }


                    showSavedMessage();


                } catch (error) {

                    console.error(
                        "Clear completed error:",
                        error
                    );


                    alert(
                        error.message ||
                        "Failed to clear completed downloads."
                    );


                } finally {

                    clearCompletedButton.disabled =
                        false;

                    clearCompletedButton.textContent =
                        "Clear Completed Downloads";

                }

            }
        );

    }


    loadSettings();

});


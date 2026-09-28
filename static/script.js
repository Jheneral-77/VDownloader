document.addEventListener("DOMContentLoaded", () => {

    const videoUrl = document.getElementById("videoUrl");
    const clearBtn = document.getElementById("clearBtn");
    const analyzeBtn = document.getElementById("analyzeBtn");
    const status = document.getElementById("status");
    const platformDetectionArea =
        document.getElementById("platformDetectionArea");

    const resultSection =
        document.getElementById("resultSection");

    const videoPreview =
        document.querySelector(".video-preview");

    const videoTitle =
        document.getElementById("videoTitle");

    const previewSource =
        document.getElementById("previewSource");

    const previewSourceIcon =
        document.getElementById("previewSourceIcon");

    const previewPlatformBadge =
        document.getElementById("previewPlatformBadge");

    const videoDuration =
        document.getElementById("videoDuration");

    const videoDurationInfo =
        document.getElementById("videoDurationInfo");

    const videoThumbnail =
        document.getElementById("videoThumbnail");

    const thumbnailFallback =
        document.getElementById("thumbnailFallback");

    const videoThumbnailWrapper =
        document.querySelector(".video-thumbnail-wrapper");

    const videoReadyStatus =
        document.getElementById("videoReadyStatus");

    const selectedQualityInfo =
        document.getElementById("selectedQualityInfo");

    const selectedFormatInfo =
        document.getElementById("selectedFormatInfo");

    const quality =
        document.getElementById("quality");

    const format =
        document.getElementById("format");

    const downloadType =
        document.getElementById("downloadType");

    const qualityOption =
        document.getElementById("qualityOption");

    const startDownloadBtn =
        document.getElementById("startDownloadBtn");

    const newDownloadBtn =
        document.getElementById("newDownloadBtn");

    const historySection =
        document.getElementById("historySection");

    const historyLink =
        document.getElementById("historyLink");

    const historyList =
        document.getElementById("historyList");

    const emptyHistory =
        document.getElementById("emptyHistory");

    const noHistoryResults =
        document.getElementById("noHistoryResults");

    const historySearch =
        document.getElementById("historySearch");

    const clearHistorySearch =
        document.getElementById("clearHistorySearch");

    const clearHistoryBtn =
        document.getElementById("clearHistoryBtn");

    const historyCount =
        document.getElementById("historyCount");

    const historySize =
        document.getElementById("historySize");

    const settingsSection =
        document.getElementById("settingsSection");

    const settingsLink =
        document.getElementById("settingsLink");

    const homeLink =
        document.getElementById("homeLink");

    const themeSetting =
        document.getElementById("themeSetting");

    const qualitySetting =
        document.getElementById("qualitySetting");

    const formatSetting =
        document.getElementById("formatSetting");

    const settingsClearHistoryBtn =
        document.getElementById("settingsClearHistoryBtn");

    const resetSettingsBtn =
        document.getElementById("resetSettingsBtn");

    const settingsMessage =
        document.getElementById("settingsMessage");


    let currentVideo = null;
    let currentJobId = null;
    let historyData = [];
    let isAnalyzing = false;
    let deletingHistory = false;
    let quickDownloadBtn = null;

    const downloadJobs = new Map();
    const jobPollingIntervals = new Map();
    const jobPollingRequests = new Map();
    const jobActionRequests = new Map();

    const MAX_PROGRESS_ERRORS = 5;


    const DEFAULT_SETTINGS = {
        theme: "light",
        quality: "ask",
        format: "ask"
    };


    const ALLOWED_THEMES = [
        "light",
        "dark"
    ];


    const ALLOWED_QUALITIES = [
        "ask",
        "1080",
        "720",
        "480",
        "360"
    ];


    const ALLOWED_FORMATS = [
        "ask",
        "mp4",
        "webm",
        "mp3",
        "m4a"
    ];


    const SETTINGS_KEYS = {
        theme: "vdownloader_theme",
        quality: "vdownloader_quality",
        format: "vdownloader_format"
    };


    const PLATFORM_DATA = {

        YouTube: {
            icon: "▶",
            label: "YouTube"
        },

        TikTok: {
            icon: "♪",
            label: "TikTok"
        },

        Instagram: {
            icon: "◎",
            label: "Instagram"
        },

        Facebook: {
            icon: "f",
            label: "Facebook"
        },

        X: {
            icon: "𝕏",
            label: "X"
        },

        Reddit: {
            icon: "●",
            label: "Reddit"
        },

        Vimeo: {
            icon: "V",
            label: "Vimeo"
        },

        Generic: {
            icon: "🌐",
            label: "Video site"
        },

        Unknown: {
            icon: "🌐",
            label: "Unknown platform"
        }
    };


    const ACTIVE_STATES = new Set([
        "queued",
        "downloading",
        "processing",
        "postprocessing",
        "post-processing",
        "merging",
        "finalizing",
        "paused",
        "pause_requested",
        "resuming",
        "resume_requested"
    ]);


    const TERMINAL_STATES = new Set([
        "completed",
        "failed",
        "error",
        "cancelled",
        "canceled"
    ]);


    function escapeHTML(value) {

        if (
            value === null ||
            value === undefined
        ) {
            return "";
        }

        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }


    function getNotificationContainer() {

        let container =
            document.querySelector(
                ".notification-container"
            );

        if (container) {
            return container;
        }

        container =
            document.createElement("div");

        container.className =
            "notification-container";

        document.body.appendChild(container);

        return container;
    }


    function showNotification(
        type,
        title,
        message,
        duration = 4000
    ) {

        const container =
            getNotificationContainer();

        const notification =
            document.createElement("div");

        notification.className =
            `notification ${type}`;

        let icon = "i";

        if (type === "success") {
            icon = "✓";
        }

        if (
            type === "error" ||
            type === "warning"
        ) {
            icon = "!";
        }

        notification.innerHTML = `
            <div class="notification-icon">
                ${icon}
            </div>

            <div class="notification-content">

                <div class="notification-title">
                    ${escapeHTML(title)}
                </div>

                <div class="notification-message">
                    ${escapeHTML(message)}
                </div>

            </div>

            <button
                class="notification-close"
                type="button"
                aria-label="Close notification"
            >
                ×
            </button>
        `;

        container.appendChild(notification);

        notification
            .querySelector(
                ".notification-close"
            )
            ?.addEventListener(
                "click",
                () => notification.remove()
            );

        if (duration > 0) {

            setTimeout(() => {

                if (notification.isConnected) {
                    notification.remove();
                }

            }, duration);
        }
    }


    function showLoading(
        message = "Please wait..."
    ) {

        hideLoading();

        const overlay =
            document.createElement("div");

        overlay.id =
            "vdownloaderLoadingOverlay";

        overlay.className =
            "loading-overlay";

        overlay.innerHTML = `
            <div class="loading-card">

                <div class="loading-spinner">
                    ↻
                </div>

                <div class="loading-text">
                    ${escapeHTML(message)}
                </div>

            </div>
        `;

        document.body.appendChild(overlay);
    }


    function hideLoading() {

        document
            .getElementById(
                "vdownloaderLoadingOverlay"
            )
            ?.remove();
    }


    function showStatus(
        message,
        type = ""
    ) {

        if (!status) {
            return;
        }

        status.textContent = message;

        status.className = "status";

        if (type) {
            status.classList.add(type);
        }
    }


    function formatBytes(bytes) {

        if (
            bytes === null ||
            bytes === undefined ||
            isNaN(bytes) ||
            Number(bytes) <= 0
        ) {
            return "0 MB";
        }

        const units = [
            "B",
            "KB",
            "MB",
            "GB",
            "TB"
        ];

        let size = Number(bytes);
        let index = 0;

        while (
            size >= 1024 &&
            index < units.length - 1
        ) {
            size /= 1024;
            index++;
        }

        if (index === 0) {
            return `${Math.round(size)} ${units[index]}`;
        }

        return `${size.toFixed(2)} ${units[index]}`;
    }


    function formatETA(seconds) {

        if (
            seconds === null ||
            seconds === undefined ||
            isNaN(seconds) ||
            Number(seconds) < 0
        ) {
            return "--";
        }

        seconds =
            Math.round(Number(seconds));

        if (seconds < 60) {
            return `${seconds}s`;
        }

        const minutes =
            Math.floor(seconds / 60);

        const remainingSeconds =
            seconds % 60;

        if (minutes < 60) {
            return `${minutes}m ${remainingSeconds}s`;
        }

        const hours =
            Math.floor(minutes / 60);

        const remainingMinutes =
            minutes % 60;

        return `${hours}h ${remainingMinutes}m`;
    }


    function formatDuration(seconds) {

        if (
            seconds === null ||
            seconds === undefined ||
            isNaN(seconds)
        ) {
            return "--";
        }

        seconds =
            Math.max(
                0,
                Math.round(Number(seconds))
            );

        const hours =
            Math.floor(seconds / 3600);

        const minutes =
            Math.floor(
                (seconds % 3600) / 60
            );

        const secs =
            seconds % 60;

        if (hours > 0) {

            return [
                hours,
                String(minutes).padStart(2, "0"),
                String(secs).padStart(2, "0")
            ].join(":");
        }

        return [
            String(minutes).padStart(2, "0"),
            String(secs).padStart(2, "0")
        ].join(":");
    }


    function formatQuality(
        value,
        options = {}
    ) {

        if (!value) {
            return "Unknown";
        }

        const text =
            String(value)
                .replace(/p$/i, "")
                .trim();

        if (!/^\d+$/.test(text)) {
            return String(value);
        }

        const height =
            Number(text);

        let label =
            `${height}p`;

        if (height >= 720) {
            label += " HD";
        } else if (height <= 540) {
            label += " SD";
        }

        if (options.best) {
            label += " — Best Quality";
        }

        return label;
    }


    function formatFormat(value) {

        if (!value) {
            return "Unknown";
        }

        const normalized =
            String(value).toLowerCase();

        if (normalized === "mp4") {
            return "MP4";
        }

        if (normalized === "webm") {
            return "WebM";
        }

        if (normalized === "mp3") {
            return "MP3";
        }

        if (normalized === "m4a") {
            return "M4A";
        }

        return String(value).toUpperCase();
    }


    function getQualitySize(
        qualityValue
    ) {

        if (!currentVideo) {
            return null;
        }

        const sizes =
            currentVideo.quality_sizes ||
            currentVideo.qualitySizes ||
            currentVideo.sizes ||
            {};

        const key =
            String(qualityValue)
                .replace(/p$/i, "")
                .trim();

        if (
            sizes &&
            typeof sizes === "object" &&
            !Array.isArray(sizes)
        ) {

            const value =
                sizes[key];

            if (
                value !== null &&
                value !== undefined &&
                Number(value) > 0
            ) {
                return Number(value);
            }
        }

        if (Array.isArray(sizes)) {

            const match =
                sizes.find(item => {

                    if (
                        !item ||
                        typeof item !== "object"
                    ) {
                        return false;
                    }

                    const itemQuality =
                        item.quality ??
                        item.height ??
                        item.value ??
                        item.resolution;

                    return (
                        String(itemQuality)
                            .replace(/p$/i, "")
                            .trim() === key
                    );
                });

            if (match) {

                const value =
                    match.size ??
                    match.filesize ??
                    match.estimated_size ??
                    match.filesize_approx;

                if (
                    value !== null &&
                    value !== undefined &&
                    Number(value) > 0
                ) {
                    return Number(value);
                }
            }
        }

        if (Array.isArray(currentVideo.formats)) {

            const matchingFormats =
                currentVideo.formats.filter(item => {

                    if (!item) {
                        return false;
                    }

                    const itemQuality =
                        item.quality ??
                        item.height;

                    return (
                        String(itemQuality)
                            .replace(/p$/i, "")
                            .trim() === key
                    );
                });

            let largestSize = 0;

            matchingFormats.forEach(item => {

                const size =
                    item.estimated_size ??
                    item.filesize ??
                    item.filesize_approx ??
                    0;

                if (Number(size) > largestSize) {
                    largestSize = Number(size);
                }
            });

            if (largestSize > 0) {
                return largestSize;
            }
        }

        return null;
    }


    function detectPlatformFromUrl(url) {

        if (!url) {
            return "Unknown";
        }

        try {

            const hostname =
                new URL(url)
                    .hostname
                    .toLowerCase()
                    .replace(/^www\./, "");

            if (
                hostname === "youtube.com" ||
                hostname.endsWith(".youtube.com") ||
                hostname === "youtu.be"
            ) {
                return "YouTube";
            }

            if (
                hostname === "facebook.com" ||
                hostname.endsWith(".facebook.com") ||
                hostname === "fb.watch"
            ) {
                return "Facebook";
            }

            if (
                hostname === "instagram.com" ||
                hostname.endsWith(".instagram.com")
            ) {
                return "Instagram";
            }

            if (
                hostname === "tiktok.com" ||
                hostname.endsWith(".tiktok.com")
            ) {
                return "TikTok";
            }

            if (
                hostname === "twitter.com" ||
                hostname.endsWith(".twitter.com") ||
                hostname === "x.com" ||
                hostname.endsWith(".x.com")
            ) {
                return "X";
            }

            if (
                hostname === "vimeo.com" ||
                hostname.endsWith(".vimeo.com")
            ) {
                return "Vimeo";
            }

            if (
                hostname === "reddit.com" ||
                hostname.endsWith(".reddit.com") ||
                hostname === "redd.it"
            ) {
                return "Reddit";
            }

            return "Generic";

        } catch {
            return "Unknown";
        }
    }


    function getPlatformData(platform) {

        return (
            PLATFORM_DATA[platform] ||
            PLATFORM_DATA.Unknown
        );
    }


    function getPlatformName(data) {

        if (!data) {
            return "Unknown";
        }

        const source =
            data.platform ||
            data.site ||
            data.source;

        if (source) {

            const normalized =
                String(source).toLowerCase();

            if (normalized.includes("youtube")) {
                return "YouTube";
            }

            if (normalized.includes("facebook")) {
                return "Facebook";
            }

            if (normalized.includes("instagram")) {
                return "Instagram";
            }

            if (normalized.includes("tiktok")) {
                return "TikTok";
            }

            if (
                normalized.includes("twitter") ||
                normalized === "x"
            ) {
                return "X";
            }

            if (normalized.includes("reddit")) {
                return "Reddit";
            }

            if (normalized.includes("vimeo")) {
                return "Vimeo";
            }

            return String(source);
        }

        return detectPlatformFromUrl(
            data.url ||
            data.webpage_url ||
            ""
        );
    }


    function getVideoSource(data) {

        if (!data) {
            return "";
        }

        return (
            data.source ||
            data.site ||
            data.website ||
            data.platform ||
            ""
        );
    }


    function getVideoThumbnail(data) {

        if (!data) {
            return "";
        }

        return (
            data.thumbnail ||
            data.thumbnail_url ||
            data.thumb ||
            ""
        );
    }


    function getVideoDuration(data) {

        if (!data) {
            return null;
        }

        return (
            data.duration ??
            data.duration_seconds ??
            null
        );
    }


    function isValidHttpUrl(value) {

        if (!value) {
            return false;
        }

        try {

            const url =
                new URL(value);

            return (
                url.protocol === "http:" ||
                url.protocol === "https:"
            );

        } catch {
            return false;
        }
    }


    function normalizeUrlInput(value) {

        if (!value) {
            return "";
        }

        let url =
            String(value).trim();

        if (
            !url.startsWith("http://") &&
            !url.startsWith("https://")
        ) {
            url = `https://${url}`;
        }

        return url;
    }


    function updatePlatformDetection(url) {

        if (!platformDetectionArea) {
            return;
        }

        const normalized =
            normalizeUrlInput(url);

        if (!isValidHttpUrl(normalized)) {

            platformDetectionArea.innerHTML =
                "";

            return;
        }

        const platform =
            detectPlatformFromUrl(normalized);

        const platformData =
            getPlatformData(platform);

        platformDetectionArea.innerHTML = `
            <div class="platform-detection">

                <span class="platform-detection-icon">
                    ${escapeHTML(platformData.icon)}
                </span>

                <span class="platform-detection-text">
                    Platform detected:
                </span>

                <strong class="platform-detection-name">
                    ${escapeHTML(platformData.label)}
                </strong>

            </div>
        `;
    }


    function clearPlatformDetection() {

        if (platformDetectionArea) {
            platformDetectionArea.innerHTML = "";
        }
    }


    function updateClearButton() {

        if (!clearBtn) {
            return;
        }

        clearBtn.disabled =
            isAnalyzing;

        const hasUrl =
            Boolean(
                videoUrl?.value?.trim()
            );

        clearBtn.style.display =
            hasUrl ? "flex" : "none";

        clearBtn.style.opacity =
            hasUrl ? "1" : "0.6";
    }


    if (videoUrl) {

        videoUrl.addEventListener(
            "input",
            () => {

                updateClearButton();

                const value =
                    videoUrl.value.trim();

                if (value) {
                    updatePlatformDetection(value);
                } else {
                    clearPlatformDetection();
                }
            }
        );


        videoUrl.addEventListener(
            "paste",
            () => {

                setTimeout(() => {

                    const normalized =
                        normalizeUrlInput(
                            videoUrl.value
                        );

                    if (
                        normalized &&
                        normalized !== videoUrl.value
                    ) {
                        videoUrl.value =
                            normalized;
                    }

                    updatePlatformDetection(
                        normalized
                    );

                    updateClearButton();

                }, 50);
            }
        );


        videoUrl.addEventListener(
            "keydown",
            event => {

                if (event.key === "Enter") {

                    event.preventDefault();

                    if (isAnalyzing) {
                        return;
                    }

                    const normalized =
                        normalizeUrlInput(
                            videoUrl.value
                        );

                    if (
                        !isValidHttpUrl(
                            normalized
                        )
                    ) {

                        showStatus(
                            "Please enter a valid video URL.",
                            "error"
                        );

                        return;
                    }

                    videoUrl.value =
                        normalized;

                    updatePlatformDetection(
                        normalized
                    );

                    analyzeVideo();
                }

                if (event.key === "Escape") {

                    document
                        .querySelectorAll(
                            ".notification"
                        )
                        .forEach(
                            item => item.remove()
                        );
                }
            }
        );
    }


    clearBtn?.addEventListener(
        "click",
        () => {

            if (isAnalyzing) {
                return;
            }

            if (videoUrl) {
                videoUrl.value = "";
            }

            currentVideo = null;

            clearPlatformDetection();

            resultSection?.classList.add(
                "hidden"
            );

            showStatus("");

            updateClearButton();

            videoUrl?.focus();
        }
    );


    function setAnalyzeLoading(loading) {

        isAnalyzing = loading;

        if (!analyzeBtn) {
            return;
        }

        analyzeBtn.disabled =
            loading;

        analyzeBtn.setAttribute(
            "aria-busy",
            loading ? "true" : "false"
        );

        if (loading) {

            if (
                !analyzeBtn.dataset.originalHTML
            ) {

                analyzeBtn.dataset.originalHTML =
                    analyzeBtn.innerHTML;
            }

            analyzeBtn.textContent =
                "Analyzing...";

            analyzeBtn.classList.add(
                "btn-loading"
            );

        } else {

            analyzeBtn.innerHTML =
                analyzeBtn.dataset.originalHTML ||
                `<span>Analyze Video</span><span class="arrow">→</span>`;

            analyzeBtn.classList.remove(
                "btn-loading"
            );
        }

        updateClearButton();
    }


    async function analyzeVideo() {

        if (isAnalyzing) {
            return;
        }

        const normalized =
            normalizeUrlInput(
                videoUrl?.value || ""
            );

        if (!isValidHttpUrl(normalized)) {

            showStatus(
                "Please enter a valid video URL.",
                "error"
            );

            showNotification(
                "error",
                "Invalid URL",
                "Please enter a valid video link.",
                3500
            );

            return;
        }

        if (videoUrl) {
            videoUrl.value =
                normalized;
        }

        updatePlatformDetection(
            normalized
        );

        setAnalyzeLoading(true);

        showStatus(
            "Analyzing video..."
        );

        showLoading(
            "Analyzing video..."
        );

        resultSection?.classList.add(
            "hidden"
        );

        try {

            const response =
                await fetch(
                    "/api/analyze",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type":
                                "application/json"
                        },
                        body: JSON.stringify({
                            url: normalized
                        })
                    }
                );

            let data = null;

            try {
                data =
                    await response.json();
            } catch {
                data = null;
            }

            if (!response.ok) {

                throw new Error(
                    data?.error ||
                    data?.message ||
                    "Unable to analyze this video."
                );
            }

            currentVideo = data;

            displayVideoResult(data);

            showStatus(
                "Video analyzed successfully.",
                "success"
            );

            showNotification(
                "success",
                "Video ready",
                "Your video is ready to download.",
                3000
            );

        } catch (error) {

            currentVideo = null;

            showStatus(
                error.message ||
                "Unable to analyze video.",
                "error"
            );

            showNotification(
                "error",
                "Analysis failed",
                error.message ||
                "Unable to analyze this video.",
                4500
            );

        } finally {

            hideLoading();

            setAnalyzeLoading(false);

            updateClearButton();
        }
    }


    analyzeBtn?.addEventListener(
        "click",
        analyzeVideo
    );


    function showThumbnailFallback() {

        if (videoThumbnail) {

            videoThumbnail.classList.remove(
                "is-loaded"
            );

            videoThumbnail.style.display =
                "none";
        }

        if (thumbnailFallback) {

            thumbnailFallback.style.display =
                "flex";
        }

        videoThumbnailWrapper?.classList.remove(
            "is-loading"
        );
    }


    function displayThumbnail(data) {

        const thumbnail =
            getVideoThumbnail(data);

        showThumbnailFallback();

        if (
            !videoThumbnail ||
            !thumbnail
        ) {
            return;
        }

        videoThumbnailWrapper?.classList.add(
            "is-loading"
        );

        videoThumbnail.onload = () => {

            videoThumbnail.style.display =
                "block";

            videoThumbnail.classList.add(
                "is-loaded"
            );

            if (thumbnailFallback) {

                thumbnailFallback.style.display =
                    "none";
            }

            videoThumbnailWrapper?.classList.remove(
                "is-loading"
            );
        };

        videoThumbnail.onerror = () => {
            showThumbnailFallback();
        };

        videoThumbnail.src =
            thumbnail;
    }


    function updatePreviewPlatform(platform) {

        const data =
            getPlatformData(platform);

        if (videoPreview) {

            videoPreview.classList.remove(
                "platform-youtube",
                "platform-tiktok",
                "platform-instagram",
                "platform-facebook",
                "platform-x",
                "platform-reddit",
                "platform-vimeo",
                "platform-generic",
                "platform-unknown"
            );

            const className =
                String(platform)
                    .toLowerCase()
                    .replace(
                        /[^a-z0-9]+/g,
                        "-"
                    );

            videoPreview.classList.add(
                `platform-${className}`
            );
        }

        if (previewSourceIcon) {
            previewSourceIcon.textContent =
                data.icon;
        }

        if (previewPlatformBadge) {

            const icon =
                previewPlatformBadge.querySelector(
                    ".platform-badge-icon"
                );

            const name =
                previewPlatformBadge.querySelector(
                    ".platform-badge-name"
                );

            if (icon) {
                icon.textContent =
                    data.icon;
            }

            if (name) {
                name.textContent =
                    data.label;
            }
        }
    }


    function displayVideoResult(data) {

        if (!data) {
            return;
        }

        const title =
            data.title ||
            data.name ||
            "Untitled video";

        const platform =
            getPlatformName(data);

        const source =
            platform !== "Generic" &&
            platform !== "Unknown"
                ? platform
                : getVideoSource(data) ||
                  platform;

        const duration =
            getVideoDuration(data);

        if (videoTitle) {
            videoTitle.textContent =
                title;
        }

        if (previewSource) {
            previewSource.textContent =
                source;
        }

        updatePreviewPlatform(platform);

        if (videoDuration) {

            videoDuration.textContent =
                duration !== null
                    ? formatDuration(duration)
                    : "--:--";
        }

        if (videoDurationInfo) {

            videoDurationInfo.textContent =
                duration !== null
                    ? formatDuration(duration)
                    : "Unknown";
        }

        if (videoReadyStatus) {

            videoReadyStatus.textContent =
                "Ready to download";
        }

        /*
         * Keep thumbnail loading before
         * the download options are populated.
         */
        displayThumbnail(data);

        populateQualityOptions(
            data.available_qualities ||
            data.qualities ||
            []
        );

        updateFormatOptionsForType();

        createQuickDownloadButton();

        applySavedDownloadSettings();

        updateSelectedInfo();

        resultSection?.classList.remove(
            "hidden"
        );

        resultSection?.classList.add(
            "fade-in"
        );

        setTimeout(() => {

            resultSection?.classList.remove(
                "fade-in"
            );

        }, 600);

        resultSection?.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }


    function populateQualityOptions(
        qualities
    ) {

        if (!quality) {
            return;
        }

        quality.innerHTML = "";

        let values = [];

        if (Array.isArray(qualities)) {

            qualities.forEach(item => {

                let value;

                if (
                    typeof item === "object" &&
                    item !== null
                ) {

                    value =
                        item.value ??
                        item.height ??
                        item.quality ??
                        item.resolution;

                } else {

                    value = item;
                }

                if (
                    value !== null &&
                    value !== undefined
                ) {

                    values.push(
                        String(value)
                            .replace(/p$/i, "")
                            .trim()
                    );
                }
            });
        }

        values = [
            ...new Set(
                values.filter(Boolean)
            )
        ];

        values =
            values.filter(
                value =>
                    /^\d+$/.test(value)
            );

        if (!values.length) {
            values = ["720"];
        }

        values.sort(
            (a, b) =>
                Number(b) - Number(a)
        );

        values.forEach(
            (value, index) => {

                const option =
                    document.createElement(
                        "option"
                    );

                option.value =
                    value;

                const size =
                    getQualitySize(value);

                let label =
                    formatQuality(
                        value,
                        {
                            best:
                                index === 0
                        }
                    );

                if (size) {

                    label +=
                        ` · Estimated ${formatBytes(size)}`;
                }

                option.textContent =
                    label;

                option.dataset.estimatedSize =
                    size || "";

                quality.appendChild(
                    option
                );
            }
        );
    }


    function getAudioFormats() {

        const backendFormats =
            currentVideo?.audio_formats;

        if (Array.isArray(backendFormats)) {

            const values =
                backendFormats
                    .map(item => {

                        if (
                            typeof item === "object" &&
                            item !== null
                        ) {

                            return (
                                item.value ??
                                item.format ??
                                item.ext ??
                                item.extension
                            );
                        }

                        return item;
                    })
                    .filter(Boolean)
                    .map(
                        value =>
                            String(value)
                                .trim()
                                .toLowerCase()
                    )
                    .filter(
                        value =>
                            value === "mp3" ||
                            value === "m4a"
                    );

            const unique =
                [...new Set(values)];

            if (unique.length) {
                return unique;
            }
        }

        return [
            "mp3",
            "m4a"
        ];
    }


    function getVideoFormats() {

        const formats =
            currentVideo?.available_formats ||
            currentVideo?.formats ||
            [];

        let values = [];

        if (Array.isArray(formats)) {

            formats.forEach(item => {

                let value;

                if (
                    typeof item === "object" &&
                    item !== null
                ) {

                    value =
                        item.value ??
                        item.format ??
                        item.ext ??
                        item.extension;

                } else {

                    value = item;
                }

                if (value) {

                    values.push(
                        String(value)
                            .trim()
                            .toLowerCase()
                    );
                }
            });
        }

        values = [
            ...new Set(values)
        ];

        values =
            values.filter(
                value =>
                    value === "mp4" ||
                    value === "webm" ||
                    value === "mkv" ||
                    value === "mov"
            );

        if (!values.length) {
            values = ["mp4"];
        }

        return values;
    }


    function populateFormatOptions(
        formats
    ) {

        if (!format) {
            return;
        }

        format.innerHTML = "";

        let values = [];

        if (Array.isArray(formats)) {

            formats.forEach(item => {

                let value;

                if (
                    typeof item === "object" &&
                    item !== null
                ) {

                    value =
                        item.value ??
                        item.format ??
                        item.ext ??
                        item.extension;

                } else {

                    value = item;
                }

                if (value) {

                    values.push(
                        String(value)
                            .trim()
                            .toLowerCase()
                    );
                }
            });
        }

        values = [
            ...new Set(
                values.filter(Boolean)
            )
        ];

        values =
            values.filter(
                value =>
                    value !== "mp3" &&
                    value !== "m4a"
            );

        if (!values.length) {
            values = ["mp4"];
        }

        values.forEach(value => {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                value;

            option.textContent =
                value === "mp4"
                    ? "MP4 — Recommended"
                    : formatFormat(value);

            format.appendChild(option);
        });
    }


    function populateAudioFormatOptions() {

        if (!format) {
            return;
        }

        format.innerHTML = "";

        const values =
            getAudioFormats();

        values.forEach(
            (value, index) => {

                const option =
                    document.createElement(
                        "option"
                    );

                option.value =
                    value;

                option.textContent =
                    index === 0 &&
                    value === "mp3"
                        ? "MP3 — Recommended"
                        : formatFormat(value);

                format.appendChild(option);
            }
        );
    }


    function updateFormatOptionsForType() {

        const type =
            downloadType?.value ||
            "video";

        if (type === "audio") {

            qualityOption?.classList.add(
                "hidden"
            );

            populateAudioFormatOptions();

        } else {

            qualityOption?.classList.remove(
                "hidden"
            );

            populateFormatOptions(
                getVideoFormats()
            );
        }
    }


    function updateSelectedInfo() {

        const type =
            downloadType?.value ||
            "video";

        if (
            selectedQualityInfo &&
            quality
        ) {

            if (type === "audio") {

                selectedQualityInfo.textContent =
                    "Audio Only";

            } else {

                const selectedQuality =
                    quality.value;

                const size =
                    getQualitySize(
                        selectedQuality
                    );

                let text =
                    formatQuality(
                        selectedQuality
                    );

                if (size) {

                    text +=
                        ` · Estimated ${formatBytes(size)}`;
                }

                selectedQualityInfo.textContent =
                    text;
            }
        }

        if (
            selectedFormatInfo &&
            format
        ) {

            selectedFormatInfo.textContent =
                formatFormat(
                    format.value
                );
        }
    }


    quality?.addEventListener(
        "change",
        updateSelectedInfo
    );


    format?.addEventListener(
        "change",
        updateSelectedInfo
    );


    downloadType?.addEventListener(
        "change",
        () => {

            updateFormatOptionsForType();

            applySavedDownloadSettings();

            updateSelectedInfo();

            if (quickDownloadBtn) {

                quickDownloadBtn.textContent =
                    downloadType.value === "audio"
                        ? "⚡ Download MP3"
                        : "⚡ Download Best Quality";
            }
        }
    );


    function createQuickDownloadButton() {

        if (!startDownloadBtn) {
            return;
        }

        if (
            quickDownloadBtn &&
            quickDownloadBtn.isConnected
        ) {
            return;
        }

        quickDownloadBtn =
            document.createElement(
                "button"
            );

        quickDownloadBtn.type =
            "button";

        quickDownloadBtn.id =
            "quickDownloadBtn";

        quickDownloadBtn.className =
            "quick-download-btn";

        quickDownloadBtn.innerHTML =
            downloadType?.value === "audio"
                ? "⚡ Download MP3"
                : "⚡ Download Best Quality";

        quickDownloadBtn.addEventListener(
            "click",
            () => {

                if (isAnalyzing) {
                    return;
                }

                const type =
                    downloadType?.value ||
                    "video";

                if (type === "audio") {

                    if (
                        format &&
                        format.options.length
                    ) {

                        const mp3 =
                            [
                                ...format.options
                            ].find(
                                option =>
                                    option.value ===
                                    "mp3"
                            );

                        if (mp3) {
                            format.value =
                                "mp3";
                        } else {
                            format.selectedIndex =
                                0;
                        }
                    }

                } else {

                    if (
                        quality &&
                        quality.options.length
                    ) {
                        quality.selectedIndex = 0;
                    }

                    if (
                        format &&
                        format.options.length
                    ) {
                        format.selectedIndex = 0;
                    }
                }

                updateSelectedInfo();

                startDownload();
            }
        );

        startDownloadBtn.parentNode.insertBefore(
            quickDownloadBtn,
            startDownloadBtn
        );
    }


    function applySavedDownloadSettings() {

        const savedQuality =
            getSavedSetting(
                SETTINGS_KEYS.quality,
                DEFAULT_SETTINGS.quality
            );

        const savedFormat =
            getSavedSetting(
                SETTINGS_KEYS.format,
                DEFAULT_SETTINGS.format
            );

        const type =
            downloadType?.value ||
            "video";

        if (
            quality &&
            type === "video" &&
            savedQuality !== "ask"
        ) {

            const option =
                [
                    ...quality.options
                ].find(
                    item =>
                        item.value ===
                        savedQuality
                );

            if (option) {
                quality.value =
                    savedQuality;
            }
        }

        if (
            format &&
            savedFormat !== "ask"
        ) {

            const compatible =
                type === "audio"
                    ? (
                        savedFormat === "mp3" ||
                        savedFormat === "m4a"
                    )
                    : (
                        savedFormat === "mp4" ||
                        savedFormat === "webm" ||
                        savedFormat === "mkv" ||
                        savedFormat === "mov"
                    );

            if (compatible) {

                const option =
                    [
                        ...format.options
                    ].find(
                        item =>
                            item.value ===
                            savedFormat
                    );

                if (option) {
                    format.value =
                        savedFormat;
                }
            }
        }
    }


    function createDownloadManager() {

        let manager =
            document.getElementById(
                "downloadManagerSection"
            );

        if (manager) {

            manager.classList.add(
                "visible"
            );

            manager.hidden = false;

            return manager;
        }

        manager =
            document.createElement(
                "section"
            );

        manager.id =
            "downloadManagerSection";

        manager.className =
            "download-manager-section visible";

        manager.hidden = false;

        manager.innerHTML = `
            <div class="download-manager-header">

                <div>

                    <span class="section-eyebrow">
                        DOWNLOAD MANAGER
                    </span>

                    <h2>
                        Your Downloads
                    </h2>

                    <p>
                        Track your downloads in real time.
                    </p>

                </div>

                <button
                    type="button"
                    id="clearCompletedDownloads"
                    class="clear-completed-btn"
                >
                    Clear Completed
                </button>

            </div>

            <div
                id="downloadManagerList"
                class="download-manager-list"
            ></div>
        `;

        if (resultSection) {

            resultSection.insertAdjacentElement(
                "afterend",
                manager
            );

        } else {

            const main =
                document.querySelector("main") ||
                document.body;

            main.appendChild(manager);
        }

        manager
            .querySelector(
                "#clearCompletedDownloads"
            )
            ?.addEventListener(
                "click",
                clearCompletedDownloads
            );

        return manager;
    }


    function createDownloadCard(job) {

        if (!job) {
            return null;
        }

        const jobId =
            job.id ??
            job.job_id ??
            job.jobId;

        if (
            jobId === null ||
            jobId === undefined ||
            jobId === ""
        ) {
            return null;
        }

        const key =
            String(jobId);

        const existingJob =
            downloadJobs.get(key);

        if (existingJob?.card) {
            return existingJob.card;
        }

        const manager =
            createDownloadManager();

        if (!manager) {
            return null;
        }

        const list =
            document.getElementById(
                "downloadManagerList"
            );

        if (!list) {
            return null;
        }

        const card =
            document.createElement(
                "article"
            );

        card.id =
            `download-job-${key}`;

        card.className =
            "download-manager-card downloading";

        const title =
            job.title ||
            job.filename ||
            "Video download";

        const source =
            job.source ||
            job.platform ||
            "";

        card.innerHTML = `
            <div class="download-card-top">

                <div class="download-card-icon">
                    ↓
                </div>

                <div class="download-card-heading">

                    <div class="download-card-title">
                        ${escapeHTML(title)}
                    </div>

                    <div class="download-card-meta">
                        ${escapeHTML(source)}
                    </div>

                </div>

                <div class="download-card-percent">
                    0%
                </div>

            </div>

            <div class="download-card-status">
                Preparing download...
            </div>

            <div class="download-card-track">

                <div
                    class="download-card-bar"
                    style="width: 0%;"
                ></div>

            </div>

            <div class="download-card-details">

                <span class="download-card-size">
                    0 MB
                </span>

                <span class="download-card-speed">
                    Calculating...
                </span>

                <span class="download-card-eta">
                    ETA: --
                </span>

            </div>

            <div class="download-card-actions">

                <button
                    type="button"
                    class="download-pause-btn"
                >
                    ⏸ Pause
                </button>

                <button
                    type="button"
                    class="download-resume-btn hidden"
                >
                    ▶ Resume
                </button>

                <button
                    type="button"
                    class="download-card-cancel"
                >
                    Cancel
                </button>

                <button
                    type="button"
                    class="download-card-retry hidden"
                >
                    Retry
                </button>

                <a
                    class="download-card-open hidden"
                    target="_blank"
                    rel="noopener"
                    download
                >
                    Open File
                </a>

            </div>

            <div class="download-card-error hidden"></div>
        `;

        list.prepend(card);

        const pauseButton =
            card.querySelector(
                ".download-pause-btn"
            );

        const resumeButton =
            card.querySelector(
                ".download-resume-btn"
            );

        const cancelButton =
            card.querySelector(
                ".download-card-cancel"
            );

        const retryButton =
            card.querySelector(
                ".download-card-retry"
            );

        pauseButton?.addEventListener(
            "click",
            () => pauseDownload(key)
        );

        resumeButton?.addEventListener(
            "click",
            () => resumeDownload(key)
        );

        cancelButton?.addEventListener(
            "click",
            () => cancelDownload(key)
        );

        retryButton?.addEventListener(
            "click",
            () => retryDownload(key)
        );

        const initialState =
            String(
                job.status ||
                job.state ||
                ""
            ).toLowerCase();

        downloadJobs.set(
            key,
            {
                ...job,
                id: key,
                card,
                progressErrors: 0,
                pollingInProgress: false,
                completionHandled:
                    initialState === "completed",
                fileOpened: false,
                actionInProgress: false,
                pendingAction: null
            }
        );

        return card;
    }


    function normalizeJobResponse(data) {

        if (!data) {
            return null;
        }

        if (
            data.job &&
            typeof data.job === "object"
        ) {

            return {
                ...data.job,
                id:
                    data.job.id ??
                    data.job.job_id ??
                    data.job.jobId
            };
        }

        if (
            data.new_job &&
            typeof data.new_job === "object"
        ) {

            return {
                ...data.new_job,
                id:
                    data.new_job.id ??
                    data.new_job.job_id ??
                    data.new_job.jobId
            };
        }

        if (
            data.download &&
            typeof data.download === "object"
        ) {

            return {
                ...data.download,
                id:
                    data.download.id ??
                    data.download.job_id ??
                    data.download.jobId
            };
        }

        if (
            data.data &&
            typeof data.data === "object"
        ) {

            if (
                data.data.job &&
                typeof data.data.job === "object"
            ) {

                return {
                    ...data.data.job,
                    id:
                        data.data.job.id ??
                        data.data.job.job_id ??
                        data.data.job.jobId
                };
            }

            if (
                data.data.id !== undefined ||
                data.data.job_id !== undefined ||
                data.data.jobId !== undefined ||
                data.data.status ||
                data.data.progress !== undefined
            ) {

                return {
                    ...data.data,
                    id:
                        data.data.id ??
                        data.data.job_id ??
                        data.data.jobId
                };
            }
        }

        if (
            data.id !== undefined ||
            data.job_id !== undefined ||
            data.jobId !== undefined ||
            data.status ||
            data.progress !== undefined
        ) {

            return {
                ...data,
                id:
                    data.id ??
                    data.job_id ??
                    data.jobId
            };
        }

        return null;
    }


    function updateDownloadCard(
        jobId,
        responseData
    ) {

        const key =
            String(jobId);

        const existingJob =
            downloadJobs.get(key);

        if (!existingJob?.card) {
            return;
        }

        const data =
            normalizeJobResponse(
                responseData
            ) ||
            responseData;

        if (!data) {
            return;
        }

        const job = {
            ...existingJob,
            ...data,
            id: key,
            card: existingJob.card,
            progressErrors:
                existingJob.progressErrors || 0,
            pollingInProgress: false,
            completionHandled:
                existingJob.completionHandled || false,
            fileOpened:
                existingJob.fileOpened || false,
            actionInProgress:
                existingJob.actionInProgress || false,
            pendingAction:
                existingJob.pendingAction || null
        };

        downloadJobs.set(
            key,
            job
        );

        const card =
            job.card;

        let percent =
            Number(
                data.progress ??
                data.percent ??
                data.percentage ??
                0
            );

        if (Number.isNaN(percent)) {
            percent = 0;
        }

        percent =
            Math.max(
                0,
                Math.min(100, percent)
            );

        const state =
            String(
                data.status ||
                data.state ||
                "downloading"
            ).toLowerCase();

        const isPaused =
            state === "paused" ||
            state === "pause_requested";

        const isPauseRequested =
            state === "pause_requested";

        const isProcessing =
            state === "processing" ||
            state === "postprocessing" ||
            state === "post-processing" ||
            state === "merging" ||
            state === "finalizing";

        if (
            isProcessing &&
            percent >= 100
        ) {
            percent = 99;
        }

        const downloaded =
            Number(
                data.downloaded_bytes ??
                data.downloaded ??
                data.bytes_downloaded ??
                0
            );

        const total =
            Number(
                data.total_bytes ??
                data.total ??
                data.filesize ??
                data.file_size ??
                data.estimated_size ??
                job.estimated_size ??
                0
            );

        const speed =
            Number(
                data.speed ??
                data.speed_bytes ??
                data.download_speed ??
                0
            );

        let eta =
            Number(
                data.eta ??
                data.estimated_time ??
                data.eta_seconds
            );

        if (
            Number.isNaN(eta) ||
            eta < 0
        ) {
            eta = null;
        }

        const percentElement =
            card.querySelector(
                ".download-card-percent"
            );

        const bar =
            card.querySelector(
                ".download-card-bar"
            );

        const statusElement =
            card.querySelector(
                ".download-card-status"
            );

        const sizeElement =
            card.querySelector(
                ".download-card-size"
            );

        const speedElement =
            card.querySelector(
                ".download-card-speed"
            );

        const etaElement =
            card.querySelector(
                ".download-card-eta"
            );

        const errorElement =
            card.querySelector(
                ".download-card-error"
            );

        const pauseButton =
            card.querySelector(
                ".download-pause-btn"
            );

        const resumeButton =
            card.querySelector(
                ".download-resume-btn"
            );

        const cancelButton =
            card.querySelector(
                ".download-card-cancel"
            );


        if (percentElement) {

            percentElement.textContent =
                `${Math.round(percent)}%`;
        }


        if (bar) {

            bar.style.width =
                `${percent}%`;
        }


        if (sizeElement) {

            sizeElement.textContent =
                total > 0
                    ? `${formatBytes(downloaded)} / ${formatBytes(total)}`
                    : formatBytes(downloaded);
        }


        if (speedElement) {

            if (isProcessing) {

                speedElement.textContent =
                    "Processing...";

            } else if (isPaused) {

                speedElement.textContent =
                    isPauseRequested
                        ? "Pausing..."
                        : "Paused";

            } else if (
                job.pendingAction === "resume"
            ) {

                speedElement.textContent =
                    "Resuming...";

            } else {

                speedElement.textContent =
                    speed > 0
                        ? `${formatBytes(speed)}/s`
                        : "Calculating...";
            }
        }


        if (etaElement) {

            etaElement.textContent =
                isProcessing ||
                isPaused ||
                job.pendingAction
                    ? "ETA: --"
                    : eta !== null
                        ? `ETA: ${formatETA(eta)}`
                        : "ETA: --";
        }


        if (errorElement) {

            if (
                data.error ||
                data.message
            ) {

                errorElement.textContent =
                    data.error ||
                    data.message;

                errorElement.classList.remove(
                    "hidden"
                );

            } else {

                errorElement.textContent =
                    "";

                errorElement.classList.add(
                    "hidden"
                );
            }
        }


        if (state === "completed") {

            setDownloadCardCompleted(
                key,
                job
            );

            return;
        }


        if (
            state === "failed" ||
            state === "error"
        ) {

            setDownloadCardFailed(
                key,
                data.error ||
                data.message ||
                "Download failed."
            );

            return;
        }


        if (
            state === "cancelled" ||
            state === "canceled"
        ) {

            setDownloadCardCancelled(
                key
            );

            return;
        }


        card.classList.remove(
            "completed",
            "failed",
            "cancelled",
            "paused"
        );


        if (isPaused) {

            card.classList.add(
                "paused"
            );

        } else {

            card.classList.add(
                "downloading"
            );
        }


        if (statusElement) {

            if (
                job.pendingAction === "pause"
            ) {

                statusElement.textContent =
                    "Pausing download...";

            } else if (
                job.pendingAction === "resume"
            ) {

                statusElement.textContent =
                    "Resuming download...";

            } else if (isPauseRequested) {

                statusElement.textContent =
                    "Pausing download...";

            } else if (
                state === "paused"
            ) {

                statusElement.textContent =
                    "Download paused";

            } else if (isProcessing) {

                statusElement.textContent =
                    "Preparing your video...";

            } else if (
                state === "queued"
            ) {

                statusElement.textContent =
                    "Queued...";

            } else {

                statusElement.textContent =
                    "Downloading...";
            }
        }


        if (pauseButton) {

            pauseButton.classList.toggle(
                "hidden",
                isPaused ||
                job.pendingAction === "pause"
            );

            pauseButton.disabled =
                Boolean(
                    job.actionInProgress
                );
        }


        if (resumeButton) {

            resumeButton.classList.toggle(
                "hidden",
                !isPaused &&
                job.pendingAction !== "resume"
            );

            resumeButton.disabled =
                Boolean(
                    job.actionInProgress
                );
        }


        if (cancelButton) {

            cancelButton.classList.remove(
                "hidden"
            );

            cancelButton.disabled =
                Boolean(
                    job.actionInProgress
                );
        }
    }


    function setDownloadCardCompleted(
        jobId,
        data = {}
    ) {

        const key =
            String(jobId);

        const job =
            downloadJobs.get(key);

        if (!job?.card) {
            return;
        }

        const alreadyCompleted =
            job.completionHandled;

        const completedJob = {
            ...job,
            ...data,
            id: key,
            completionHandled: true,
            fileOpened:
                job.fileOpened || false,
            actionInProgress: false,
            pendingAction: null
        };

        downloadJobs.set(
            key,
            completedJob
        );

        const card =
            completedJob.card;

        card.classList.remove(
            "downloading",
            "failed",
            "cancelled",
            "paused"
        );

        card.classList.add(
            "completed"
        );

        const percent =
            card.querySelector(
                ".download-card-percent"
            );

        const bar =
            card.querySelector(
                ".download-card-bar"
            );

        const statusElement =
            card.querySelector(
                ".download-card-status"
            );

        const pauseButton =
            card.querySelector(
                ".download-pause-btn"
            );

        const resumeButton =
            card.querySelector(
                ".download-resume-btn"
            );

        const cancelButton =
            card.querySelector(
                ".download-card-cancel"
            );

        const retryButton =
            card.querySelector(
                ".download-card-retry"
            );

        const open =
            card.querySelector(
                ".download-card-open"
            );

        if (percent) {
            percent.textContent =
                "100%";
        }

        if (bar) {
            bar.style.width =
                "100%";
        }

        if (statusElement) {
            statusElement.textContent =
                "Download completed";
        }

        pauseButton?.classList.add(
            "hidden"
        );

        resumeButton?.classList.add(
            "hidden"
        );

        cancelButton?.classList.add(
            "hidden"
        );

        retryButton?.classList.add(
            "hidden"
        );

        if (open) {

            open.href =
                `/api/download-file/${encodeURIComponent(key)}`;

            open.setAttribute(
                "download",
                ""
            );

            open.classList.remove(
                "hidden"
            );
        }

        stopJobPolling(key);

        if (!alreadyCompleted) {

            loadHistory();

            showNotification(
                "success",
                "Download complete",
                "Your file is ready to download.",
                4000
            );
        }
    }


    function setDownloadCardFailed(
        jobId,
        message
    ) {

        const key =
            String(jobId);

        const job =
            downloadJobs.get(key);

        if (!job?.card) {
            return;
        }

        const card =
            job.card;

        card.classList.remove(
            "downloading",
            "completed",
            "cancelled",
            "paused"
        );

        card.classList.add(
            "failed"
        );

        const statusElement =
            card.querySelector(
                ".download-card-status"
            );

        const pauseButton =
            card.querySelector(
                ".download-pause-btn"
            );

        const resumeButton =
            card.querySelector(
                ".download-resume-btn"
            );

        const cancelButton =
            card.querySelector(
                ".download-card-cancel"
            );

        const retryButton =
            card.querySelector(
                ".download-card-retry"
            );

        const open =
            card.querySelector(
                ".download-card-open"
            );

        const errorElement =
            card.querySelector(
                ".download-card-error"
            );

        if (statusElement) {

            statusElement.textContent =
                "Download failed";
        }

        if (errorElement) {

            errorElement.textContent =
                message ||
                "Download failed.";

            errorElement.classList.remove(
                "hidden"
            );
        }

        pauseButton?.classList.add(
            "hidden"
        );

        resumeButton?.classList.add(
            "hidden"
        );

        cancelButton?.classList.add(
            "hidden"
        );

        open?.classList.add(
            "hidden"
        );

        retryButton?.classList.remove(
            "hidden"
        );

        if (retryButton) {

            retryButton.disabled =
                false;

            retryButton.textContent =
                "Retry";
        }

        stopJobPolling(key);

        downloadJobs.set(
            key,
            {
                ...job,
                status: "failed",
                actionInProgress: false,
                pendingAction: null
            }
        );
    }


    function setDownloadCardCancelled(
        jobId
    ) {

        const key =
            String(jobId);

        const job =
            downloadJobs.get(key);

        if (!job?.card) {
            return;
        }

        const card =
            job.card;

        card.classList.remove(
            "downloading",
            "completed",
            "failed",
            "paused"
        );

        card.classList.add(
            "cancelled"
        );

        const statusElement =
            card.querySelector(
                ".download-card-status"
            );

        const pauseButton =
            card.querySelector(
                ".download-pause-btn"
            );

        const resumeButton =
            card.querySelector(
                ".download-resume-btn"
            );

        const cancelButton =
            card.querySelector(
                ".download-card-cancel"
            );

        const retryButton =
            card.querySelector(
                ".download-card-retry"
            );

        const open =
            card.querySelector(
                ".download-card-open"
            );

        if (statusElement) {

            statusElement.textContent =
                "Download cancelled";
        }

        pauseButton?.classList.add(
            "hidden"
        );

        resumeButton?.classList.add(
            "hidden"
        );

        cancelButton?.classList.add(
            "hidden"
        );

        open?.classList.add(
            "hidden"
        );

        retryButton?.classList.remove(
            "hidden"
        );

        if (retryButton) {

            retryButton.disabled =
                false;

            retryButton.textContent =
                "Retry";
        }

        stopJobPolling(key);

        downloadJobs.set(
            key,
            {
                ...job,
                status: "cancelled",
                actionInProgress: false,
                pendingAction: null
            }
        );
    }


    async function runJobAction(
        jobId,
        action
    ) {

        const key =
            String(jobId);

        if (
            jobActionRequests.has(key)
        ) {
            return null;
        }

        jobActionRequests.set(
            key,
            true
        );

        const job =
            downloadJobs.get(key);

        /*
         * Give the user instant feedback.
         * The server request still happens normally.
         */
        if (job) {

            job.actionInProgress =
                true;

            job.pendingAction =
                action;

            downloadJobs.set(
                key,
                job
            );

            updateDownloadCard(
                key,
                job
            );
        }

        try {

            const response =
                await fetch(
                    `/api/${action}/${encodeURIComponent(key)}`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type":
                                "application/json"
                        }
                    }
                );

            let data = null;

            try {
                data =
                    await response.json();
            } catch {
                data = null;
            }

            if (!response.ok) {

                throw new Error(
                    data?.error ||
                    data?.message ||
                    `Unable to ${action} download.`
                );
            }

            return data;

        } finally {

            jobActionRequests.delete(
                key
            );

            const currentJob =
                downloadJobs.get(key);

            if (currentJob) {

                currentJob.actionInProgress =
                    false;

                downloadJobs.set(
                    key,
                    currentJob
                );
            }
        }
    }


    async function pauseDownload(
        jobId
    ) {

        const key =
            String(jobId);

        try {

            const data =
                await runJobAction(
                    key,
                    "pause"
                );

            if (!data) {
                return;
            }

            const job =
                normalizeJobResponse(
                    data
                );

            if (job) {

                updateDownloadCard(
                    key,
                    job
                );
            }

            const currentJob =
                downloadJobs.get(key);

            if (currentJob) {

                currentJob.pendingAction =
                    null;

                downloadJobs.set(
                    key,
                    currentJob
                );
            }

            showNotification(
                "info",
                "Pause requested",
                "The download is being paused.",
                2500
            );

        } catch (error) {

            const currentJob =
                downloadJobs.get(key);

            if (currentJob) {

                currentJob.pendingAction =
                    null;

                currentJob.actionInProgress =
                    false;

                downloadJobs.set(
                    key,
                    currentJob
                );

                updateDownloadCard(
                    key,
                    currentJob
                );
            }

            showNotification(
                "error",
                "Pause failed",
                error.message ||
                "Unable to pause download.",
                4000
            );
        }
    }


    async function resumeDownload(
        jobId
    ) {

        const key =
            String(jobId);

        try {

            const data =
                await runJobAction(
                    key,
                    "resume"
                );

            if (!data) {
                return;
            }

            const job =
                normalizeJobResponse(
                    data
                );

            if (job) {

                updateDownloadCard(
                    key,
                    job
                );
            }

            const currentJob =
                downloadJobs.get(key);

            if (currentJob) {

                currentJob.pendingAction =
                    null;

                downloadJobs.set(
                    key,
                    currentJob
                );
            }

            startJobPolling(key);

            showNotification(
                "info",
                "Download resumed",
                "The download has been resumed.",
                2500
            );

        } catch (error) {

            const currentJob =
                downloadJobs.get(key);

            if (currentJob) {

                currentJob.pendingAction =
                    null;

                currentJob.actionInProgress =
                    false;

                downloadJobs.set(
                    key,
                    currentJob
                );

                updateDownloadCard(
                    key,
                    currentJob
                );
            }

            showNotification(
                "error",
                "Resume failed",
                error.message ||
                "Unable to resume download.",
                4000
            );
        }
    }


    async function cancelDownload(
        jobId
    ) {

        const key =
            String(jobId);

        try {

            const data =
                await runJobAction(
                    key,
                    "cancel"
                );

            if (!data) {
                return;
            }

            const job =
                normalizeJobResponse(
                    data
                );

            if (job) {

                updateDownloadCard(
                    key,
                    job
                );

                const state =
                    String(
                        job.status ||
                        job.state ||
                        ""
                    ).toLowerCase();

                if (
                    state === "cancelled" ||
                    state === "canceled"
                ) {

                    setDownloadCardCancelled(
                        key
                    );
                }

            } else {

                setDownloadCardCancelled(
                    key
                );
            }

            showNotification(
                "info",
                "Cancellation requested",
                "The download is being cancelled.",
                3000
            );

        } catch (error) {

            const currentJob =
                downloadJobs.get(key);

            if (currentJob) {

                currentJob.actionInProgress =
                    false;

                currentJob.pendingAction =
                    null;

                downloadJobs.set(
                    key,
                    currentJob
                );

                updateDownloadCard(
                    key,
                    currentJob
                );
            }

            showNotification(
                "error",
                "Cancel failed",
                error.message ||
                "Unable to cancel download.",
                4000
            );
        }
    }


    async function retryDownload(
        jobId
    ) {

        const oldKey =
            String(jobId);

        const oldJob =
            downloadJobs.get(oldKey);

        if (!oldJob) {

            showNotification(
                "error",
                "Retry failed",
                "The download job could not be found.",
                4000
            );

            return;
        }

        if (
            jobActionRequests.has(oldKey)
        ) {
            return;
        }

        const retryButton =
            oldJob.card?.querySelector(
                ".download-card-retry"
            );

        if (retryButton) {

            retryButton.disabled =
                true;

            retryButton.textContent =
                "Retrying...";
        }

        jobActionRequests.set(
            oldKey,
            true
        );

        try {

            const response =
                await fetch(
                    `/api/retry/${encodeURIComponent(oldKey)}`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type":
                                "application/json"
                        }
                    }
                );

            let data = null;

            try {
                data =
                    await response.json();
            } catch {
                data = null;
            }

            if (!response.ok) {

                throw new Error(
                    data?.error ||
                    data?.message ||
                    "Unable to retry download."
                );
            }

            const newJob =
                normalizeJobResponse(
                    data
                );

            if (!newJob) {

                throw new Error(
                    "The server did not return a valid download job."
                );
            }

            const newJobId =
                newJob.id ??
                newJob.job_id ??
                newJob.jobId;

            if (
                newJobId === null ||
                newJobId === undefined ||
                newJobId === ""
            ) {

                throw new Error(
                    "The server did not return a new download ID."
                );
            }

            const newKey =
                String(newJobId);

            const normalizedJob = {
                ...newJob,
                id: newKey,
                completionHandled: false,
                fileOpened: false,
                actionInProgress: false,
                pendingAction: null
            };

            stopJobPolling(
                oldKey
            );

            oldJob.card?.remove();

            downloadJobs.delete(
                oldKey
            );

            createDownloadCard(
                normalizedJob
            );

            currentJobId =
                newKey;

            updateDownloadCard(
                newKey,
                normalizedJob
            );

            startJobPolling(
                newKey
            );

            showNotification(
                "info",
                "Download restarted",
                "The download has been queued again.",
                3000
            );

        } catch (error) {

            if (retryButton) {

                retryButton.disabled =
                    false;

                retryButton.textContent =
                    "Retry";
            }

            showNotification(
                "error",
                "Retry failed",
                error?.message ||
                "Unable to restart the download.",
                5000
            );

        } finally {

            jobActionRequests.delete(
                oldKey
            );

            const currentJob =
                downloadJobs.get(
                    oldKey
                );

            if (currentJob) {

                currentJob.actionInProgress =
                    false;

                downloadJobs.set(
                    oldKey,
                    currentJob
                );
            }
        }
    }


    function startJobPolling(
        jobId
    ) {

        const key =
            String(jobId);

        stopJobPolling(key);

        checkJobProgress(key);

        const interval =
            setInterval(
                () => checkJobProgress(key),
                1000
            );

        jobPollingIntervals.set(
            key,
            interval
        );
    }


    function stopJobPolling(
        jobId
    ) {

        const key =
            String(jobId);

        const interval =
            jobPollingIntervals.get(
                key
            );

        if (interval) {

            clearInterval(
                interval
            );

            jobPollingIntervals.delete(
                key
            );
        }

        jobPollingRequests.delete(
            key
        );
    }


    async function checkJobProgress(
        jobId
    ) {

        const key =
            String(jobId);

        const job =
            downloadJobs.get(key);

        if (!job) {

            stopJobPolling(key);

            return;
        }

        if (
            jobPollingRequests.has(key)
        ) {
            return;
        }

        jobPollingRequests.set(
            key,
            true
        );

        try {

            const response =
                await fetch(
                    `/api/progress/${encodeURIComponent(key)}`,
                    {
                        cache: "no-store"
                    }
                );

            if (!response.ok) {

                if (
                    response.status === 404
                ) {

                    throw new Error(
                        "Download job no longer exists."
                    );
                }

                throw new Error(
                    "Unable to get download progress."
                );
            }

            const data =
                await response.json();

            const currentJob =
                downloadJobs.get(key);

            if (!currentJob) {
                return;
            }

            currentJob.progressErrors =
                0;

            downloadJobs.set(
                key,
                currentJob
            );

            /*
             * Do not allow an old polling response
             * to immediately erase the instant
             * Pause/Resume feedback.
             */
            if (
                currentJob.pendingAction &&
                currentJob.actionInProgress
            ) {

                const state =
                    String(
                        data?.status ||
                        data?.state ||
                        ""
                    ).toLowerCase();

                if (
                    state !== "paused" &&
                    state !== "completed" &&
                    state !== "failed" &&
                    state !== "error" &&
                    state !== "cancelled" &&
                    state !== "canceled"
                ) {

                    updateDownloadCard(
                        key,
                        {
                            ...data,
                            pendingAction:
                                currentJob.pendingAction,
                            actionInProgress:
                                true
                        }
                    );

                } else {

                    updateDownloadCard(
                        key,
                        data
                    );
                }

            } else {

                updateDownloadCard(
                    key,
                    data
                );
            }

            const normalized =
                normalizeJobResponse(
                    data
                );

            const state =
                String(
                    normalized?.status ||
                    normalized?.state ||
                    data?.status ||
                    data?.state ||
                    ""
                ).toLowerCase();

            if (
                TERMINAL_STATES.has(state)
            ) {

                stopJobPolling(key);
            }

        } catch (error) {

            const currentJob =
                downloadJobs.get(key);

            if (!currentJob) {
                return;
            }

            currentJob.progressErrors =
                (currentJob.progressErrors || 0) + 1;

            downloadJobs.set(
                key,
                currentJob
            );

            console.error(
                `Download ${key} progress error:`,
                error
            );

            if (
                currentJob.progressErrors >=
                MAX_PROGRESS_ERRORS
            ) {

                setDownloadCardFailed(
                    key,
                    "Unable to track the download progress."
                );
            }

        } finally {

            jobPollingRequests.delete(
                key
            );
        }
    }


    async function restoreActiveDownloads() {

        try {

            const response =
                await fetch(
                    "/api/jobs",
                    {
                        cache: "no-store"
                    }
                );

            if (!response.ok) {
                return;
            }

            const data =
                await response.json();

            if (
                !data ||
                !Array.isArray(data.jobs)
            ) {
                return;
            }

            const jobs =
                [...data.jobs].sort(
                    (a, b) => {

                        const dateA =
                            new Date(
                                a.created_at || 0
                            ).getTime();

                        const dateB =
                            new Date(
                                b.created_at || 0
                            ).getTime();

                        return (
                            (isNaN(dateB) ? 0 : dateB) -
                            (isNaN(dateA) ? 0 : dateA)
                        );
                    }
                );

            jobs.forEach(job => {

                if (!job) {
                    return;
                }

                const rawId =
                    job.id ??
                    job.job_id ??
                    job.jobId;

                if (
                    rawId === null ||
                    rawId === undefined ||
                    rawId === ""
                ) {
                    return;
                }

                const jobId =
                    String(rawId);

                const normalizedJob = {
                    ...job,
                    id: jobId
                };

                const card =
                    createDownloadCard(
                        normalizedJob
                    );

                if (!card) {
                    return;
                }

                updateDownloadCard(
                    jobId,
                    normalizedJob
                );

                const state =
                    String(
                        job.status ||
                        job.state ||
                        ""
                    ).toLowerCase();

                if (
                    ACTIVE_STATES.has(state)
                ) {

                    startJobPolling(
                        jobId
                    );
                }
            });

        } catch (error) {

            console.error(
                "Restore downloads error:",
                error
            );
        }
    }


    async function startDownload() {

        if (isAnalyzing) {
            return;
        }

        if (!currentVideo) {

            showNotification(
                "warning",
                "No video",
                "Analyze a video first.",
                3500
            );

            return;
        }

        const url =
            videoUrl?.value ||
            currentVideo.url ||
            currentVideo.webpage_url ||
            "";

        const normalizedUrl =
            normalizeUrlInput(url);

        if (
            !isValidHttpUrl(
                normalizedUrl
            )
        ) {

            showNotification(
                "error",
                "Invalid URL",
                "Please analyze a valid video URL.",
                3500
            );

            return;
        }

        const selectedDownloadType =
            downloadType?.value ||
            "video";

        let selectedQuality =
            quality?.value ||
            "720";

        let selectedFormat =
            format?.value ||
            "mp4";


        if (
            selectedDownloadType ===
            "audio"
        ) {

            if (
                selectedFormat !== "mp3" &&
                selectedFormat !== "m4a"
            ) {

                selectedFormat =
                    "mp3";
            }

            selectedQuality =
                "audio";

        } else {

            if (
                selectedQuality === "ask"
            ) {

                selectedQuality =
                    quality?.options?.[0]?.value ||
                    "720";
            }

            if (
                selectedFormat === "ask" ||
                selectedFormat === "mp3" ||
                selectedFormat === "m4a"
            ) {

                selectedFormat =
                    format?.options?.[0]?.value ||
                    "mp4";
            }
        }


        const estimatedSize =
            selectedDownloadType === "audio"
                ? null
                : getQualitySize(
                    selectedQuality
                );


        const title =
            currentVideo.title ||
            currentVideo.name ||
            "Video download";


        const source =
            getVideoSource(
                currentVideo
            ) ||
            getPlatformName(
                currentVideo
            );


        const duration =
            getVideoDuration(
                currentVideo
            );


        if (startDownloadBtn) {
            startDownloadBtn.disabled =
                true;
        }

        if (quickDownloadBtn) {
            quickDownloadBtn.disabled =
                true;
        }


        try {

            const response =
                await fetch(
                    "/api/download",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type":
                                "application/json"
                        },
                        body: JSON.stringify({
                            url: normalizedUrl,
                            quality: selectedQuality,
                            format: selectedFormat,
                            download_type:
                                selectedDownloadType,
                            estimated_size:
                                estimatedSize,
                            title,
                            source,
                            duration
                        })
                    }
                );


            let data = null;

            try {
                data =
                    await response.json();
            } catch {
                data = null;
            }


            if (
                response.status === 409
            ) {

                const existingJob =
                    normalizeJobResponse(
                        data
                    );

                if (
                    existingJob &&
                    existingJob.id !== undefined &&
                    existingJob.id !== null
                ) {

                    const existingKey =
                        String(
                            existingJob.id
                        );

                    createDownloadCard({
                        ...existingJob,
                        id: existingKey
                    });

                    updateDownloadCard(
                        existingKey,
                        existingJob
                    );

                    const state =
                        String(
                            existingJob.status ||
                            existingJob.state ||
                            ""
                        ).toLowerCase();

                    if (
                        ACTIVE_STATES.has(
                            state
                        )
                    ) {

                        startJobPolling(
                            existingKey
                        );
                    }

                    currentJobId =
                        existingKey;

                    showNotification(
                        "info",
                        "Already downloading",
                        "This download is already in your download manager.",
                        3500
                    );

                    const manager =
                        createDownloadManager();

                    manager?.scrollIntoView({
                        behavior: "smooth",
                        block: "start"
                    });

                    return;
                }

                throw new Error(
                    data?.error ||
                    "This download is already in progress."
                );
            }


            if (!response.ok) {

                throw new Error(
                    data?.error ||
                    data?.message ||
                    "Unable to start download."
                );
            }


            const job =
                normalizeJobResponse(
                    data
                );

            if (
                !job ||
                job.id === undefined ||
                job.id === null
            ) {

                throw new Error(
                    "The server did not return a download job."
                );
            }


            const jobId =
                String(job.id);

            const normalizedJob = {
                ...job,
                id: jobId,
                completionHandled: false,
                fileOpened: false,
                actionInProgress: false,
                pendingAction: null
            };

            currentJobId =
                jobId;


            createDownloadCard(
                normalizedJob
            );


            updateDownloadCard(
                jobId,
                normalizedJob
            );


            startJobPolling(
                jobId
            );


            if (
                selectedDownloadType ===
                "audio"
            ) {

                showStatus(
                    "Your audio is downloading..."
                );

                if (videoReadyStatus) {

                    videoReadyStatus.textContent =
                        "Downloading audio...";
                }

            } else {

                showStatus(
                    "Your video is downloading..."
                );

                if (videoReadyStatus) {

                    videoReadyStatus.textContent =
                        "Downloading...";
                }
            }


            showNotification(
                "info",
                "Download started",
                estimatedSize
                    ? `Estimated size: ${formatBytes(estimatedSize)}`
                    : selectedDownloadType === "audio"
                        ? `${formatFormat(selectedFormat)} audio is now downloading.`
                        : "Your video is now downloading.",
                3500
            );


            const manager =
                createDownloadManager();

            manager?.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });


        } catch (error) {

            showNotification(
                "error",
                "Download failed to start",
                error.message ||
                "Unable to start download.",
                5000
            );

            showStatus(
                error.message ||
                "Unable to start download.",
                "error"
            );

        } finally {

            if (startDownloadBtn) {
                startDownloadBtn.disabled =
                    false;
            }

            if (quickDownloadBtn) {
                quickDownloadBtn.disabled =
                    false;
            }
        }
    }


    startDownloadBtn?.addEventListener(
        "click",
        startDownload
    );


    async function clearCompletedDownloads() {

        const completedIds = [];

        downloadJobs.forEach(
            (job, jobId) => {

                if (
                    job.card?.classList.contains(
                        "completed"
                    )
                ) {

                    completedIds.push(
                        jobId
                    );
                }
            }
        );


        if (!completedIds.length) {

            showNotification(
                "info",
                "Nothing to clear",
                "There are no completed downloads.",
                2500
            );

            return;
        }


        completedIds.forEach(
            jobId => {

                const job =
                    downloadJobs.get(
                        jobId
                    );

                job?.card?.remove();

                downloadJobs.delete(
                    jobId
                );

                stopJobPolling(
                    jobId
                );
            }
        );


        try {

            const response =
                await fetch(
                    "/api/clear-completed",
                    {
                        method: "DELETE"
                    }
                );

            if (!response.ok) {

                throw new Error(
                    "Unable to clear completed downloads."
                );
            }

        } catch (error) {

            console.error(
                "Clear completed request:",
                error
            );
        }


        showNotification(
            "success",
            "Downloads cleared",
            "Completed downloads were removed from the manager.",
            2500
        );
    }


    function resetDownloadState() {

        currentVideo = null;
        currentJobId = null;

        if (videoUrl) {
            videoUrl.value = "";
        }

        clearPlatformDetection();

        resultSection?.classList.add(
            "hidden"
        );

        if (videoReadyStatus) {

            videoReadyStatus.textContent =
                "Ready to download";
        }

        if (videoTitle) {
            videoTitle.textContent = "";
        }

        if (previewSource) {
            previewSource.textContent = "";
        }

        if (videoThumbnail) {
            videoThumbnail.src = "";
        }

        showThumbnailFallback();

        showStatus("");

        if (quickDownloadBtn) {

            quickDownloadBtn.remove();

            quickDownloadBtn = null;
        }

        updateClearButton();

        videoUrl?.focus();
    }


    newDownloadBtn?.addEventListener(
        "click",
        resetDownloadState
    );


    function getSavedSetting(
        key,
        fallback
    ) {

        try {

            const value =
                localStorage.getItem(
                    key
                );

            return value !== null
                ? value
                : fallback;

        } catch {

            return fallback;
        }
    }


    function getCurrentSettings() {

        return {

            theme:
                getSavedSetting(
                    SETTINGS_KEYS.theme,
                    DEFAULT_SETTINGS.theme
                ),

            quality:
                getSavedSetting(
                    SETTINGS_KEYS.quality,
                    DEFAULT_SETTINGS.quality
                ),

            format:
                getSavedSetting(
                    SETTINGS_KEYS.format,
                    DEFAULT_SETTINGS.format
                )
        };
    }


    function applyTheme(theme) {

        if (
            !ALLOWED_THEMES.includes(
                theme
            )
        ) {

            theme =
                DEFAULT_SETTINGS.theme;
        }

        const isDark =
            theme === "dark";

        document.body.classList.toggle(
            "dark-mode",
            isDark
        );

        document.documentElement.setAttribute(
            "data-theme",
            theme
        );

        document.body.setAttribute(
            "data-theme",
            theme
        );

        document.documentElement.style.colorScheme =
            theme;
    }


    function applySettingsToUI() {

        const settings =
            getCurrentSettings();

        applyTheme(
            settings.theme
        );

        if (themeSetting) {
            themeSetting.value =
                settings.theme;
        }

        if (qualitySetting) {
            qualitySetting.value =
                settings.quality;
        }

        if (formatSetting) {
            formatSetting.value =
                settings.format;
        }
    }


    function loadSettings() {

        const settings =
            getCurrentSettings();


        if (
            !ALLOWED_THEMES.includes(
                settings.theme
            )
        ) {

            localStorage.setItem(
                SETTINGS_KEYS.theme,
                DEFAULT_SETTINGS.theme
            );
        }


        if (
            !ALLOWED_QUALITIES.includes(
                settings.quality
            )
        ) {

            localStorage.setItem(
                SETTINGS_KEYS.quality,
                DEFAULT_SETTINGS.quality
            );
        }


        if (
            !ALLOWED_FORMATS.includes(
                settings.format
            )
        ) {

            localStorage.setItem(
                SETTINGS_KEYS.format,
                DEFAULT_SETTINGS.format
            );
        }


        applySettingsToUI();
    }


    let settingsMessageTimer = null;


    function showSettingsMessage(
        message,
        type = "success"
    ) {

        if (!settingsMessage) {
            return;
        }

        settingsMessage.textContent =
            message;

        settingsMessage.className =
            `settings-message ${type}`;

        clearTimeout(
            settingsMessageTimer
        );

        settingsMessageTimer =
            setTimeout(() => {

                settingsMessage.textContent =
                    "";

                settingsMessage.className =
                    "settings-message";

            }, 3000);
    }


    function saveSettings() {

        const theme =
            themeSetting?.value ||
            DEFAULT_SETTINGS.theme;

        const selectedQuality =
            qualitySetting?.value ||
            DEFAULT_SETTINGS.quality;

        const selectedFormat =
            formatSetting?.value ||
            DEFAULT_SETTINGS.format;


        const finalTheme =
            ALLOWED_THEMES.includes(
                theme
            )
                ? theme
                : DEFAULT_SETTINGS.theme;


        const finalQuality =
            ALLOWED_QUALITIES.includes(
                selectedQuality
            )
                ? selectedQuality
                : DEFAULT_SETTINGS.quality;


        const finalFormat =
            ALLOWED_FORMATS.includes(
                selectedFormat
            )
                ? selectedFormat
                : DEFAULT_SETTINGS.format;


        localStorage.setItem(
            SETTINGS_KEYS.theme,
            finalTheme
        );

        localStorage.setItem(
            SETTINGS_KEYS.quality,
            finalQuality
        );

        localStorage.setItem(
            SETTINGS_KEYS.format,
            finalFormat
        );


        applyTheme(
            finalTheme
        );


        showSettingsMessage(
            "Settings saved successfully."
        );


        showNotification(
            "success",
            "Settings saved",
            "Your preferences have been updated.",
            2500
        );
    }


    function resetSettings() {

        const confirmed =
            window.confirm(
                "Reset all VDownloader settings to default?"
            );

        if (!confirmed) {
            return;
        }

        localStorage.removeItem(
            SETTINGS_KEYS.theme
        );

        localStorage.removeItem(
            SETTINGS_KEYS.quality
        );

        localStorage.removeItem(
            SETTINGS_KEYS.format
        );

        loadSettings();

        showSettingsMessage(
            "Settings restored to default."
        );

        showNotification(
            "success",
            "Settings reset",
            "Default settings have been restored.",
            2500
        );
    }


    themeSetting?.addEventListener(
        "change",
        saveSettings
    );

    qualitySetting?.addEventListener(
        "change",
        saveSettings
    );

    formatSetting?.addEventListener(
        "change",
        saveSettings
    );

    resetSettingsBtn?.addEventListener(
        "click",
        resetSettings
    );


    async function loadHistory() {

        try {

            const response =
                await fetch(
                    "/api/history",
                    {
                        cache: "no-store"
                    }
                );

            if (!response.ok) {

                throw new Error(
                    "Unable to load history."
                );
            }

            const data =
                await response.json();

            if (Array.isArray(data)) {

                historyData = data;

            } else if (
                Array.isArray(
                    data.history
                )
            ) {

                historyData =
                    data.history;

            } else {

                historyData = [];
            }

            renderHistory();

        } catch (error) {

            console.error(
                "History error:",
                error
            );
        }
    }


    function getHistorySearchText(
        item
    ) {

        return [
            item.title,
            item.name,
            item.site,
            item.platform,
            item.url,
            item.quality,
            item.format
        ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
    }


    function formatDate(value) {

        if (!value) {
            return "--";
        }

        try {

            const date =
                new Date(value);

            if (
                isNaN(
                    date.getTime()
                )
            ) {

                return String(value);
            }

            return date.toLocaleString();

        } catch {

            return String(value);
        }
    }


    function createHistoryThumbnail(
        item
    ) {

        const thumbnail =
            item.thumbnail ||
            item.thumbnail_url ||
            "";

        if (!thumbnail) {

            return `
                <div class="history-thumbnail-fallback">
                    ▶
                </div>
            `;
        }

        return `
            <img
                class="history-thumbnail-image"
                src="${escapeHTML(thumbnail)}"
                alt=""
                loading="lazy"
            >
        `;
    }


    function createHistoryItem(
        item,
        index
    ) {

        const title =
            item.title ||
            item.name ||
            "Untitled video";

        const platform =
            item.platform ||
            item.site ||
            detectPlatformFromUrl(
                item.url
            );

        const date =
            item.date ||
            item.downloaded_at ||
            item.created_at ||
            item.timestamp;

        const size =
            item.filesize ||
            item.file_size ||
            item.size ||
            0;

        const duration =
            item.duration ??
            item.duration_seconds;

        const savedQuality =
            item.quality ||
            "";

        const savedFormat =
            item.format ||
            item.ext ||
            "";

        const url =
            item.url ||
            item.webpage_url ||
            "";

        const wrapper =
            document.createElement(
                "div"
            );

        wrapper.className =
            "history-item";

        wrapper.innerHTML = `
            <div class="history-thumbnail">
                ${createHistoryThumbnail(item)}
            </div>

            <div class="history-info">

                <div class="history-title">
                    ${escapeHTML(title)}
                </div>

                <div class="history-meta">

                    <span>
                        ${escapeHTML(platform)}
                    </span>

                    <span>
                        ${escapeHTML(
                            formatDate(date)
                        )}
                    </span>

                </div>

                <div class="history-details">

                    ${
                        size
                            ? `
                                <span>
                                    ${escapeHTML(
                                        formatBytes(size)
                                    )}
                                </span>
                            `
                            : ""
                    }

                    ${
                        duration
                            ? `
                                <span>
                                    ${escapeHTML(
                                        formatDuration(
                                            duration
                                        )
                                    )}
                                </span>
                            `
                            : ""
                    }

                    ${
                        savedQuality &&
                        savedQuality !== "audio"
                            ? `
                                <span>
                                    ${escapeHTML(
                                        formatQuality(
                                            savedQuality
                                        )
                                    )}
                                </span>
                            `
                            : ""
                    }

                    ${
                        savedFormat
                            ? `
                                <span>
                                    ${escapeHTML(
                                        formatFormat(
                                            savedFormat
                                        )
                                    )}
                                </span>
                            `
                            : ""
                    }

                </div>

            </div>

            <div class="history-actions">

                <button
                    class="history-download"
                    type="button"
                >
                    Download Again
                </button>

                <button
                    class="history-delete"
                    type="button"
                    aria-label="Delete history item"
                >
                    Delete
                </button>

            </div>
        `;


        wrapper
            .querySelector(
                ".history-thumbnail-image"
            )
            ?.addEventListener(
                "error",
                event => {

                    const fallback =
                        document.createElement(
                            "div"
                        );

                    fallback.className =
                        "history-thumbnail-fallback";

                    fallback.textContent =
                        "▶";

                    event.target.replaceWith(
                        fallback
                    );
                }
            );


        wrapper
            .querySelector(
                ".history-download"
            )
            ?.addEventListener(
                "click",
                () => {

                    if (!url) {

                        showNotification(
                            "error",
                            "URL unavailable",
                            "This history item has no usable URL.",
                            3500
                        );

                        return;
                    }

                    if (videoUrl) {
                        videoUrl.value =
                            url;
                    }

                    historySection?.classList.add(
                        "hidden"
                    );

                    settingsSection?.classList.add(
                        "hidden"
                    );

                    resultSection?.classList.add(
                        "hidden"
                    );

                    updatePlatformDetection(
                        url
                    );

                    showNotification(
                        "info",
                        "Loading video",
                        "Preparing the selected video again.",
                        2500
                    );

                    window.scrollTo({
                        top: 0,
                        behavior: "smooth"
                    });

                    setTimeout(
                        () =>
                            analyzeVideo(),
                        350
                    );
                }
            );


        wrapper
            .querySelector(
                ".history-delete"
            )
            ?.addEventListener(
                "click",
                () =>
                    deleteHistoryItem(
                        item,
                        index
                    )
            );

        return wrapper;
    }


    function renderHistory() {

        if (!historyList) {
            return;
        }

        const searchTerm =
            historySearch?.value
                ?.trim()
                .toLowerCase() ||
            "";

        const filtered =
            historyData.filter(
                item =>
                    !searchTerm ||
                    getHistorySearchText(
                        item
                    ).includes(
                        searchTerm
                    )
            );

        historyList.innerHTML =
            "";

        if (!historyData.length) {

            emptyHistory?.classList.remove(
                "hidden"
            );

            noHistoryResults?.classList.add(
                "hidden"
            );

            updateHistoryStats();

            return;
        }

        emptyHistory?.classList.add(
            "hidden"
        );

        if (!filtered.length) {

            noHistoryResults?.classList.remove(
                "hidden"
            );

            updateHistoryStats([]);

            return;
        }

        noHistoryResults?.classList.add(
            "hidden"
        );

        filtered.forEach(item => {

            historyList.appendChild(
                createHistoryItem(
                    item,
                    historyData.indexOf(item)
                )
            );
        });

        updateHistoryStats(
            filtered
        );
    }


    async function deleteHistoryItem(
        item,
        index
    ) {

        if (deletingHistory) {
            return;
        }

        deletingHistory = true;

        try {

            const id =
                item.id ??
                item.history_id ??
                item.job_id;

            let response;

            if (id !== undefined) {

                response =
                    await fetch(
                        `/api/history/${encodeURIComponent(id)}`,
                        {
                            method: "DELETE"
                        }
                    );

            } else {

                response =
                    await fetch(
                        "/api/history/delete",
                        {
                            method: "POST",
                            headers: {
                                "Content-Type":
                                    "application/json"
                            },
                            body: JSON.stringify({
                                index
                            })
                        }
                    );
            }

            if (!response.ok) {

                throw new Error(
                    "Unable to delete history item."
                );
            }

            await loadHistory();

            showNotification(
                "success",
                "History updated",
                "The download was removed from history.",
                2500
            );

        } catch (error) {

            showNotification(
                "error",
                "Delete failed",
                error.message ||
                "Unable to delete history item.",
                3500
            );

        } finally {

            deletingHistory = false;
        }
    }


    function updateHistoryStats(
        visibleItems = historyData
    ) {

        if (historyCount) {

            historyCount.textContent =
                visibleItems.length;
        }

        if (historySize) {

            const total =
                visibleItems.reduce(
                    (sum, item) => {

                        const size =
                            Number(
                                item.filesize ??
                                item.file_size ??
                                item.size ??
                                0
                            );

                        return (
                            sum +
                            (
                                isNaN(size)
                                    ? 0
                                    : size
                            )
                        );

                    },
                    0
                );

            historySize.textContent =
                formatBytes(total);
        }
    }


    async function clearAllHistory() {

        const confirmed =
            window.confirm(
                "Clear your entire download history?"
            );

        if (!confirmed) {
            return;
        }

        try {

            const response =
                await fetch(
                    "/api/history",
                    {
                        method: "DELETE"
                    }
                );

            if (!response.ok) {

                throw new Error(
                    "Unable to clear history."
                );
            }

            historyData = [];

            renderHistory();

            showNotification(
                "success",
                "History cleared",
                "Your download history has been cleared.",
                3000
            );

        } catch (error) {

            showNotification(
                "error",
                "Unable to clear history",
                error.message ||
                "Please try again.",
                3500
            );
        }
    }


    historySearch?.addEventListener(
        "input",
        renderHistory
    );


    clearHistorySearch?.addEventListener(
        "click",
        () => {

            if (historySearch) {
                historySearch.value = "";
            }

            renderHistory();
        }
    );


    clearHistoryBtn?.addEventListener(
        "click",
        clearAllHistory
    );


    settingsClearHistoryBtn?.addEventListener(
        "click",
        clearAllHistory
    );


    historyLink?.addEventListener(
        "click",
        event => {

            event.preventDefault();

            historySection?.classList.remove(
                "hidden"
            );

            settingsSection?.classList.add(
                "hidden"
            );

            resultSection?.classList.add(
                "hidden"
            );

            loadHistory();

            historySection?.scrollIntoView({
                behavior: "smooth"
            });
        }
    );


    settingsLink?.addEventListener(
        "click",
        event => {

            event.preventDefault();

            settingsSection?.classList.remove(
                "hidden"
            );

            historySection?.classList.add(
                "hidden"
            );

            resultSection?.classList.add(
                "hidden"
            );

            settingsSection?.scrollIntoView({
                behavior: "smooth"
            });
        }
    );


    homeLink?.addEventListener(
        "click",
        event => {

            event.preventDefault();

            historySection?.classList.add(
                "hidden"
            );

            settingsSection?.classList.add(
                "hidden"
            );

            if (!currentVideo) {

                resultSection?.classList.add(
                    "hidden"
                );
            }

            window.scrollTo({
                top: 0,
                behavior: "smooth"
            });
        }
    );


    document.addEventListener(
        "keydown",
        event => {

            if (event.key === "Escape") {

                document
                    .querySelectorAll(
                        ".notification"
                    )
                    .forEach(
                        item => item.remove()
                    );
            }
        }
    );


    loadSettings();

    loadHistory();

    restoreActiveDownloads();

    updateClearButton();


    historySection?.classList.add(
        "hidden"
    );

    settingsSection?.classList.add(
        "hidden"
    );s

    resultSection?.classList.add(
        "hidden"
    );

});
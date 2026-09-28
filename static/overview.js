document.addEventListener("DOMContentLoaded", () => {


const refreshButton =
    document.getElementById("refreshButton");

const periodSelect =
    document.getElementById("periodSelect");


function number(value) {

    const parsed =
        Number(value);

    if (!Number.isFinite(parsed)) {
        return 0;
    }

    return parsed;
}


function formatNumber(value) {

    return number(value).toLocaleString();
}


function setText(id, value) {

    const element =
        document.getElementById(id);

    if (element) {
        element.textContent =
            formatNumber(value);
    }
}


function formatDateLabel(date) {

    const dateObject =
        new Date(
            `${date}T00:00:00`
        );

    if (
        Number.isNaN(
            dateObject.getTime()
        )
    ) {
        return date;
    }

    return dateObject.toLocaleDateString(
        "en-US",
        {
            month: "short",
            day: "numeric"
        }
    );
}


function getDownloadCount(data) {

    if (!data) {
        return 0;
    }

    return number(
        data.downloads_started
    );
}


function createChartBar(
    date,
    data,
    maximum
) {

    const downloads =
        getDownloadCount(data);


    const wrapper =
        document.createElement(
            "div"
        );

    wrapper.className =
        "bar-wrapper";


    const bar =
        document.createElement(
            "div"
        );

    bar.className =
        "bar";


    const height =
        downloads > 0
            ? Math.max(
                8,
                (downloads / maximum) * 100
            )
            : 3;


    bar.style.height =
        `${height}%`;


    const dateLabel =
        formatDateLabel(date);


    bar.title =
        `${dateLabel} • ${formatNumber(downloads)} download${downloads === 1 ? "" : "s"}`;


    const label =
        document.createElement(
            "span"
        );

    label.className =
        "bar-label";

    label.textContent =
        dateLabel;


    wrapper.appendChild(bar);

    wrapper.appendChild(label);


    return wrapper;
}


function renderActivity(
    daily,
    period
) {

    const container =
        document.getElementById(
            "activityChart"
        );

    if (!container) {
        return;
    }


    container.innerHTML = "";


    if (
        !daily ||
        Object.keys(daily).length === 0
    ) {

        container.innerHTML =
            `<div class="empty">
                No activity data available
            </div>`;

        return;
    }


    const entries =
        Object.entries(daily);


    const selectedEntries =
        period === "30"
            ? entries
            : entries.slice(-7);


    const maximum =
        Math.max(
            ...selectedEntries.map(
                ([, data]) =>
                    getDownloadCount(data)
            ),
            1
        );


    const chartBars =
        document.createElement(
            "div"
        );

    chartBars.className =
        "chart-bars";


    selectedEntries.forEach(
        ([date, data]) => {

            const bar =
                createChartBar(
                    date,
                    data,
                    maximum
                );

            chartBars.appendChild(
                bar
            );
        }
    );


    container.appendChild(
        chartBars
    );
}


function renderDownloadTypes(
    totals
) {

    const video =
        number(
            totals.video_downloads
        );


    const audio =
        number(
            totals.audio_downloads
        );


    const total =
        video + audio;


    const videoPercent =
        total > 0
            ? (video / total) * 100
            : 0;


    const audioPercent =
        total > 0
            ? (audio / total) * 100
            : 0;


    const videoCount =
        document.getElementById(
            "videoCount"
        );

    const audioCount =
        document.getElementById(
            "audioCount"
        );

    const videoProgress =
        document.getElementById(
            "videoProgress"
        );

    const audioProgress =
        document.getElementById(
            "audioProgress"
        );


    if (videoCount) {

        videoCount.textContent =
            formatNumber(video);
    }


    if (audioCount) {

        audioCount.textContent =
            formatNumber(audio);
    }


    if (videoProgress) {

        videoProgress.style.width =
            `${videoPercent}%`;
    }


    if (audioProgress) {

        audioProgress.style.width =
            `${audioPercent}%`;
    }
}


function renderCompletionRate(
    totals
) {

    const started =
        number(
            totals.downloads_started
        );


    const completed =
        number(
            totals.downloads_completed
        );


    const rate =
        started > 0
            ? (completed / started) * 100
            : 0;


    const element =
        document.getElementById(
            "completionRate"
        );


    if (element) {

        element.textContent =
            `${rate.toFixed(1)}%`;
    }
}


function renderDashboard(
    data
) {

    const totals =
        data.totals || {};


    setText(
        "statDownloads",
        totals.downloads_started || 0
    );


    setText(
        "statCompleted",
        totals.downloads_completed || 0
    );


    setText(
        "statFailed",
        totals.downloads_failed || 0
    );


    setText(
        "statActive",
        totals.downloads_started -
        totals.downloads_completed -
        totals.downloads_failed
    );


    setText(
        "visitorCount",
        totals.visitors || 0
    );


    setText(
        "pageViewCount",
        totals.page_views || 0
    );


    renderCompletionRate(
        totals
    );


    renderDownloadTypes(
        totals
    );


    const period =
        periodSelect
            ? periodSelect.value
            : "7";


    renderActivity(
        data.last_30_days || {},
        period
    );
}


async function loadOverview() {

    if (refreshButton) {

        refreshButton.disabled =
            true;

        refreshButton.textContent =
            "Loading...";
    }


    try {

        const period =
            periodSelect
                ? periodSelect.value
                : "7";


        const response =
            await fetch(
                `/api/analytics?days=${period}`,
                {
                    method: "GET",
                    cache: "no-store"
                }
            );


        const data =
            await response.json();


        if (
            !response.ok ||
            !data.success
        ) {

            throw new Error(
                data.error ||
                "Overview could not be loaded."
            );
        }


        renderDashboard(
            data
        );


    } catch (error) {

        console.error(
            "Overview error:",
            error
        );


    } finally {

        if (refreshButton) {

            refreshButton.disabled =
                false;

            refreshButton.textContent =
                "Refresh";
        }
    }
}


refreshButton?.addEventListener(
    "click",
    loadOverview
);


periodSelect?.addEventListener(
    "change",
    loadOverview
);


loadOverview();


setInterval(
    loadOverview,
    30000
);


});

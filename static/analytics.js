document.addEventListener("DOMContentLoaded", () => {


const refreshButton =
    document.getElementById("refreshButton");

const periodSelect =
    document.getElementById("periodSelect");


function number(value) {

    const parsed =
        Number(value);

    return Number.isFinite(parsed)
        ? parsed
        : 0;
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


function escapeHtml(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


function renderBreakdown(
    containerId,
    values,
    emptyText = "No data available"
) {

    const container =
        document.getElementById(
            containerId
        );

    if (!container) {
        return;
    }

    container.innerHTML = "";


    if (
        !values ||
        Object.keys(values).length === 0
    ) {

        container.innerHTML = `
            <div class="empty">
                ${emptyText}
            </div>
        `;

        return;
    }


    const entries =
        Object.entries(values)
            .map(([name, value]) => [
                name,
                number(value)
            ])
            .sort(
                (a, b) =>
                    b[1] - a[1]
            );


    const maximum =
        Math.max(
            ...entries.map(
                ([, value]) => value
            ),
            1
        );


    entries.forEach(
        ([name, value]) => {

            const row =
                document.createElement(
                    "div"
                );

            row.className =
                "breakdown-row";


            const width =
                Math.min(
                    100,
                    Math.max(
                        0,
                        (value / maximum) * 100
                    )
                );


            row.innerHTML = `
                <span class="breakdown-name">
                    ${escapeHtml(name)}
                </span>

                <div class="breakdown-track">
                    <div
                        class="breakdown-bar"
                        style="width: ${width}%"
                    ></div>
                </div>

                <span class="breakdown-value">
                    ${formatNumber(value)}
                </span>
            `;


            container.appendChild(row);

        }
    );
}


function renderDownloadTypes(totals) {

    const container =
        document.getElementById(
            "downloadTypes"
        );

    if (!container) {
        return;
    }


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


    container.innerHTML = `

        <div class="data-row">

            <div class="data-name">
                Video
            </div>

            <div class="data-value">
                ${formatNumber(video)}
            </div>

        </div>

        <div class="progress">

            <div
                class="progress-bar"
                style="width: ${videoPercent}%"
            ></div>

        </div>


        <div class="data-row">

            <div class="data-name">
                Audio
            </div>

            <div class="data-value">
                ${formatNumber(audio)}
            </div>

        </div>

        <div class="progress">

            <div
                class="progress-bar audio"
                style="width: ${audioPercent}%"
            ></div>

        </div>

    `;
}


function renderActions(actions) {

    setText(
        "actionPause",
        actions?.pause || 0
    );

    setText(
        "actionResume",
        actions?.resume || 0
    );

    setText(
        "actionCancel",
        actions?.cancel || 0
    );

    setText(
        "actionRetry",
        actions?.retry || 0
    );
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

        container.innerHTML = `
            <div class="empty">
                No activity data available
            </div>
        `;

        return;
    }


    let entries =
        Object.entries(daily);


    if (period === "7") {

        entries =
            entries.slice(-7);
    }


    const maximum =
        Math.max(
            ...entries.map(
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


    entries.forEach(
        ([date, data]) => {

            chartBars.appendChild(
                createChartBar(
                    date,
                    data,
                    maximum
                )
            );

        }
    );


    container.appendChild(
        chartBars
    );
}


function renderDashboard(data) {

    const totals =
        data.totals || {};


    const period =
        periodSelect?.value || "7";


    setText(
        "statVisitors",
        totals.visitors || 0
    );


    setText(
        "statPageViews",
        totals.page_views || 0
    );


    setText(
        "statDownloads",
        totals.downloads_started || 0
    );


    setText(
        "statCompleted",
        totals.downloads_completed || 0
    );


    renderDownloadTypes(
        totals
    );


    renderBreakdown(
        "formatData",
        totals.formats
    );


    renderBreakdown(
        "browserData",
        data.browsers || {}
    );


    renderBreakdown(
        "deviceData",
        data.devices || {}
    );


    renderActions(
        totals.actions || {}
    );


    renderActivity(
        data.last_30_days || {},
        period
    );
}


async function loadAnalytics() {

    if (refreshButton) {

        refreshButton.disabled =
            true;

        refreshButton.textContent =
            "Loading...";
    }


    try {

        const period =
            periodSelect?.value || "7";


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
                "Analytics could not be loaded."
            );
        }


        renderDashboard(data);


    } catch (error) {

        console.error(
            "Analytics error:",
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
    loadAnalytics
);


periodSelect?.addEventListener(
    "change",
    loadAnalytics
);


loadAnalytics();


setInterval(
    loadAnalytics,
    30000
);


});

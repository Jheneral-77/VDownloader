
document.addEventListener("DOMContentLoaded", () => {

    const historyContainer =
        document.getElementById("historyContainer");

    const historyCount =
        document.getElementById("historyCount");

    const refreshHistoryButton =
        document.getElementById("refreshHistoryButton");

    const clearHistoryButton =
        document.getElementById("clearHistoryButton");

    const confirmModal =
        document.getElementById("confirmModal");

    const cancelClearButton =
        document.getElementById("cancelClearButton");

    const confirmClearButton =
        document.getElementById("confirmClearButton");


    function escapeHtml(value) {

        return String(value)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }


    function formatDate(value) {

        if (
            value === null ||
            value === undefined ||
            value === ""
        ) {
            return "Date unavailable";
        }


        let date;


        if (
            typeof value === "number" ||
            /^\d+$/.test(String(value))
        ) {

            const numericValue =
                Number(value);

            date =
                new Date(
                    numericValue < 10000000000
                        ? numericValue * 1000
                        : numericValue
                );

        } else {

            date =
                new Date(value);
        }


        if (Number.isNaN(date.getTime())) {
            return String(value);
        }


        return date.toLocaleString(
            undefined,
            {
                dateStyle: "medium",
                timeStyle: "short"
            }
        );
    }


    function getHistoryArray(data) {

        if (Array.isArray(data)) {
            return data;
        }


        if (
            data &&
            Array.isArray(data.history)
        ) {
            return data.history;
        }


        return [];
    }


    function createHistoryItem(item) {

        const id =
            item.id ??
            item.history_id ??
            "";


        const title =
            item.title ||
            item.filename ||
            "Untitled download";


        const source =
            item.source ||
            "Unknown source";


        const format =
            item.format ||
            "Unknown";


        const quality =
            item.quality ||
            "—";


        const duration =
            item.duration ||
            "—";


        const date =
            formatDate(
                item.created_at ??
                item.timestamp ??
                item.completed_at
            );


        const status =
            String(
                item.status ||
                "completed"
            ).toLowerCase();


        const isFailed =
            status === "failed";


        return `
            <div
                class="history-item"
                data-id="${escapeHtml(id)}"
            >

                <div class="history-info">

                    <div
                        class="history-title"
                        title="${escapeHtml(title)}"
                    >
                        ${escapeHtml(title)}
                    </div>


                    <div class="history-meta">

                        <span>
                            ${escapeHtml(source)}
                        </span>

                        <span>
                            Format: ${escapeHtml(format)}
                        </span>

                        <span>
                            Quality: ${escapeHtml(quality)}
                        </span>

                        <span>
                            Duration: ${escapeHtml(duration)}
                        </span>

                        <span>
                            ${escapeHtml(date)}
                        </span>

                    </div>

                </div>


                <span
                    class="history-status ${isFailed ? "failed" : "completed"}"
                >
                    ${isFailed ? "Failed" : "Completed"}
                </span>


                <div class="history-actions">

                    ${
                        id
                            ? `
                                <button
                                    type="button"
                                    class="history-action delete-history"
                                    data-id="${escapeHtml(id)}"
                                    title="Delete"
                                >
                                    ×
                                </button>
                            `
                            : ""
                    }

                </div>

            </div>
        `;
    }


    function renderEmptyState() {

        historyContainer.innerHTML = `
            <div class="empty-state">

                <h3>
                    No download history
                </h3>

                <p>
                    Your completed downloads will appear here.
                </p>

            </div>
        `;
    }


    function renderErrorState() {

        historyContainer.innerHTML = `
            <div class="empty-state">

                <h3>
                    Could not load history
                </h3>

                <p>
                    Please refresh the page and try again.
                </p>

            </div>
        `;
    }


    function attachHistoryActions() {

        const deleteButtons =
            document.querySelectorAll(
                ".delete-history"
            );


        deleteButtons.forEach(button => {

            button.addEventListener(
                "click",
                async () => {

                    const id =
                        button.dataset.id;


                    if (!id) {
                        return;
                    }


                    await deleteHistoryItem(
                        id,
                        button
                    );
                }
            );

        });
    }


    async function loadHistory() {

        historyContainer.innerHTML = `
            <div class="loading">
                Loading download history...
            </div>
        `;


        if (refreshHistoryButton) {

            refreshHistoryButton.disabled =
                true;

            refreshHistoryButton.textContent =
                "Loading...";
        }


        try {

            const response =
                await fetch(
                    "/api/history",
                    {
                        method: "GET",
                        cache: "no-store"
                    }
                );


            const data =
                await response.json();


            if (!response.ok) {

                throw new Error(
                    data.error ||
                    "Failed to load history."
                );
            }


            const history =
                getHistoryArray(data);


            historyCount.textContent =
                `${history.length} download${history.length === 1 ? "" : "s"}`;


            if (history.length === 0) {

                renderEmptyState();

                return;
            }


            historyContainer.innerHTML =
                history
                    .map(createHistoryItem)
                    .join("");


            attachHistoryActions();

        } catch (error) {

            console.error(
                "History error:",
                error
            );


            historyCount.textContent =
                "Unable to load history";


            renderErrorState();

        } finally {

            if (refreshHistoryButton) {

                refreshHistoryButton.disabled =
                    false;

                refreshHistoryButton.textContent =
                    "Refresh";
            }
        }
    }


    async function deleteHistoryItem(
        id,
        button
    ) {

        if (button) {

            button.disabled =
                true;
        }


        try {

            const response =
                await fetch(
                    `/api/history/${encodeURIComponent(id)}`,
                    {
                        method: "DELETE"
                    }
                );


            const data =
                await response.json()
                    .catch(() => ({}));


            if (!response.ok) {

                throw new Error(
                    data.error ||
                    "Failed to delete history item."
                );
            }


            await loadHistory();

        } catch (error) {

            console.error(
                "Delete history error:",
                error
            );


            alert(
                "Could not delete this history item."
            );


            if (button) {

                button.disabled =
                    false;
            }
        }
    }


    function openClearModal() {

        confirmModal.classList.remove(
            "hidden"
        );
    }


    function closeClearModal() {

        confirmModal.classList.add(
            "hidden"
        );
    }


    async function clearHistory() {

        if (confirmClearButton) {

            confirmClearButton.disabled =
                true;

            confirmClearButton.textContent =
                "Clearing...";
        }


        try {

            const response =
                await fetch(
                    "/api/clear-completed",
                    {
                        method: "DELETE"
                    }
                );


            const data =
                await response.json()
                    .catch(() => ({}));


            if (!response.ok) {

                throw new Error(
                    data.error ||
                    "Failed to clear history."
                );
            }


            closeClearModal();

            await loadHistory();

        } catch (error) {

            console.error(
                "Clear history error:",
                error
            );


            alert(
                "Could not clear the history."
            );

        } finally {

            if (confirmClearButton) {

                confirmClearButton.disabled =
                    false;

                confirmClearButton.textContent =
                    "Clear History";
            }
        }
    }


    refreshHistoryButton?.addEventListener(
        "click",
        loadHistory
    );


    clearHistoryButton?.addEventListener(
        "click",
        openClearModal
    );


    cancelClearButton?.addEventListener(
        "click",
        closeClearModal
    );


    confirmClearButton?.addEventListener(
        "click",
        clearHistory
    );


    confirmModal?.addEventListener(
        "click",
        event => {

            if (
                event.target === confirmModal
            ) {
                closeClearModal();
            }
        }
    );


    loadHistory();

});




from flask import (
    Flask,
    request,
    jsonify,
    send_file,
    render_template,
    make_response
)

from yt_dlp import YoutubeDL
from yt_dlp.networking.impersonate import ImpersonateTarget

from datetime import datetime, timedelta
from pathlib import Path

import json
import re
import shutil
import sqlite3
import threading
import time
import uuid


app = Flask(__name__)

BASE_DIR = Path(__file__).resolve().parent

DOWNLOAD_FOLDER = BASE_DIR / "downloads"
HISTORY_FILE = BASE_DIR / "history.json"
ANALYTICS_DB = BASE_DIR / "analytics.db"

DOWNLOAD_FOLDER.mkdir(exist_ok=True)


FFMPEG_LOCATION = (
    r"C:\ffmpeg\bin\ffmpeg.exe"
    if Path(r"C:\ffmpeg\bin\ffmpeg.exe").exists()
    else shutil.which("ffmpeg")
)

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/150.0.0.0 Safari/537.36"
)

IMPERSONATE_TARGET = ImpersonateTarget(
    "chrome",
    "150",
    "macos",
    "26"
)


AUDIO_FORMATS = {
    "mp3",
    "m4a"
}

ANALYTICS_FORMATS = {
    "mp4",
    "webm",
    "mkv",
    "mov",
    "mp3",
    "m4a"
}

VISITOR_COOKIE = "vdownloader_visitor"


jobs = {}
jobs_lock = threading.Lock()

analytics_job_context = {}
analytics_job_context_lock = threading.Lock()


class DownloadCancelled(Exception):
    pass


class DownloadPaused(Exception):
    pass


def now_string():
    return datetime.now().strftime(
        "%Y-%m-%d %H:%M:%S"
    )


# =========================================================
# ANALYTICS
# =========================================================

def get_analytics_connection():

    connection = sqlite3.connect(
        str(ANALYTICS_DB),
        timeout=30
    )

    connection.row_factory = sqlite3.Row

    connection.execute(
        "PRAGMA journal_mode=WAL"
    )

    connection.execute(
        "PRAGMA busy_timeout=30000"
    )

    return connection


def initialize_analytics():

    connection = get_analytics_connection()

    try:

        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS visitors (
                visitor_id TEXT PRIMARY KEY,
                first_seen TEXT NOT NULL,
                last_seen TEXT NOT NULL,
                device TEXT,
                browser TEXT
            )
            """
        )

        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                created_at TEXT NOT NULL,
                event_date TEXT NOT NULL,
                event_type TEXT NOT NULL,
                visitor_id TEXT,
                format TEXT,
                download_type TEXT,
                device TEXT,
                browser TEXT
            )
            """
        )

        connection.execute(
            """
            CREATE INDEX IF NOT EXISTS
            idx_events_date
            ON events(event_date)
            """
        )

        connection.execute(
            """
            CREATE INDEX IF NOT EXISTS
            idx_events_type
            ON events(event_type)
            """
        )

        connection.execute(
            """
            CREATE INDEX IF NOT EXISTS
            idx_events_visitor
            ON events(visitor_id)
            """
        )

        connection.commit()

    finally:
        connection.close()


def detect_device(user_agent):

    user_agent = str(
        user_agent or ""
    ).lower()

    if (
        "ipad" in user_agent
        or "tablet" in user_agent
    ):
        return "tablet"

    if (
        "mobile" in user_agent
        or "android" in user_agent
        or "iphone" in user_agent
    ):
        return "mobile"

    return "desktop"


def detect_browser(user_agent):

    user_agent = str(
        user_agent or ""
    ).lower()

    if "edg/" in user_agent:
        return "Edge"

    if (
        "opr/" in user_agent
        or "opera" in user_agent
    ):
        return "Opera"

    if "firefox/" in user_agent:
        return "Firefox"

    if (
        "chrome/" in user_agent
        or "crios/" in user_agent
    ):
        return "Chrome"

    if "safari/" in user_agent:
        return "Safari"

    return "Other"


def get_request_visitor_id():

    visitor_id = request.cookies.get(
        VISITOR_COOKIE
    )

    if visitor_id:
        return visitor_id

    return uuid.uuid4().hex


def record_analytics_event(
    event_type,
    visitor_id=None,
    format_value=None,
    download_type=None,
    device=None,
    browser=None
):

    try:

        visitor_id = (
            visitor_id
            or uuid.uuid4().hex
        )

        if device is None:

            device = detect_device(
                request.headers.get(
                    "User-Agent",
                    ""
                )
            )

        if browser is None:

            browser = detect_browser(
                request.headers.get(
                    "User-Agent",
                    ""
                )
            )

        if format_value:

            format_value = str(
                format_value
            ).lower()

            if (
                format_value
                not in ANALYTICS_FORMATS
            ):
                format_value = None

        timestamp = now_string()

        event_date = datetime.now().strftime(
            "%Y-%m-%d"
        )

        connection = get_analytics_connection()

        try:

            connection.execute(
                """
                INSERT OR IGNORE INTO visitors (
                    visitor_id,
                    first_seen,
                    last_seen,
                    device,
                    browser
                )
                VALUES (?, ?, ?, ?, ?)
                """,
                (
                    visitor_id,
                    timestamp,
                    timestamp,
                    device,
                    browser
                )
            )

            connection.execute(
                """
                UPDATE visitors
                SET
                    last_seen = ?,
                    device = ?,
                    browser = ?
                WHERE visitor_id = ?
                """,
                (
                    timestamp,
                    device,
                    browser,
                    visitor_id
                )
            )

            connection.execute(
                """
                INSERT INTO events (
                    created_at,
                    event_date,
                    event_type,
                    visitor_id,
                    format,
                    download_type,
                    device,
                    browser
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    timestamp,
                    event_date,
                    event_type,
                    visitor_id,
                    format_value,
                    download_type,
                    device,
                    browser
                )
            )

            connection.commit()

        finally:
            connection.close()

    except Exception:
        pass


def record_page_view():

    visitor_id = get_request_visitor_id()

    user_agent = request.headers.get(
        "User-Agent",
        ""
    )

    record_analytics_event(
        event_type="page_view",
        visitor_id=visitor_id,
        device=detect_device(
            user_agent
        ),
        browser=detect_browser(
            user_agent
        )
    )

    return visitor_id


def set_visitor_cookie(
    response,
    visitor_id
):

    response.set_cookie(
        VISITOR_COOKIE,
        visitor_id,
        max_age=60 * 60 * 24 * 365,
        httponly=True,
        samesite="Lax",
        secure=request.is_secure
    )

    return response


def set_job_analytics_context(
    job_id,
    visitor_id=None,
    device=None,
    browser=None
):

    with analytics_job_context_lock:

        analytics_job_context[job_id] = {
            "visitor_id": visitor_id,
            "device": device,
            "browser": browser
        }


def get_job_analytics_context(job_id):

    with analytics_job_context_lock:

        context = analytics_job_context.get(
            job_id
        )

        if not context:
            return {}

        return dict(context)


def remove_job_analytics_context(job_id):

    with analytics_job_context_lock:

        analytics_job_context.pop(
            job_id,
            None
        )


def record_job_analytics(
    event_type,
    job
):

    if not job:
        return

    context = get_job_analytics_context(
        job.get("id")
    )

    record_analytics_event(
        event_type=event_type,
        visitor_id=context.get(
            "visitor_id"
        ),
        format_value=job.get(
            "format"
        ),
        download_type=job.get(
            "download_type"
        ),
        device=context.get(
            "device"
        ),
        browser=context.get(
            "browser"
        )
    )


def get_analytics_stats():

    today = datetime.now().date()

    start_date = (
        today - timedelta(days=29)
    ).isoformat()

    connection = get_analytics_connection()

    try:

        event_counts = {}

        rows = connection.execute(
            """
            SELECT
                event_type,
                COUNT(*) AS total
            FROM events
            GROUP BY event_type
            """
        ).fetchall()

        for row in rows:

            event_counts[
                row["event_type"]
            ] = row["total"]


        visitor_row = connection.execute(
            """
            SELECT COUNT(*) AS total
            FROM visitors
            """
        ).fetchone()

        total_visitors = (
            visitor_row["total"]
            if visitor_row
            else 0
        )


        format_rows = connection.execute(
            """
            SELECT
                format,
                COUNT(*) AS total
            FROM events
            WHERE
                event_type = 'download_started'
                AND format IS NOT NULL
            GROUP BY format
            """
        ).fetchall()

        formats = {
            "mp4": 0,
            "webm": 0,
            "mkv": 0,
            "mov": 0,
            "mp3": 0,
            "m4a": 0
        }

        for row in format_rows:

            fmt = str(
                row["format"]
            ).lower()

            if fmt in formats:
                formats[fmt] = row["total"]


        completed_format_rows = connection.execute(
            """
            SELECT
                format,
                COUNT(*) AS total
            FROM events
            WHERE
                event_type = 'download_completed'
                AND format IS NOT NULL
            GROUP BY format
            """
        ).fetchall()

        completed_formats = {
            "mp4": 0,
            "webm": 0,
            "mkv": 0,
            "mov": 0,
            "mp3": 0,
            "m4a": 0
        }

        for row in completed_format_rows:

            fmt = str(
                row["format"]
            ).lower()

            if fmt in completed_formats:
                completed_formats[fmt] = row["total"]


        device_rows = connection.execute(
            """
            SELECT
                device,
                COUNT(*) AS total
            FROM events
            WHERE
                event_type = 'page_view'
                AND device IS NOT NULL
            GROUP BY device
            """
        ).fetchall()

        devices = {}

        for row in device_rows:

            devices[
                row["device"]
            ] = row["total"]


        browser_rows = connection.execute(
            """
            SELECT
                browser,
                COUNT(*) AS total
            FROM events
            WHERE
                event_type = 'page_view'
                AND browser IS NOT NULL
            GROUP BY browser
            """
        ).fetchall()

        browsers = {}

        for row in browser_rows:

            browsers[
                row["browser"]
            ] = row["total"]


        daily_rows = connection.execute(
            """
            SELECT
                event_date,
                event_type,
                format,
                download_type,
                COUNT(*) AS total
            FROM events
            WHERE event_date >= ?
            GROUP BY
                event_date,
                event_type,
                format,
                download_type
            ORDER BY event_date ASC
            """,
            (start_date,)
        ).fetchall()


        visitor_daily_rows = connection.execute(
            """
            SELECT
                event_date,
                COUNT(
                    DISTINCT visitor_id
                ) AS total
            FROM events
            WHERE
                event_date >= ?
                AND event_type = 'page_view'
            GROUP BY event_date
            """,
            (start_date,)
        ).fetchall()

        daily_visitors = {
            row["event_date"]: row["total"]
            for row in visitor_daily_rows
        }


        daily = {}

        for index in range(30):

            current_date = (
                today
                - timedelta(
                    days=29 - index
                )
            ).isoformat()

            daily[current_date] = {

                "visitors": 0,

                "page_views": 0,

                "analyses": 0,

                "analysis_failures": 0,

                "downloads_started": 0,

                "downloads_completed": 0,

                "downloads_failed": 0,

                "video_downloads": 0,

                "audio_downloads": 0,

                "files_served": 0,

                "actions": {
                    "pause": 0,
                    "resume": 0,
                    "cancel": 0,
                    "retry": 0
                },

                "formats": {
                    "mp4": 0,
                    "webm": 0,
                    "mkv": 0,
                    "mov": 0,
                    "mp3": 0,
                    "m4a": 0
                }
            }


        for row in daily_rows:

            day = row["event_date"]

            if day not in daily:
                continue

            event_type = row["event_type"]

            count = row["total"]


            if event_type == "page_view":

                daily[day]["page_views"] += count


            elif event_type == "analysis":

                daily[day]["analyses"] += count


            elif event_type == "analysis_failed":

                daily[day]["analysis_failures"] += count


            elif event_type == "download_started":

                daily[day]["downloads_started"] += count

                download_type = row[
                    "download_type"
                ]

                if download_type == "audio":

                    daily[day][
                        "audio_downloads"
                    ] += count

                else:

                    daily[day][
                        "video_downloads"
                    ] += count

                fmt = row["format"]

                if fmt in daily[day]["formats"]:

                    daily[day]["formats"][
                        fmt
                    ] += count


            elif event_type == "download_completed":

                daily[day][
                    "downloads_completed"
                ] += count


            elif event_type == "download_failed":

                daily[day][
                    "downloads_failed"
                ] += count


            elif event_type == "file_served":

                daily[day][
                    "files_served"
                ] += count


            elif event_type in {
                "pause",
                "resume",
                "cancel",
                "retry"
            }:

                daily[day]["actions"][
                    event_type
                ] += count


        for day, count in daily_visitors.items():

            if day in daily:
                daily[day]["visitors"] = count


        totals = {

            "visitors": total_visitors,

            "page_views": event_counts.get(
                "page_view",
                0
            ),

            "analyses": event_counts.get(
                "analysis",
                0
            ),

            "analysis_failures": event_counts.get(
                "analysis_failed",
                0
            ),

            "downloads_started": event_counts.get(
                "download_started",
                0
            ),

            "downloads_completed": event_counts.get(
                "download_completed",
                0
            ),

            "downloads_failed": event_counts.get(
                "download_failed",
                0
            ),

            "video_downloads": 0,

            "audio_downloads": 0,

            "files_served": event_counts.get(
                "file_served",
                0
            ),

            "formats": formats,

            "completed_formats": completed_formats,

            "actions": {

                "pause": event_counts.get(
                    "pause",
                    0
                ),

                "resume": event_counts.get(
                    "resume",
                    0
                ),

                "cancel": event_counts.get(
                    "cancel",
                    0
                ),

                "retry": event_counts.get(
                    "retry",
                    0
                )
            }
        }


        download_type_rows = connection.execute(
            """
            SELECT
                download_type,
                COUNT(*) AS total
            FROM events
            WHERE
                event_type = 'download_started'
                AND download_type IS NOT NULL
            GROUP BY download_type
            """
        ).fetchall()

        for row in download_type_rows:

            if row["download_type"] == "audio":

                totals[
                    "audio_downloads"
                ] = row["total"]

            elif row["download_type"] == "video":

                totals[
                    "video_downloads"
                ] = row["total"]


        daily_values = list(
            daily.values()
        )

        last_7_days = daily_values[-7:]


        last_7_summary = {

            "visitors": sum(
                item["visitors"]
                for item in last_7_days
            ),

            "page_views": sum(
                item["page_views"]
                for item in last_7_days
            ),

            "analyses": sum(
                item["analyses"]
                for item in last_7_days
            ),

            "downloads_started": sum(
                item["downloads_started"]
                for item in last_7_days
            ),

            "downloads_completed": sum(
                item["downloads_completed"]
                for item in last_7_days
            ),

            "downloads_failed": sum(
                item["downloads_failed"]
                for item in last_7_days
            ),

            "video_downloads": sum(
                item["video_downloads"]
                for item in last_7_days
            ),

            "audio_downloads": sum(
                item["audio_downloads"]
                for item in last_7_days
            )
        }


        return {

            "success": True,

            "generated_at": now_string(),

            "totals": totals,

            "today": daily[
                today.isoformat()
            ],

            "last_7_days": last_7_summary,

            "last_30_days": daily,

            "devices": devices,

            "browsers": browsers
        }

    finally:

        connection.close()


initialize_analytics()


# =========================================================
# YT-DLP
# =========================================================

def get_ydl_options():

    return {

        "quiet": True,

        "no_warnings": True,

        "noplaylist": True,

        "retries": 3,

        "fragment_retries": 3,

        "impersonate": IMPERSONATE_TARGET,

        "http_headers": {
            "User-Agent": USER_AGENT
        },

        "ffmpeg_location": FFMPEG_LOCATION
    }


def extract_quality(
    format_id,
    format_note,
    height
):

    text = (
        f"{format_id or ''} "
        f"{format_note or ''}"
    )

    match = re.search(
        r"(?<!\d)(2160|1440|1080|720|480|360|240|144)p?(?!\d)",
        text
    )

    if match:

        return match.group(1)

    if height:

        try:

            return str(
                int(height)
            )

        except (
            TypeError,
            ValueError
        ):

            pass

    return None


def get_format_size(fmt):

    value = fmt.get(
        "filesize"
    )

    if value:
        return int(value)

    value = fmt.get(
        "filesize_approx"
    )

    if value:
        return int(value)

    return None


def build_format_list(info):

    formats = []

    for fmt in info.get(
        "formats",
        []
    ):

        height = fmt.get(
            "height"
        )

        if not height:
            continue

        try:

            height = int(height)

        except (
            TypeError,
            ValueError
        ):

            continue

        vcodec = fmt.get(
            "vcodec"
        )

        acodec = fmt.get(
            "acodec"
        )

        if not vcodec or vcodec == "none":
            continue

        quality = extract_quality(
            fmt.get("format_id"),
            fmt.get("format_note"),
            height
        )

        if not quality:

            quality = str(
                height
            )

        size = get_format_size(
            fmt
        )

        formats.append({

            "format_id": fmt.get(
                "format_id"
            ),

            "width": fmt.get(
                "width"
            ),

            "height": height,

            "quality": quality,

            "ext": fmt.get(
                "ext"
            ) or "mp4",

            "vcodec": vcodec,

            "acodec": acodec,

            "has_audio": bool(
                acodec
                and acodec != "none"
            ),

            "filesize": fmt.get(
                "filesize"
            ),

            "filesize_approx": fmt.get(
                "filesize_approx"
            ),

            "estimated_size": size,

            "fps": fmt.get(
                "fps"
            ),

            "format_note": fmt.get(
                "format_note"
            )
        })


    unique = {}

    for fmt in formats:

        key = (
            fmt["quality"],
            fmt["ext"],
            fmt["has_audio"]
        )

        existing = unique.get(
            key
        )

        if not existing:

            unique[key] = fmt

            continue

        current_size = (
            fmt.get(
                "estimated_size"
            )
            or 0
        )

        existing_size = (
            existing.get(
                "estimated_size"
            )
            or 0
        )

        if current_size > existing_size:

            unique[key] = fmt


    return list(
        unique.values()
    )


def get_available_qualities(formats):

    values = set()

    for fmt in formats:

        quality = fmt.get(
            "quality"
        )

        if quality:

            values.add(
                str(quality)
            )

    return sorted(
        values,
        key=lambda value: int(
            re.sub(
                r"\D",
                "",
                value
            ) or 0
        ),
        reverse=True
    )


def get_available_extensions(formats):

    values = []

    for fmt in formats:

        ext = str(
            fmt.get("ext") or ""
        ).lower()

        if (
            ext
            and ext not in values
        ):

            values.append(ext)


    preferred = []

    for ext in [
        "mp4",
        "webm",
        "mkv",
        "mov"
    ]:

        if ext in values:
            preferred.append(ext)


    for ext in values:

        if ext not in preferred:
            preferred.append(ext)


    return preferred


def get_best_quality(formats):

    qualities = get_available_qualities(
        formats
    )

    if not qualities:
        return None

    return qualities[0]


def get_quality_sizes(formats):

    sizes = {}

    for fmt in formats:

        quality = str(
            fmt.get("quality")
            or ""
        )

        size = fmt.get(
            "estimated_size"
        )

        if not quality or not size:
            continue

        current = sizes.get(
            quality
        )

        if (
            current is None
            or size > current
        ):

            sizes[quality] = size

    return sizes


# =========================================================
# HISTORY
# =========================================================

def load_history():

    if not HISTORY_FILE.exists():
        return []

    try:

        with open(
            HISTORY_FILE,
            "r",
            encoding="utf-8"
        ) as file:

            data = json.load(
                file
            )

        if isinstance(
            data,
            list
        ):

            return data

    except Exception:

        pass

    return []


def save_history(history):

    with open(
        HISTORY_FILE,
        "w",
        encoding="utf-8"
    ) as file:

        json.dump(
            history,
            file,
            indent=2
        )


def add_history(job):

    history = load_history()

    history.insert(
        0,
        {
            "id": uuid.uuid4().hex[:10],

            "title": (
                job.get("title")
                or "Downloaded Video"
            ),

            "source": (
                job.get("source")
                or "Unknown"
            ),

            "duration": job.get(
                "duration"
            ),

            "quality": job.get(
                "quality"
            ),

            "format": job.get(
                "format"
            ),

            "size": (
                job.get(
                    "downloaded_bytes"
                )
                or job.get(
                    "total_bytes"
                )
                or 0
            ),

            "filename": job.get(
                "filename"
            ),

            "timestamp": now_string()
        }
    )

    save_history(
        history
    )


# =========================================================
# JOBS
# =========================================================

def get_job(job_id):

    with jobs_lock:

        return jobs.get(
            job_id
        )


def update_job(
    job_id,
    **updates
):

    with jobs_lock:

        job = jobs.get(
            job_id
        )

        if not job:
            return None

        job.update(
            updates
        )

        return dict(
            job
        )


def create_job(
    url,
    quality,
    video_format,
    estimated_size=None,
    title=None,
    source=None,
    duration=None
):

    job_id = uuid.uuid4().hex

    video_format = str(
        video_format
        or "mp4"
    ).lower()

    job = {

        "id": job_id,

        "url": url,

        "quality": str(
            quality or ""
        ),

        "format": video_format,

        "estimated_size": estimated_size,

        "title": title or "Video",

        "source": source or "Unknown",

        "duration": duration,

        "status": "queued",

        "progress": 0,

        "speed": 0,

        "eta": None,

        "downloaded_bytes": 0,

        "total_bytes": (
            estimated_size
            or 0
        ),

        "filename": None,

        "error": None,

        "cancel_requested": False,

        "pause_requested": False,

        "download_type": (
            "audio"
            if video_format in AUDIO_FORMATS
            else "video"
        ),

        "created_at": time.time()
    }

    with jobs_lock:

        jobs[job_id] = job

    return job


def cleanup_job_folder(job_id):

    folder = (
        DOWNLOAD_FOLDER
        / job_id
    )

    if folder.exists():

        try:

            shutil.rmtree(
                folder,
                ignore_errors=True
            )

        except Exception:

            pass


def find_downloaded_file(folder):

    if not folder.exists():
        return None

    files = []

    for path in folder.rglob("*"):

        if path.is_file():
            files.append(path)

    if not files:
        return None

    files.sort(
        key=lambda path: path.stat().st_mtime,
        reverse=True
    )

    return files[0]


def get_partial_download_size(folder):

    if not folder.exists():
        return 0

    total = 0

    for path in folder.rglob("*"):

        if not path.is_file():
            continue

        try:

            total += path.stat().st_size

        except OSError:

            pass

    return total


# =========================================================
# DOWNLOAD
# =========================================================

def download_video(job_id):

    job = get_job(
        job_id
    )

    if not job:
        return

    job_folder = (
        DOWNLOAD_FOLDER
        / job_id
    )

    job_folder.mkdir(
        parents=True,
        exist_ok=True
    )


    def progress_hook(data):

        current_job = get_job(
            job_id
        )

        if not current_job:
            raise DownloadCancelled()

        if current_job.get(
            "cancel_requested"
        ):

            raise DownloadCancelled()

        if current_job.get(
            "pause_requested"
        ):

            raise DownloadPaused()


        status = data.get(
            "status"
        )


        if status == "downloading":

            downloaded = (
                data.get(
                    "downloaded_bytes"
                )
                or 0
            )

            total = (
                data.get(
                    "total_bytes"
                )
                or data.get(
                    "total_bytes_estimate"
                )
                or current_job.get(
                    "estimated_size"
                )
                or 0
            )

            percentage = 0

            if total:

                percentage = min(
                    100,
                    max(
                        0,
                        (
                            downloaded
                            / total
                        ) * 100
                    )
                )

            speed = (
                data.get(
                    "speed"
                )
                or 0
            )

            eta = data.get(
                "eta"
            )

            update_job(
                job_id,

                status="downloading",

                progress=percentage,

                downloaded_bytes=downloaded,

                total_bytes=total,

                speed=speed,

                eta=eta
            )


        elif status == "finished":

            current_job = get_job(
                job_id
            )

            if (
                current_job
                and current_job.get(
                    "pause_requested"
                )
            ):

                raise DownloadPaused()

            if (
                current_job
                and current_job.get(
                    "cancel_requested"
                )
            ):

                raise DownloadCancelled()

            update_job(
                job_id,

                status="processing",

                progress=100,

                downloaded_bytes=(
                    data.get(
                        "downloaded_bytes"
                    )
                    or 0
                ),

                speed=0,

                eta=0
            )


    quality = str(
        job.get("quality")
        or ""
    )

    output_format = str(
        job.get("format")
        or "mp4"
    ).lower()

    is_audio = (
        output_format
        in AUDIO_FORMATS
    )


    if is_audio:

        format_selector = (
            "bestaudio/best"
        )

    elif quality.isdigit():

        height = int(
            quality
        )

        format_selector = (
            f"bestvideo[height<={height}]+bestaudio/"
            f"best[height<={height}]"
        )

    else:

        format_selector = (
            "bestvideo+bestaudio/best"
        )


    output_template = str(
        job_folder
        / "%(title).150s.%(ext)s"
    )


    options = get_ydl_options()

    options.update({

        "format": format_selector,

        "outtmpl": output_template,

        "progress_hooks": [
            progress_hook
        ],

        "restrictfilenames": False,

        "continuedl": True,

        "overwrites": False
    })


    if is_audio:

        options["postprocessors"] = [

            {
                "key": "FFmpegExtractAudio",

                "preferredcodec": output_format,

                "preferredquality": (
                    "192"
                    if output_format == "mp3"
                    else None
                )
            }
        ]

        if output_format == "m4a":

            options[
                "postprocessors"
            ][0].pop(
                "preferredquality",
                None
            )

    else:

        options[
            "merge_output_format"
        ] = output_format


    try:

        current_job = get_job(
            job_id
        )

        if not current_job:
            return

        if current_job.get(
            "cancel_requested"
        ):

            raise DownloadCancelled()

        if current_job.get(
            "pause_requested"
        ):

            update_job(
                job_id,

                status="paused",

                speed=0,

                eta=None
            )

            return


        partial_size = (
            get_partial_download_size(
                job_folder
            )
        )

        if partial_size > 0:

            update_job(
                job_id,

                downloaded_bytes=partial_size
            )


        update_job(
            job_id,

            status="downloading",

            speed=0
        )


        with YoutubeDL(
            options
        ) as ydl:

            ydl.download(
                [job["url"]]
            )


        current_job = get_job(
            job_id
        )

        if not current_job:
            return

        if current_job.get(
            "cancel_requested"
        ):

            raise DownloadCancelled()

        if current_job.get(
            "pause_requested"
        ):

            raise DownloadPaused()


        downloaded_file = (
            find_downloaded_file(
                job_folder
            )
        )

        if not downloaded_file:

            raise RuntimeError(
                "Download finished but the downloaded "
                "file could not be found."
            )


        filename = (
            downloaded_file.name
        )

        file_size = (
            downloaded_file.stat().st_size
        )


        updated_job = update_job(

            job_id,

            status="completed",

            progress=100,

            downloaded_bytes=file_size,

            total_bytes=file_size,

            speed=0,

            eta=0,

            filename=filename,

            error=None,

            pause_requested=False,

            cancel_requested=False
        )


        if updated_job:

            add_history(
                updated_job
            )

            record_job_analytics(
                "download_completed",
                updated_job
            )


    except DownloadPaused:

        partial_size = (
            get_partial_download_size(
                job_folder
            )
        )

        current_job = get_job(
            job_id
        )

        update_job(

            job_id,

            status="paused",

            progress=(
                current_job.get(
                    "progress",
                    0
                )
                if current_job
                else 0
            ),

            downloaded_bytes=partial_size,

            speed=0,

            eta=None,

            error=None,

            pause_requested=False,

            cancel_requested=False
        )


    except DownloadCancelled:

        update_job(

            job_id,

            status="cancelled",

            error=None,

            speed=0,

            eta=None,

            pause_requested=False
        )

        cleanup_job_folder(
            job_id
        )


    except Exception as error:

        current_job = get_job(
            job_id
        )

        if not current_job:
            return


        if current_job.get(
            "cancel_requested"
        ):

            update_job(

                job_id,

                status="cancelled",

                error=None,

                speed=0,

                eta=None,

                pause_requested=False
            )

            cleanup_job_folder(
                job_id
            )


        elif current_job.get(
            "pause_requested"
        ):

            partial_size = (
                get_partial_download_size(
                    job_folder
                )
            )

            update_job(

                job_id,

                status="paused",

                downloaded_bytes=partial_size,

                speed=0,

                eta=None,

                error=None,

                pause_requested=False,

                cancel_requested=False
            )


        else:

            updated_job = update_job(

                job_id,

                status="failed",

                error=str(error),

                speed=0,

                eta=None,

                pause_requested=False
            )

            if updated_job:

                record_job_analytics(
                    "download_failed",
                    updated_job
                )

            cleanup_job_folder(
                job_id
            )


def start_download_thread(job_id):

    thread = threading.Thread(

        target=download_video,

        args=(job_id,),

        daemon=True
    )

    thread.start()


# =========================================================
# ROUTES
# =========================================================

@app.route("/")
def index():

    visitor_id = record_page_view()

    response = make_response(
        render_template(
            "index.html"
        )
    )

    return set_visitor_cookie(
        response,
        visitor_id
    )


@app.route(
    "/api/analyze",
    methods=["POST"]
)
def analyze():

    data = request.get_json(
        silent=True
    ) or {}

    url = str(
        data.get("url") or ""
    ).strip()

    if not url:

        return jsonify({

            "success": False,

            "error": "Please enter a video URL."

        }), 400


    try:

        options = get_ydl_options()

        with YoutubeDL(
            options
        ) as ydl:

            info = ydl.extract_info(
                url,
                download=False
            )


        formats = build_format_list(
            info
        )

        qualities = get_available_qualities(
            formats
        )

        available_formats = get_available_extensions(
            formats
        )

        best_quality = get_best_quality(
            formats
        )

        quality_sizes = get_quality_sizes(
            formats
        )


        thumbnail = info.get(
            "thumbnail"
        )

        duration = info.get(
            "duration"
        )

        title = (
            info.get("title")
            or "Untitled Video"
        )

        source = (
            info.get("extractor_key")
            or info.get("extractor")
            or "Unknown"
        )


        record_analytics_event(

            "analysis",

            visitor_id=get_request_visitor_id()
        )


        return jsonify({

            "success": True,

            "title": title,

            "source": source,

            "thumbnail": thumbnail,

            "duration": duration,

            "url": url,

            "qualities": qualities,

            "available_qualities": qualities,

            "available_formats": available_formats,

            "formats": available_formats,

            "audio_formats": [
                "mp3",
                "m4a"
            ],

            "best_quality": best_quality,

            "quality_sizes": quality_sizes,

            "formats_detail": formats
        })


    except Exception as error:

        record_analytics_event(

            "analysis_failed",

            visitor_id=get_request_visitor_id()
        )

        return jsonify({

            "success": False,

            "error": str(error)

        }), 500


@app.route(
    "/api/download",
    methods=["POST"]
)
def start_download():

    data = request.get_json(
        silent=True
    ) or {}


    url = str(
        data.get("url") or ""
    ).strip()

    quality = str(
        data.get("quality") or ""
    ).strip()

    video_format = str(
        data.get("format") or "mp4"
    ).strip().lower()

    estimated_size = data.get(
        "estimated_size"
    )

    title = data.get(
        "title"
    )

    source = data.get(
        "source"
    )

    duration = data.get(
        "duration"
    )


    if not url:

        return jsonify({

            "success": False,

            "error": "Video URL is required."

        }), 400


    if not quality:
        quality = "best"


    if video_format not in AUDIO_FORMATS:

        if video_format not in {

            "mp4",
            "webm",
            "mkv",
            "mov"

        }:

            video_format = "mp4"


    if estimated_size:

        try:

            estimated_size = int(
                estimated_size
            )

        except (
            TypeError,
            ValueError
        ):

            estimated_size = None


    with jobs_lock:

        for existing in jobs.values():

            if (

                existing.get("url") == url

                and existing.get("quality") == quality

                and existing.get("format") == video_format

                and existing.get("status") in {

                    "queued",
                    "downloading",
                    "processing",
                    "paused"

                }

            ):

                return jsonify({

                    "success": False,

                    "error":
                        "This download is already "
                        "in progress.",

                    "job": dict(existing)

                }), 409


    job = create_job(

        url=url,

        quality=quality,

        video_format=video_format,

        estimated_size=estimated_size,

        title=title,

        source=source,

        duration=duration
    )


    visitor_id = get_request_visitor_id()

    user_agent = request.headers.get(
        "User-Agent",
        ""
    )


    set_job_analytics_context(

        job["id"],

        visitor_id=visitor_id,

        device=detect_device(
            user_agent
        ),

        browser=detect_browser(
            user_agent
        )
    )


    record_job_analytics(
        "download_started",
        job
    )


    start_download_thread(
        job["id"]
    )


    response = jsonify({

        "success": True,

        "job": job
    })


    return set_visitor_cookie(

        response,

        visitor_id
    )


@app.route(
    "/api/jobs",
    methods=["GET"]
)
def get_jobs():

    with jobs_lock:

        data = [

            dict(job)

            for job in jobs.values()

        ]


    data.sort(

        key=lambda item: item.get(
            "created_at",
            0
        ),

        reverse=True
    )


    return jsonify({

        "success": True,

        "jobs": data
    })


@app.route(
    "/api/progress/<job_id>",
    methods=["GET"]
)
def download_progress(job_id):

    job = get_job(
        job_id
    )

    if not job:

        return jsonify({

            "success": False,

            "error": "Download job not found."

        }), 404


    return jsonify({

        "success": True,

        "job": job
    })


@app.route(
    "/api/pause/<job_id>",
    methods=["POST"]
)
def pause_download(job_id):

    job = get_job(
        job_id
    )

    if not job:

        return jsonify({

            "success": False,

            "error": "Download job not found."

        }), 404


    status = job.get(
        "status"
    )


    if status == "paused":

        return jsonify({

            "success": True,

            "message": "Download is already paused.",

            "job": job
        })


    if status not in {

        "queued",
        "downloading",
        "processing"

    }:

        return jsonify({

            "success": False,

            "error":
                "Only active downloads can be paused.",

            "job": job

        }), 400


    update_job(

        job_id,

        pause_requested=True,

        status="pausing"
    )


    record_job_analytics(

        "pause",

        job
    )


    return jsonify({

        "success": True,

        "message": "Pause requested.",

        "job": get_job(job_id)
    })


@app.route(
    "/api/resume/<job_id>",
    methods=["POST"]
)
def resume_download(job_id):

    job = get_job(
        job_id
    )

    if not job:

        return jsonify({

            "success": False,

            "error": "Download job not found."

        }), 404


    if job.get(
        "status"
    ) != "paused":

        return jsonify({

            "success": False,

            "error":
                "Only paused downloads can be resumed.",

            "job": job

        }), 400


    update_job(

        job_id,

        status="queued",

        pause_requested=False,

        cancel_requested=False,

        error=None,

        speed=0,

        eta=None
    )


    record_job_analytics(

        "resume",

        job
    )


    start_download_thread(
        job_id
    )


    return jsonify({

        "success": True,

        "message": "Download resumed.",

        "job": get_job(job_id)
    })


@app.route(
    "/api/cancel/<job_id>",
    methods=["POST"]
)
def cancel_download(job_id):

    job = get_job(
        job_id
    )

    if not job:

        return jsonify({

            "success": False,

            "error": "Download job not found."

        }), 404


    status = job.get(
        "status"
    )


    if status in {

        "completed",
        "failed",
        "cancelled"

    }:

        return jsonify({

            "success": False,

            "error":
                "This download is no longer active.",

            "job": job

        }), 400


    if status == "paused":

        update_job(

            job_id,

            cancel_requested=True,

            pause_requested=False,

            status="cancelled"
        )


        record_job_analytics(

            "cancel",

            job
        )


        cleanup_job_folder(
            job_id
        )


        return jsonify({

            "success": True,

            "message": "Download cancelled.",

            "job": get_job(job_id)
        })


    update_job(

        job_id,

        cancel_requested=True,

        pause_requested=False
    )


    record_job_analytics(

        "cancel",

        job
    )


    return jsonify({

        "success": True,

        "message": "Cancellation requested.",

        "job": get_job(job_id)
    })


@app.route(
    "/api/retry/<job_id>",
    methods=["POST"]
)
def retry_download(job_id):

    old_job = get_job(
        job_id
    )

    if not old_job:

        return jsonify({

            "success": False,

            "error": "Download job not found."

        }), 404


    if old_job.get(
        "status"
    ) not in {

        "failed",
        "cancelled"

    }:

        return jsonify({

            "success": False,

            "error":
                "Only failed or cancelled "
                "downloads can be retried."

        }), 400


    new_job = create_job(

        url=old_job.get(
            "url"
        ),

        quality=old_job.get(
            "quality"
        ),

        video_format=old_job.get(
            "format"
        ),

        estimated_size=old_job.get(
            "estimated_size"
        ),

        title=old_job.get(
            "title"
        ),

        source=old_job.get(
            "source"
        ),

        duration=old_job.get(
            "duration"
        )
    )


    visitor_id = (

        request.cookies.get(
            VISITOR_COOKIE
        )

        or get_job_analytics_context(
            job_id
        ).get(
            "visitor_id"
        )
    )


    user_agent = request.headers.get(
        "User-Agent",
        ""
    )


    set_job_analytics_context(

        new_job["id"],

        visitor_id=visitor_id,

        device=detect_device(
            user_agent
        ),

        browser=detect_browser(
            user_agent
        )
    )


    record_job_analytics(
        "retry",
        old_job
    )

    record_job_analytics(
        "download_started",
        new_job
    )


    start_download_thread(
        new_job["id"]
    )


    return jsonify({

        "success": True,

        "job": new_job
    })


@app.route(
    "/api/download-file/<job_id>",
    methods=["GET"]
)
def download_file(job_id):

    job = get_job(
        job_id
    )

    if not job:

        return jsonify({

            "success": False,

            "error": "Download job not found."

        }), 404


    if job.get(
        "status"
    ) != "completed":

        return jsonify({

            "success": False,

            "error":
                "The download is not completed yet."

        }), 400


    folder = (
        DOWNLOAD_FOLDER
        / job_id
    )


    file_path = find_downloaded_file(
        folder
    )


    if (
        not file_path
        or not file_path.exists()
    ):

        return jsonify({

            "success": False,

            "error":
                "Downloaded file no longer exists."

        }), 404


    record_job_analytics(

        "file_served",

        job
    )


    return send_file(

        file_path,

        as_attachment=True,

        download_name=file_path.name
    )


# =========================================================
# ANALYTICS API
# =========================================================

@app.route(
    "/api/analytics",
    methods=["GET"]
)
def analytics():

    return jsonify(
        get_analytics_stats()
    )


# =========================================================
# OVERVIEW DASHBOARD
# =========================================================

@app.route(
    "/overview",
    methods=["GET"]
)
def overview_dashboard():

    visitor_id = record_page_view()

    response = make_response(

        render_template(
            "overview.html"
        )
    )

    return set_visitor_cookie(

        response,

        visitor_id
    )


# =========================================================
# ANALYTICS DASHBOARD
# =========================================================

@app.route(
    "/analytics",
    methods=["GET"]
)
def analytics_dashboard():

    visitor_id = record_page_view()

    response = make_response(

        render_template(
            "analytics.html"
        )
    )

    return set_visitor_cookie(

        response,

        visitor_id
    )


# =========================================================
# HISTORY DASHBOARD
# =========================================================

@app.route(
    "/history",
    methods=["GET"]
)
def history_dashboard():

    visitor_id = record_page_view()

    response = make_response(

        render_template(
            "history.html"
        )
    )

    return set_visitor_cookie(

        response,

        visitor_id
    )


# =========================================================
# SETTINGS DASHBOARD
# =========================================================

@app.route(
    "/settings",
    methods=["GET"]
)
def settings_dashboard():

    visitor_id = record_page_view()

    response = make_response(

        render_template(
            "settings.html"
        )
    )

    return set_visitor_cookie(

        response,

        visitor_id
    )


# =========================================================
# OTHER ROUTES
# =========================================================

@app.route(
    "/api/clear-completed",
    methods=["DELETE"]
)
def clear_completed():

    removed = []

    with jobs_lock:

        completed_ids = [

            job_id

            for job_id, job in jobs.items()

            if job.get(
                "status"
            ) == "completed"

        ]


        for job_id in completed_ids:

            removed.append(
                job_id
            )

            del jobs[
                job_id
            ]


    for job_id in removed:

        remove_job_analytics_context(
            job_id
        )


    return jsonify({

        "success": True,

        "removed": removed
    })


@app.route(
    "/api/history",
    methods=["GET"]
)
def get_history():

    return jsonify({

        "success": True,

        "history": load_history()
    })


@app.route(
    "/api/history",
    methods=["DELETE"]
)
def clear_history():

    save_history([])

    return jsonify({

        "success": True
    })


@app.route(
    "/api/history/<history_id>",
    methods=["DELETE"]
)
def delete_history_item(history_id):

    history = load_history()

    updated = [

        item

        for item in history

        if str(
            item.get("id")
        ) != str(
            history_id
        )

    ]


    save_history(
        updated
    )


    return jsonify({

        "success": True
    })


# =========================================================
# START SERVER
# =========================================================

if __name__ == "__main__":

    print()

    print("=" * 55)

    print("VDownloader")

    print("=" * 55)

    print(
        "Server: http://127.0.0.1:5000"
    )

    print(
        "Pause/Resume backend enabled"
    )

    print(
        "Audio-only downloads enabled"
    )

    print(
        "Analytics system enabled"
    )

    print(
        "Overview dashboard: "
        "http://127.0.0.1:5000/overview"
    )

    print(
        "Analytics dashboard: "
        "http://127.0.0.1:5000/analytics"
    )

    print(
        "History dashboard: "
        "http://127.0.0.1:5000/history"
    )

    print(
        "Settings dashboard: "
        "http://127.0.0.1:5000/settings"
    )

    print(
        "Analytics database: analytics.db"
    )

    print("=" * 55)

    print()

    app.run(
        host="127.0.0.1",
        port=5000,
        debug=True
    )


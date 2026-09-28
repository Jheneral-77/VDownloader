# VDownloader

VDownloader is a web-based video downloading application that allows users to analyze video links, select download options, manage downloads, and keep track of their download history.

## Features

* Analyze video URLs
* Detect supported platforms
* Display video information and thumbnails
* Select video quality
* Select download format
* Start and manage downloads
* Pause and resume downloads
* Cancel downloads
* Retry failed downloads
* Display download progress
* Open completed downloaded files
* Maintain download history
* View download analytics
* View dashboard statistics
* Light and dark themes
* Settings management

## Technologies Used

* Python
* Flask
* JavaScript
* HTML5
* CSS3
* yt-dlp
* SQLite
* FFmpeg

## Project Structure

```text
Video-Downloader/
│
├── app.py
├── README.md
├── history.json
├── analytics.db
│
├── downloads/
│
├── templates/
│   ├── index.html
│   ├── overview.html
│   ├── analytics.html
│   ├── history.html
│   └── settings.html
│
└── static/
    ├── style.css
    ├── script.js
    ├── theme.js
    │
    ├── overview.css
    ├── overview.js
    │
    ├── analytics.css
    ├── analytics.js
    │
    ├── history.css
    ├── history.js
    │
    ├── settings.css
    └── settings.js
```

## Requirements

Before running VDownloader, make sure you have:

* Python 3.10 or newer
* Flask
* yt-dlp
* FFmpeg

## Installation

Clone or copy the project to your computer.

Open a terminal inside the project folder and install the required Python packages:

```bash
py -m pip install flask yt-dlp
```

Make sure FFmpeg is installed and available to the application.

## Running the Application

Open the project folder:

```text
C:\Users\Corniel Ventures\Downloads\Video-Downloader
```

Run:

```bash
py app.py
```

The application will start on:

```text
http://127.0.0.1:5000
```

Open the address in a web browser.

## How to Use

### 1. Analyze a Video

Open the Downloader page and paste a supported video URL into the URL field.

Click **Analyze**.

The application will retrieve information about the video.

### 2. Select Download Options

After the video has been analyzed, select:

* Download type
* Video quality
* File format

### 3. Start the Download

Click **Download** to start the download.

The download manager displays the current progress and status.

### 4. Manage the Download

Depending on the download state, users can:

* Pause
* Resume
* Cancel
* Retry

### 5. View Completed Downloads

After a download is completed, the user can open the downloaded file.

Completed downloads are also recorded in the History section.

## Dashboard

VDownloader includes a dashboard with several sections:

### Overview

Displays general download statistics and recent activity.

### Analytics

Displays information about downloads, formats, devices, browsers, and activity.

### History

Displays completed and failed downloads.

### Settings

Allows users to manage application preferences such as theme and download settings.

## Supported Platforms

VDownloader uses `yt-dlp` to process supported video platforms. Available support depends on the platforms and extractors supported by the installed version of yt-dlp.

## FFmpeg

FFmpeg is used for video/audio processing and merging when required.

The application is configured to use the FFmpeg installation specified in its backend configuration.

## Future Improvements

Possible future improvements include:

* Additional platform support
* User accounts
* Cloud storage integration
* More download format options
* Improved download scheduling
* Advanced analytics
* Improved error reporting
* Mobile-responsive improvements
* Download queue management

## Project Status

VDownloader has completed functional testing of its main features, including video analysis, downloading, pause/resume, cancellation, history, analytics, dashboard navigation, settings, and the complete download workflow.

## Author

Developed as a web-based video downloader project using Python, Flask, JavaScript, HTML, CSS, yt-dlp, SQLite, and FFmpeg.

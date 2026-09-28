# VDownloader

VDownloader is a web-based video downloading application built with Python and Flask. It allows users to analyze supported video URLs, select download options, manage downloads, monitor progress, and view download history and analytics through a modern web interface.

## Features

* Analyze video URLs
* Detect supported video platforms through `yt-dlp`
* Display video information and thumbnails
* Select video quality
* Select download format
* Start and manage downloads
* Pause and resume downloads
* Cancel downloads
* Retry failed downloads
* Monitor download progress
* View completed downloads
* Maintain download history
* View download analytics
* View dashboard statistics
* Light and dark themes
* Application settings
* Responsive web interface

## Technologies

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
VDownloader/
│
├── app.py
├── README.md
├── requirements.txt
├── .gitignore
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

Local application data such as downloaded files, download history, analytics data, and the Python virtual environment are excluded from the Git repository through `.gitignore`.

## Requirements

Before running VDownloader locally, make sure you have:

* Python 3.10 or newer
* pip
* FFmpeg
* A supported operating system

The Python dependencies are listed in `requirements.txt`.

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/Jheneral-77/VDownloader.git
cd VDownloader
```

### 2. Create a virtual environment

Windows:

```powershell
py -m venv venv
```

Activate it:

```powershell
venv\Scripts\activate
```

### 3. Install dependencies

```powershell
py -m pip install -r requirements.txt
```

### 4. Install FFmpeg

VDownloader uses FFmpeg for video/audio processing and media merging when required.

Make sure FFmpeg is installed and available to the application.

## Running Locally

Start the Flask application:

```powershell
py app.py
```

The application will normally be available at:

```text
http://127.0.0.1:5000
```

Open the address in your web browser.

## How to Use

### 1. Analyze a Video

Open the Downloader page and paste a supported video URL into the URL field.

Click **Analyze**.

VDownloader will retrieve available information about the video.

### 2. Select Download Options

After the video has been analyzed, select the available:

* Download type
* Video quality
* File format

### 3. Start the Download

Click **Download** to start the download.

The download manager displays the current download status and progress.

### 4. Manage Downloads

Depending on the download state, users can:

* Pause
* Resume
* Cancel
* Retry

### 5. View Completed Downloads

After a download is completed, the user can access the downloaded file.

Completed downloads are also recorded in the History section.

## Dashboard

VDownloader includes several dashboard sections.

### Overview

Displays general download statistics and recent download activity.

### Analytics

Displays download-related statistics and activity information.

### History

Displays recorded download activity and allows users to manage their download history.

### Settings

Allows users to manage available application preferences such as theme and download settings.

## Supported Platforms

VDownloader uses `yt-dlp` to process supported video platforms.

Available platform support depends on the installed version of `yt-dlp` and the extractors available at the time of use.

Because platform support can change, a URL working today may not necessarily remain supported indefinitely.

## FFmpeg

FFmpeg is used for media processing and for merging separate video and audio streams when required.

The application uses the FFmpeg configuration defined by the backend.

For production deployment, FFmpeg must be installed and correctly configured on the server.

## Production Considerations

VDownloader is currently being prepared for public deployment.

Before operating the application as a large-scale public service, additional production improvements may be required, including:

* Persistent job storage
* Persistent file storage
* Multi-user download management
* Authentication and user accounts
* Server-side security hardening
* Rate limiting
* Better resource management
* Background worker infrastructure
* Improved logging and monitoring
* Production WSGI server configuration
* HTTPS configuration
* Scalable storage
* Download size and resource limits

The current application has been tested locally and its main functionality is working.

## Deployment

VDownloader is designed to be deployable as a Flask web application.

A production deployment should provide:

* Python runtime
* Flask-compatible WSGI server
* FFmpeg
* Sufficient CPU and memory resources
* Persistent storage where required
* HTTPS
* Appropriate server security configuration

Deployment-specific configuration may vary depending on the hosting provider.

## Project Status

VDownloader has completed functional testing of its main application features, including:

* Video analysis
* Video downloading
* Download progress tracking
* Pause and resume
* Download cancellation
* Download retry
* Download history
* Analytics
* Dashboard navigation
* Settings
* Theme switching
* Complete end-to-end download workflow

The project is currently moving from local development and testing toward production deployment.

## Legal and Responsible Use

VDownloader is intended to provide a technical interface for downloading media from supported sources.

Users are responsible for ensuring that their use of the application complies with applicable copyright laws, the rights of content owners, and the terms of service of the platforms they access.

Do not use VDownloader to download or distribute content without the necessary rights or permission.

## Future Improvements

Planned or possible improvements include:

* Public deployment
* User accounts
* Persistent cloud storage
* Improved multi-user support
* Additional platform support
* More download formats
* Improved download scheduling
* Advanced analytics
* Download queue management
* Improved error reporting
* Better resource management
* Enhanced mobile experience
* Production monitoring

## Author

**Jheneral**

VDownloader is developed using Python, Flask, JavaScript, HTML, CSS, yt-dlp, SQLite, and FFmpeg.

## Repository

GitHub:

https://github.com/Jheneral-77/VDownloader

# Sacaudio - Video Segment Audio Extractor

A single-page web application that allows you to load local video files, navigate through them, mark segments, extract audio from those segments, and save the resulting audio files to your local disk. All processing happens client-side in your browser - no data is uploaded to any server.

## Features

### Core Functionality
- **Video Loading**: Load video files from your local disk (MP4, MKV, MOV, AVI, WebM, etc.)
- **Smooth Navigation**: Timeline slider with smooth seeking and playback controls
- **Segment Marking**: Mark start and end points for video segments
- **Audio Extraction**: Extract audio from marked segments using FFmpeg WebAssembly
- **Multiple Formats**: Support for WAV, MP3, AAC/M4A, FLAC, and OGG output formats
- **Quality Preservation**: Preserves original audio quality when possible, uses high-quality encoding when transcoding is required

### User Interface
- **Responsive Design**: Works on desktop and mobile devices
- **Dark/Light Theme**: Toggle between light and dark themes
- **Multi-language Support**: English, Spanish, and Portuguese (auto-detects system language)
- **Segment Management**: Side panel to view, edit, and manage all segments
- **Progress Indicators**: Visual feedback during audio extraction
- **Notifications**: Success and error notifications

### Playback Controls
- **Play/Pause**: Standard playback controls
- **Playback Speed**: Adjust speed from 0.5x to 2x
- **Segment Playback**: Play only the currently selected segment
- **Timeline Navigation**: Click and drag to seek through the video
- **Keyboard Shortcuts**: Space to play/pause, arrow keys to seek

### Audio Extraction
- **Stream Copy**: When possible, extracts audio without re-encoding to preserve original quality
- **High-Quality Transcoding**: When stream copy isn't possible, uses high-quality encoder settings
- **Multiple Segments**: Extract audio from multiple segments in one session
- **Custom Filenames**: Set base filename for all segments or custom names for individual segments
- **Format Selection**: Choose output format per segment

## Installation

### Prerequisites
- Node.js 18.0 or later
- npm 9.0 or later

### Setup

1. **Clone the repository**:
```bash
cd /workspace/RoberVH__Sacaudio
git init
```

2. **Install dependencies**:
```bash
npm install
```

3. **Start the development server**:
```bash
npm run dev
```

4. **Open in browser**:
The app will be available at `http://localhost:3000`

### Production Build

To create a production build:
```bash
npm run build
```

The optimized files will be in the `dist` directory.

## Usage

### Loading a Video
1. Click the dropzone area or drag and drop a video file
2. Supported formats: MP4, MKV, MOV, AVI, WebM
3. Maximum file size: 2GB (browser limitation)

### Creating Segments
1. Navigate to the start of your desired segment using the timeline or playback controls
2. Click "Set Start" button
3. Navigate to the end of your segment
4. Click "Set End" button
5. (Optional) Enter a name for the segment
6. Click "Add Segment" to save it to the side panel

### Extracting Audio
1. In the side panel, find the segment you want to extract
2. Click the "Extract" button for that segment
3. Wait for the extraction to complete (FFmpeg will load on first use)
4. Once complete, click "Download" to save the audio file

### Settings
- **Theme**: Toggle between light, dark, or system theme
- **Language**: Switch between English, Spanish, and Portuguese
- **Audio Format**: Set default audio format for new segments
- **Base Filename**: Set default base filename for all segments

## Technical Details

### Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Internationalization**: i18next
- **Audio Processing**: FFmpeg WebAssembly (@ffmpeg/ffmpeg)

### FFmpeg Usage
The app uses FFmpeg compiled to WebAssembly to perform audio extraction. This allows:
- **Client-side processing**: No server required
- **Stream copy**: When the source audio codec matches the target format, the audio is extracted without re-encoding
- **High-quality transcoding**: When stream copy isn't possible, uses high-quality encoder settings:
  - MP3: libmp3lame with VBR quality 2 (~190kbps)
  - AAC: aac encoder with 192kbps bitrate
  - FLAC: flac encoder with compression level 8
  - OGG: libvorbis with quality 8 (~256kbps)
  - WAV: pcm_s16le (uncompressed)

### State Management
- Uses React's useReducer for predictable state management
- Persists user preferences (theme, language, base filename, audio format) to localStorage
- Manages video state, segments, and extraction status

### Component Structure
```
src/
├── components/          # Reusable UI components
│   ├── FileDropzone.tsx
│   ├── PlaybackControls.tsx
│   ├── SegmentList.tsx
│   ├── SettingsPanel.tsx
│   ├── Timeline.tsx
│   └── VideoPlayer.tsx
├── hooks/              # Custom React hooks
│   └── useAppState.ts
├── services/           # Business logic and external services
│   └── ffmpegService.ts
├── types/              # TypeScript type definitions
│   └── index.ts
├── utils/              # Utility functions
│   ├── theme.ts
│   └── time.ts
├── locales/            # Translation files
│   ├── en/
│   │   └── translation.json
│   ├── es/
│   │   └── translation.json
│   └── pt/
│       └── translation.json
├── i18n/              # i18n configuration
│   └── config.ts
├── styles/            # Global styles
│   └── index.css
├── App.tsx            # Main application component
└── main.tsx          # Entry point
```

## Browser Compatibility

- **Chrome**: Full support
- **Firefox**: Full support
- **Safari**: Full support
- **Edge**: Full support

Note: FFmpeg WebAssembly requires a modern browser with WebAssembly support.

## Limitations

1. **File Size**: Browser memory limitations may prevent loading very large files (>2GB)
2. **Processing Time**: Audio extraction can take time, especially for large files or when transcoding is required
3. **Format Support**: Output format support depends on FFmpeg WASM capabilities
4. **Memory Usage**: FFmpeg WASM loads into memory, which may cause performance issues on low-memory devices

## Security

- **No Server Uploads**: All processing happens in your browser
- **No Data Collection**: The app doesn't collect or transmit any data
- **Local Storage**: Only stores user preferences (theme, language, etc.)
- **File Access**: Only accesses files you explicitly select

## License

This project is private and intended for personal use.

## Contributing

This is a personal project, but contributions are welcome. Please open an issue or pull request with your suggestions.

## Acknowledgments

- [FFmpeg](https://ffmpeg.org/) - The powerful multimedia framework
- [FFmpeg WebAssembly](https://github.com/ffmpegwasm/ffmpeg.wasm) - FFmpeg compiled to WebAssembly
- [React](https://react.dev/) - The JavaScript library for building user interfaces
- [TypeScript](https://www.typescriptlang.org/) - Typed JavaScript at Any Scale
- [Vite](https://vitejs.dev/) - Next Generation Frontend Tooling
- [Tailwind CSS](https://tailwindcss.com/) - A utility-first CSS framework
- [i18next](https://www.i18next.com/) - Internationalization framework
- [Lucide React](https://lucide.dev/) - Beautiful and consistent icons

# Features

HD Homey provides a complete solution for remotely accessing your HDHomeRun live TV streams with security, transcoding, and multi-user support.

## Core Features

### 📺 Tuner Management
Add, configure, and manage multiple HDHomeRun devices with automatic channel discovery and connection validation.

[Learn More →](/features/tuner-management)

**Key capabilities:**
- Auto-discovery of HDHomeRun devices on your network
- Connection testing and validation
- Multiple tuner support
- Manual tuner configuration

### 🎬 Channel Streaming
Browse and stream live TV channels through your web browser or external media players.

[Learn More →](/features/channel-management)

**Key capabilities:**
- Channel lineup browsing
- Direct streaming in browser (native MPEG-2)
- HLS transcoded streams for compatibility
- External player support (VLC, mpv, etc.)

### 🔄 Video Transcoding
Real-time conversion of MPEG-2 streams to H.264/HLS for broader device compatibility and bandwidth optimization.

[Learn More →](/features/video-transcoding)

**Key capabilities:**
- Automatic MPEG-2 to H.264 conversion
- HLS stream generation
- Shared session management (multiple viewers, one transcode)
- Configurable quality settings

### 👥 User Management
Role-based access control with admin and viewer roles for secure multi-user access.

[Learn More →](/features/user-management)

**Key capabilities:**
- Admin and viewer role system
- User account creation and management
- Password change functionality
- Session management

### 🔗 User Invitations
Generate secure invitation links for easy user onboarding without sharing credentials.

[Learn More →](/features/user-invitations)

**Key capabilities:**
- Single-use invitation links
- Role assignment (admin/viewer)
- Expiration management
- Invitation tracking

### 🔐 Stream Security
Token-based authentication ensures only authorized users can access your streams.

[Learn More →](/features/stream-security)

**Key capabilities:**
- HMAC-SHA256 stream tokens
- Time-limited access tokens
- Device fingerprinting
- Secure token validation

## Feature Highlights

### Web-Based Interface
Modern, responsive web interface built with React and Next.js:
- Clean, intuitive design using new.css
- Mobile-responsive layouts
- Accessibility compliance (WCAG 2.2 AA)
- Dark theme support

### Authentication & Security
Secure authentication powered by Better-Auth:
- Scrypt password hashing
- JWT session tokens
- Cookie-based sessions with HttpOnly flags
- CSRF protection

### Database & Storage
Lightweight SQLite database with Drizzle ORM:
- Automatic migrations
- Simple backup and restore
- No external database dependencies
- Efficient query performance

### Docker Support
First-class Docker support for easy deployment:
- Pre-built images on GitHub Container Registry
- Docker Compose configuration
- Volume persistence
- Health checks

## Feature Status

All core features are complete and tested:

| Feature | Status | Test Coverage |
|---------|--------|---------------|
| Tuner Management | ✅ Complete | ✅ 100% |
| Channel Streaming | ✅ Complete | ✅ 100% |
| Video Transcoding | ✅ Complete | ✅ 100% |
| User Management | ✅ Complete | ✅ 100% |
| User Invitations | ✅ Complete | ✅ 100% |
| Stream Security | ✅ Complete | ✅ 100% |
| Authentication | ✅ Complete | ✅ 100% |

**Current Version**: v1.0.0-beta.4

[View Changelog](https://github.com/shaunburdick/hd-homey/blob/main/CHANGELOG.md)

## Coming Soon

Future features under consideration:
- EPG (Electronic Program Guide) integration
- Recording/DVR functionality
- Channel grouping and favorites
- Multi-language support
- Mobile apps (iOS/Android)

## Performance Characteristics

HD Homey is designed for efficiency:

- **Low resource usage**: ~50-100MB RAM for base application
- **Scalable transcoding**: Shares sessions across multiple viewers
- **Efficient streaming**: Direct passthrough when transcoding not needed
- **Quick startup**: Typically under 5 seconds to fully operational

## Browser Compatibility

HD Homey works with all modern browsers:
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

Native MPEG-2 playback requires browser codec support or transcoding.

## Next Steps

- [Get Started](/getting-started/)
- [Configuration Guide](/config/)
- [API Documentation](/api/)
- [Troubleshooting](/troubleshooting/)

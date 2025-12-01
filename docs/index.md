---
layout: home

hero:
  name: "HD Homey"
  text: "HDHomeRun Proxy for Remote Streaming"
  tagline: Stream live TV from your HDHomeRun devices anywhere with secure authentication and video transcoding
  image:
    src: /hd-homey.png
    alt: HD Homey Logo
  actions:
    - theme: brand
      text: Get Started
      link: /getting-started/quick-start
    - theme: alt
      text: View on GitHub
      link: https://github.com/shaunburdick/hd-homey

features:
  - icon: 📺
    title: Tuner Management
    details: Add, configure, and manage multiple HDHomeRun devices with automatic channel scanning and connection validation.
    link: /features/tuner-management
  
  - icon: 🎬
    title: Live Streaming
    details: Stream channels in your browser or external players with secure token-based authentication.
    link: /features/channel-management
  
  - icon: 🔄
    title: Video Transcoding
    details: Real-time MPEG-2 to H.264/HLS transcoding with shared session management for efficient streaming.
    link: /features/video-transcoding
  
  - icon: 👥
    title: User Management
    details: Role-based access control with admin and viewer roles. Generate secure invitation links for easy onboarding.
    link: /features/user-management
  
  - icon: 🔐
    title: Secure Authentication
    details: Better-Auth powered authentication with scrypt password hashing and JWT sessions.
    link: /features/stream-security
  
  - icon: ⚙️
    title: Easy Configuration
    details: Simple environment variable configuration with Docker Compose support for quick deployment.
    link: /config/

---

## Why HD Homey?

HD Homey makes it easy to access your HDHomeRun live TV streams remotely. Whether you're watching on your laptop, tablet, or phone, HD Homey provides:

- **Secure Remote Access**: Stream your local HDHomeRun devices over the internet with authentication
- **Modern Web Interface**: Clean, responsive UI for browsing channels and managing settings
- **Flexible Playback**: Watch in your browser or use external players like VLC
- **Efficient Transcoding**: Optional real-time transcoding for compatibility and bandwidth savings
- **Multi-User Support**: Share access with family and friends using invitation links

## Quick Start

Get HD Homey running in 5 minutes with Docker Compose:

```bash
# Download configuration files
curl -O https://raw.githubusercontent.com/shaunburdick/hd-homey/main/compose.yml
curl -O https://raw.githubusercontent.com/shaunburdick/hd-homey/main/.env-example

# Configure environment
cp .env-example .env
# Edit .env and set AUTH_SECRET (use: openssl rand -base64 32)

# Start the application
docker compose up -d
```

Visit `http://localhost:3000` and create your admin account!

[Read the full Quick Start guide →](/getting-started/quick-start)

## Project Status

**Current Version**: v1.0.0-beta.4

HD Homey is in active development and ready for production use. All core features are complete with comprehensive test coverage and security hardening.

- ✅ Tuner management with auto-discovery
- ✅ Channel streaming with HLS support
- ✅ User authentication and authorization
- ✅ Video transcoding with FFmpeg
- ✅ Invitation-based user onboarding
- ✅ Mobile-responsive design
- ✅ Accessibility (WCAG 2.2 AA)

[View Changelog](https://github.com/shaunburdick/hd-homey/blob/main/CHANGELOG.md)

## Community & Support

- **Documentation**: You're reading it! Explore the navigation above.
- **GitHub Issues**: [Report bugs or request features](https://github.com/shaunburdick/hd-homey/issues)
- **Contributing**: [Learn how to contribute](/contributing/)

## License

HD Homey is open source software released under the [GNU Affero General Public License v3.0 only (AGPL-3.0-only)](https://github.com/shaunburdick/hd-homey/blob/main/LICENSE).

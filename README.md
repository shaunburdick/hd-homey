<img src="public/hd-homey.webp" alt="HD Homey" width="50%" height="auto" />

# HD Homey

[![Docker](https://github.com/shaunburdick/hd-homey/actions/workflows/docker.yml/badge.svg)](https://github.com/shaunburdick/hd-homey/actions/workflows/docker.yml)
[![Tests](https://github.com/shaunburdick/hd-homey/actions/workflows/test.yml/badge.svg)](https://github.com/shaunburdick/hd-homey/actions/workflows/test.yml)
[![Docs](https://img.shields.io/badge/docs-live-brightgreen)](https://shaunburdick.github.io/hd-homey/)
![Version](https://img.shields.io/badge/version-1.0.0--beta.4-blue)

**A secure web proxy for [HDHomeRun](https://www.silicondust.com/hdhomerun/) devices that enables remote access to your live TV streams over the internet.**

Stream live TV from your HDHomeRun devices anywhere with secure authentication, role-based access control, and real-time video transcoding.

📚 **[Read the full documentation →](https://shaunburdick.github.io/hd-homey/)**

## Quick Start

```bash
# Download configuration files
curl -O https://raw.githubusercontent.com/shaunburdick/hd-homey/main/compose.yml
curl -O https://raw.githubusercontent.com/shaunburdick/hd-homey/main/.env-example

# Configure environment
cp .env-example .env
# Edit .env and set AUTH_SECRET (generate with: openssl rand -base64 32)

# Start the application
docker compose up -d
```

Access HD Homey at **http://localhost:3000** and create your first admin account.

**[📖 Full Installation Guide](https://shaunburdick.github.io/hd-homey/getting-started/installation)**

## Features

- 📺 **Tuner Management** - Add and configure multiple HDHomeRun devices with automatic channel scanning
- 🎬 **Live Streaming** - Watch in your browser or external players with secure token-based authentication
- 🔄 **Video Transcoding** - Real-time MPEG-2 to H.264/HLS conversion with shared session management
- 👥 **User Management** - Role-based access control with admin and viewer roles
- 🔐 **Secure Authentication** - Better-Auth powered with scrypt password hashing and JWT sessions
- ⚙️ **Easy Configuration** - Simple environment variables with Docker Compose support

**[📖 View All Features](https://shaunburdick.github.io/hd-homey/features/)**

## Documentation

The complete documentation is available at **[shaunburdick.github.io/hd-homey](https://shaunburdick.github.io/hd-homey/)** with guides for:

- **[Installation](https://shaunburdick.github.io/hd-homey/getting-started/installation)** - Docker Compose, Docker Run, and source installation
- **[Quick Start](https://shaunburdick.github.io/hd-homey/getting-started/quick-start)** - Get up and running in 5 minutes
- **[Configuration](https://shaunburdick.github.io/hd-homey/config/)** - Environment variables and settings
- **[Features](https://shaunburdick.github.io/hd-homey/features/)** - Detailed feature documentation
- **[Troubleshooting](https://shaunburdick.github.io/hd-homey/troubleshooting/)** - Common issues and solutions
- **[API Reference](https://shaunburdick.github.io/hd-homey/api/)** - HDHomeRun lineup API compatibility

## Support

- **📖 Documentation**: [shaunburdick.github.io/hd-homey](https://shaunburdick.github.io/hd-homey/)
- **🐛 Issues**: [GitHub Issues](https://github.com/shaunburdick/hd-homey/issues)
- **💬 Discussions**: [GitHub Discussions](https://github.com/shaunburdick/hd-homey/discussions)

## Contributing

Contributions are welcome! See the **[Contributing Guide](https://shaunburdick.github.io/hd-homey/contributing/)** for details.

**Tech Stack**: Next.js 16, React 19, TypeScript 5, SQLite, Better-Auth, FFmpeg

**For Developers**:
- Review [AGENTS.md](AGENTS.md) for development guidelines
- Check [CHANGELOG.md](CHANGELOG.md) for recent changes
- Follow the spec-driven development process (see `.specs/`)
- Ensure tests pass: `npm test`

## License

AGPL-3.0-only - See [LICENSE](LICENSE) file for details

## Acknowledgments

- Built for [HDHomeRun](https://www.silicondust.com/hdhomerun/) devices by SiliconDust
- Powered by [Next.js](https://nextjs.org/) and [Better-Auth](https://www.better-auth.com/)

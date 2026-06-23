# Security Policy

## Overview

HD Homey is a Next.js-based proxy application for HDHomeRun devices that enables secure remote access to live TV streams. As a network service that handles authentication and streams potentially sensitive content, security is a top priority.

We take security vulnerabilities seriously and appreciate the security community's efforts to responsibly disclose issues.

## Supported Versions

The following versions of HD Homey receive security updates:

| Version | Supported          | Status |
| ------- | ------------------ | ------ |
| 1.0.x (beta) | :white_check_mark: | Current beta release |
| < 1.0.0-beta.1 | :x: | Alpha versions - upgrade required |

**Support Policy**:
- **Beta releases**: Security patches provided for the latest beta version
- **Stable releases** (when available): Security patches for current major version + previous major version for 90 days after new major release
- **Alpha releases**: No security support - upgrade to beta immediately

## Reporting a Vulnerability

**Please do NOT report security vulnerabilities through public GitHub issues.**

### Private Reporting (Recommended)

Use GitHub's private vulnerability reporting feature:

1. Navigate to the [Security tab](https://github.com/shaunburdick/hd-homey/security)
2. Click **"Report a vulnerability"**
3. Fill out the vulnerability details form
4. Submit your report

This is the preferred method as it keeps details private until a fix is available.

### Email Reporting

If you prefer email or cannot use GitHub's reporting feature:

- **Email**: Send to [@shaunburdick](https://github.com/shaunburdick) via GitHub email (visible on profile)
- **Subject Line**: `[SECURITY] HD Homey - [Brief Description]`
- **PGP**: Not currently available (use GitHub private reporting for encryption)

### What to Include

Please provide as much information as possible:

- **Type of vulnerability** (e.g., authentication bypass, injection, XSS, etc.)
- **Affected version(s)** (check `package.json` or Docker tag)
- **Component/file affected** (e.g., authentication, stream proxy, database)
- **Step-by-step reproduction** (be as detailed as possible)
- **Proof of concept** (code, screenshots, or video)
- **Impact assessment** (what an attacker could do)
- **Suggested fix** (if you have one)
- **Your contact information** (for follow-up questions)

### What to Expect

| Timeline | Action |
|----------|--------|
| **Within 48 hours** | Initial response acknowledging receipt |
| **Within 7 days** | Preliminary assessment and severity classification |
| **Within 30 days** | Fix developed and tested (for critical/high severity) |
| **Within 90 days** | Fix developed and tested (for medium/low severity) |

**After the fix is ready**:
1. Security advisory published on GitHub
2. Patched version released
3. Public disclosure (coordinated with reporter)
4. Credit given to reporter (unless anonymity requested)

## Scope

### In Scope

The following are within scope for security reports:

#### Authentication & Authorization
- Authentication bypass vulnerabilities
- Session hijacking or fixation
- JWT token manipulation
- Password storage issues
- Role-based access control bypasses
- Admin privilege escalation

#### Stream Security
- Stream token forgery or manipulation
- HMAC signature bypass
- Token expiration bypasses
- Unauthorized access to video streams
- Stream secret leakage

#### Data Security
- SQL injection vulnerabilities
- Database access control issues
- Sensitive data exposure in logs or errors
- Information disclosure vulnerabilities
- Insecure data storage

#### Input Validation
- Cross-site scripting (XSS)
- Server-side request forgery (SSRF)
- Path traversal vulnerabilities
- Command injection
- XML/JSON injection

#### Infrastructure
- Docker container security issues
- Environment variable leakage
- Insecure default configurations
- Dependency vulnerabilities (with active exploitation)

#### Proxy & Network
- HDHomeRun proxy bypass
- Network request manipulation
- CORS misconfiguration
- TLS/SSL issues (if applicable)

### Out of Scope

The following are **not** considered security vulnerabilities:

#### Known Limitations
- Lack of HTTPS in default configuration (users must configure reverse proxy)
- Missing rate limiting on authentication (DDoS concerns)
- Session timeout configuration (configurable by users)
- Lack of multi-factor authentication (future feature)

#### Acceptable Risks
- Issues requiring physical access to the server
- Social engineering attacks
- Denial of service (DoS) without amplification
- Vulnerabilities in third-party dependencies without HD Homey-specific exploitation path

#### Out of Scope Systems
- HDHomeRun device security (contact SiliconDust)
- User's network infrastructure
- Browser security vulnerabilities
- Operating system vulnerabilities

## Security Best Practices for Users

If you're deploying HD Homey, follow these security recommendations:

### Essential Security Measures

1. **Use Strong Authentication**
   ```bash
   # Generate a strong AUTH_SECRET
   openssl rand -base64 32
   ```
   - Use a cryptographically random `AUTH_SECRET`
   - Enforce strong passwords for user accounts
   - Limit admin accounts to trusted individuals only

2. **Enable HTTPS**
   - Use a reverse proxy (Nginx, Caddy, Traefik)
   - Obtain SSL certificates (Let's Encrypt recommended)
   - Never expose HD Homey directly to the internet over HTTP

3. **Secure Stream Tokens**
   - Use appropriate token expiration (default: 12 hours)
   - Regenerate stream secret regularly (every 90 days)
   - Regenerate immediately if tokens are leaked
   - Never share stream URLs publicly

4. **Network Security**
   - Use firewall rules to restrict access
   - Consider VPN for remote access
   - Limit access to trusted IP ranges if possible
   - Monitor access logs for suspicious activity

5. **Keep Updated**
   - Subscribe to GitHub releases for security updates
   - Update to latest version within 30 days of release
   - Review CHANGELOG.md for security fixes

### Docker-Specific Security

```yaml
# compose.yml - security recommendations
services:
  hd-homey:
    # Use specific version tags, not 'latest'
    image: ghcr.io/shaunburdick/hd-homey:1.0.0-beta.6
    
    # Run as non-root user
    user: "1000:1000"
    
    # Read-only root filesystem where possible
    read_only: true
    
    # Limit resources
    mem_limit: 2g
    cpus: 2
    
    # Drop unnecessary capabilities
    cap_drop:
      - ALL
    cap_add:
      - CHOWN
      - SETGID
      - SETUID
```

### Database Security

- Store `hd_homey.db` on persistent, backed-up storage
- Restrict file permissions: `chmod 600 hd_homey.db`
- Regular backups (before upgrades)
- Never expose SQLite database file directly

### Environment Variables

```bash
# Secure .env file permissions
chmod 600 .env

# Never commit .env to version control
# (already in .gitignore)

# Use strong, unique secrets
AUTH_SECRET=<minimum-32-characters-random>
```

## Disclosure Policy

HD Homey follows **coordinated disclosure**:

1. **Private Disclosure**: Security issues are reported privately
2. **Fix Development**: Patch is developed and tested in private
3. **User Notification**: Security advisory published, users notified
4. **Public Disclosure**: Full details published after users have time to update (typically 7-14 days)

### Security Advisories

Security advisories are published on:
- [GitHub Security Advisories](https://github.com/shaunburdick/hd-homey/security/advisories)
- [CHANGELOG.md](CHANGELOG.md) with `[SECURITY]` prefix
- GitHub Releases with security notice

### Researcher Recognition

We believe in giving credit where it's due:
- Security researchers are credited in advisories (unless anonymity requested)
- Acknowledgment in CHANGELOG.md
- Link to researcher's profile/website (if provided)

## Security Features

HD Homey includes several built-in security features:

### Authentication
- **Better-Auth** powered authentication with JWT sessions
- **Scrypt password hashing** (not bcrypt - Better-Auth native)
- **Role-based access control** (admin/viewer roles)
- **Session management** with secure token storage

### Stream Protection
- **HMAC-SHA256 token signing** for all stream URLs
- **Time-limited tokens** with configurable expiration
- **Stream secret rotation** capability
- **Stateless validation** (no session storage needed)

### Infrastructure
- **Edge Runtime** route protection via proxy layer
- **Server-side authorization** checks for all sensitive operations
- **CodeQL security scanning** (weekly automated scans)
- **Dependency vulnerability scanning** (GitHub Dependabot)

### Code Quality
- **TypeScript strict mode** (compile-time type safety)
- **ESLint security rules** (static analysis)
- **Automated testing** (295 tests covering security-critical paths)
- **Dependency review** on pull requests

## Security Tooling

Automated security measures in place:

- **CodeQL Analysis**: Weekly scans for security vulnerabilities ([.github/workflows/codeql.yml](.github/workflows/codeql.yml))
- **Dependency Review**: PR checks for vulnerable dependencies ([.github/workflows/dependency-review.yml](.github/workflows/dependency-review.yml))
- **Dependabot**: Automatic security updates for npm packages
- **Container Scanning**: Docker image vulnerability scanning

## Known Security Considerations

### By Design
- **No built-in HTTPS**: Users must configure reverse proxy (Nginx, Caddy, etc.)
- **No rate limiting**: Authentication endpoints are not rate-limited by default
- **Single-factor auth**: Multi-factor authentication not yet implemented (planned)
- **Local-first**: Designed for home networks, additional hardening needed for public internet

### Mitigations
- Documentation emphasizes reverse proxy requirement
- JWT sessions have built-in expiration
- Session tokens are httpOnly (when cookies are used)
- Admin operations require explicit role checks

## Legal

### Vulnerability Disclosure Terms

By reporting a security vulnerability, you agree to:
- Not publicly disclose the vulnerability before a fix is available
- Not exploit the vulnerability for malicious purposes
- Provide reasonable time for a fix to be developed
- Work with maintainers in good faith

### Safe Harbor

HD Homey operates under the following safe harbor policy:

We will not pursue legal action against security researchers who:
- Report vulnerabilities in good faith
- Make a good faith effort to avoid privacy violations and data destruction
- Do not exploit vulnerabilities beyond what is necessary to demonstrate the issue
- Follow this disclosure policy

This safe harbor applies only to security research conducted against your own HD Homey installation or with explicit permission from the installation owner.

## Questions?

Security-related questions (not vulnerability reports) can be asked:
- [GitHub Discussions](https://github.com/shaunburdick/hd-homey/discussions) (general security questions)
- [GitHub Issues](https://github.com/shaunburdick/hd-homey/issues) (public security enhancements)

For vulnerability reports, use the private reporting methods described above.

## License

This security policy is licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

---

**Last Updated**: 2026-06-20  
**Version**: 1.0.0-beta.6

Thank you for helping keep HD Homey and its users secure! 🔒

# Contributing to HD Homey

Thank you for your interest in contributing to HD Homey! This guide will help you get started with development and understand our processes.

## Ways to Contribute

### Code Contributions
- Bug fixes
- New features
- Performance improvements
- Test coverage improvements
- Documentation updates

### Non-Code Contributions
- Bug reports with detailed reproduction steps
- Feature requests and ideas
- Documentation improvements
- User support in GitHub Issues
- Translations (future)

## Getting Started

### Prerequisites
- Node.js 20+ (LTS recommended)
- Docker and Docker Compose (optional, for testing)
- Git
- A code editor (VS Code recommended)
- HDHomeRun device (for testing streaming features)

### Development Setup
Set up your local development environment.

[View Development Setup Guide →](/contributing/)

Quick start:
```bash
git clone https://github.com/shaunburdick/hd-homey.git
cd hd-homey
npm ci
cp .env-example .env
# Edit .env with your configuration
npm run dev
```

## Development Process

HD Homey follows a **spec-driven development** process:

[Learn About Spec-Driven Development →](/contributing/)

### The Workflow

1. **Specification**: All features start with a spec in `.specs/features/`
2. **Planning**: Technical design and implementation plan
3. **Tasking**: Break work into concrete tasks
4. **Implementation**: Write code following the plan
5. **Testing**: Unit tests and manual validation
6. **Review**: Code review and quality checks
7. **Documentation**: Update docs as needed

### Before You Start Coding

1. **Check existing issues**: See if your idea is already being worked on
2. **Create/find a spec**: Features need specs before implementation
3. **Discuss approach**: Comment on the issue or create one
4. **Get alignment**: Make sure maintainers agree with the approach

This saves everyone time and prevents duplicate work!

## Code Standards

### TypeScript
- Strict mode enabled (no `any` types)
- Proper typing for all functions and variables
- Use TypeScript features (interfaces, types, enums)

### Code Style
- ESLint must pass (run `npm run lint`)
- Prettier formatting (automatic on save if configured)
- Meaningful variable and function names
- Comments for complex logic

### Testing
- Unit tests required for all business logic
- Target 80%+ code coverage for new code
- Tests should be clear and maintainable
- Use React Testing Library for components

[View Testing Guide →](/contributing/)

### Commits
- Clear, descriptive commit messages
- Follow conventional commits format:
  - `feat: add channel favorites`
  - `fix: resolve stream token expiration bug`
  - `docs: update installation guide`
  - `test: add coverage for tuner validation`

## Project Architecture

Understanding the codebase structure helps with navigation and contributions.

[View Architecture Guide →](/contributing/)

### Key Directories
```
src/
├── app/              # Next.js app router (pages, layouts)
├── components/       # React components
├── lib/              # Business logic and utilities
│   ├── auth/         # Authentication (Better-Auth)
│   ├── database/     # Database schema and queries
│   ├── hdhr/         # HDHomeRun API client
│   └── transcoding/  # FFmpeg transcoding logic
└── scripts/          # Build and utility scripts
```

### Technology Stack
- **Framework**: Next.js 16 (App Router)
- **Database**: SQLite + Drizzle ORM
- **Auth**: Better-Auth 1.1
- **Testing**: Vitest + React Testing Library
- **Styling**: new.css (classless CSS)

## Testing Your Changes

### Run Tests
```bash
# All tests
npm test

# With coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### Lint Code
```bash
npm run lint
```

### Test Build
```bash
npm run build
```

### Manual Testing
```bash
# Development server
npm run dev

# Visit http://localhost:3000
# Test your changes manually
```

### Docker Testing
```bash
# Build image
docker build -t hd-homey:test .

# Run container
docker compose up
```

## Submitting Changes

### Pull Request Process

1. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**:
   - Follow code standards
   - Add tests
   - Update documentation

3. **Test thoroughly**:
   - Run test suite
   - Run linter
   - Test manually

4. **Commit your changes**:
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

5. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Open a pull request**:
   - Clear title and description
   - Reference related issues
   - Explain what and why (not just what)
   - Add screenshots for UI changes

### Pull Request Checklist
- [ ] Tests pass (`npm test`)
- [ ] Linter passes (`npm run lint`)
- [ ] Build succeeds (`npm run build`)
- [ ] Code is documented (JSDoc comments)
- [ ] Changes are tested manually
- [ ] Documentation updated (if needed)
- [ ] Spec updated (if feature work)
- [ ] CHANGELOG.md updated

## Code Review

### What to Expect
- Maintainers will review your PR
- Feedback may be requested
- CI checks must pass
- At least one approval required

### Review Focus Areas
- Code quality and style
- Test coverage
- Performance implications
- Security considerations
- Documentation completeness

## Project Governance

### Maintainers
- [@shaunburdick](https://github.com/shaunburdick) - Project creator and lead maintainer

### Decision Making
- Spec-driven development for all features
- Discussion in GitHub Issues
- Consensus-based decisions
- Maintainer has final say for project direction

## Resources

### Documentation
- [Getting Started](/getting-started/)
- [Features](/features/)
- [API Reference](/api/)
- [Troubleshooting](/troubleshooting/)

### Development Guides
- [Development Setup](/contributing/)
- [Spec Process](/contributing/)
- [Architecture](/contributing/)
- [Testing](/contributing/)

### External Resources
- [Next.js Docs](https://nextjs.org/docs)
- [Drizzle ORM Docs](https://orm.drizzle.team/)
- [Better-Auth Docs](https://www.better-auth.com/)
- [Vitest Docs](https://vitest.dev/)

## Questions?

- **Bug reports**: [GitHub Issues](https://github.com/shaunburdick/hd-homey/issues)
- **Feature requests**: [GitHub Issues](https://github.com/shaunburdick/hd-homey/issues)
- **Questions**: [GitHub Discussions](https://github.com/shaunburdick/hd-homey/discussions) (coming soon)

## Code of Conduct

Be respectful, inclusive, and professional:
- Welcome newcomers and help them learn
- Accept constructive criticism gracefully
- Focus on what's best for the project
- Show empathy towards other contributors

Thank you for contributing to HD Homey! 🎉

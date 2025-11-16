# Getting Started with Spec-Driven Development for HD Homey

This guide will help you start using the spec-driven development structure we've set up for HD Homey.

## What We've Created

Your project now has a lightweight, spec-kit-compatible specification structure:

```
.specs/
├── CONSTITUTION.md              # Your project's guiding principles
├── README.md                    # Documentation about this spec system
├── templates/                   # Templates for new features
│   ├── feature-spec-template.md
│   └── implementation-plan-template.md
├── features/                    # Existing feature documentation
│   ├── 001-tuner-management/
│   ├── 002-channel-streaming/
│   └── 003-user-authentication/
└── docs/
    └── GETTING_STARTED.md      # This file
```

## What's Documented

We've created comprehensive specs for your three main features:

### 1. Tuner Management (001)
- Add/edit/view HD HomeRun tuners
- Refresh channel lineups
- Manage tuner configurations
- **246 lines** of detailed specification

### 2. Channel Streaming (002)
- Proxy video streams from tuners
- View channel details
- Browse all channels
- Stream to browsers and video players
- **261 lines** of detailed specification

### 3. User Authentication (003)
- Sign in with credentials
- Role-based authorization (Admin/Viewer)
- User management
- Initial setup wizard
- **324 lines** of detailed specification

## How to Use This System

### For Daily Development

#### 1. Before Starting a New Feature

```bash
# Read the constitution
cat .specs/CONSTITUTION.md

# Copy the template
cp .specs/templates/feature-spec-template.md .specs/features/004-my-feature/spec.md

# Edit the spec
nano .specs/features/004-my-feature/spec.md
```

#### 2. Using with AI Coding Assistants

**GitHub Copilot Chat:**
```
@workspace Read .specs/CONSTITUTION.md and help me understand 
the architecture patterns used in HD Homey
```

**When building a new feature:**
```
I need to add a new feature. First, read:
- .specs/CONSTITUTION.md (for project principles)
- .specs/templates/feature-spec-template.md (for structure)
- .specs/features/001-tuner-management/spec.md (as an example)

Then help me create a spec for [your feature description]
```

**When implementing:**
```
I'm implementing the feature defined in 
.specs/features/004-my-feature/spec.md

Help me create [component/function/API] following the 
patterns in the Constitution.
```

#### 3. Referencing Existing Specs

When working on existing features:
```
"I need to modify the tuner management feature. 
Show me .specs/features/001-tuner-management/spec.md 
and explain the architecture."
```

### For Understanding the Codebase

New to HD Homey? Start here:

1. **Read the Constitution** (`.specs/CONSTITUTION.md`)
   - Understand project goals
   - Learn the tech stack
   - See why decisions were made

2. **Browse Feature Specs** (`.specs/features/`)
   - See what each feature does
   - Understand user flows
   - Learn implementation details

3. **Check Implementation Notes** (in each spec)
   - See which files implement each feature
   - Understand how code is organized
   - Find examples to follow

## Using with Spec-Driven Tools

### Compatible with GitHub Spec Kit

If you later decide to use GitHub Spec Kit:

```bash
# Install Spec Kit
uv tool install specify-cli --from git+https://github.com/github/spec-kit.git

# Your existing specs are already compatible!
# Just add plan.md and tasks.md to feature directories as needed
```

### Compatible with Other AI Tools

- **Cursor**: Add `.specs/` to workspace context
- **Claude Code**: Reference specs in chat
- **Windsurf**: Include specs in project knowledge
- **Any AI Assistant**: Specs are markdown - works everywhere!

## Example Workflow: Adding a Feature

Let's walk through adding "Channel Favorites":

### Step 1: Write the Spec

```bash
mkdir -p .specs/features/004-channel-favorites
cp .specs/templates/feature-spec-template.md \
   .specs/features/004-channel-favorites/spec.md
```

Edit `spec.md`:
```markdown
# Feature Specification: Channel Favorites

**Feature ID**: `004-channel-favorites`
**Status**: Draft

## Overview
Users can mark channels as favorites for quick access...

## User Stories

### Story 1: Mark Channel as Favorite (Priority: P1)
**As a** user
**I want** to mark channels as favorites
**So that** I can quickly access my most-watched channels
...
```

### Step 2: Review Against Constitution

Check your spec against `.specs/CONSTITUTION.md`:
- ✅ Using Drizzle ORM for database?
- ✅ Following soft-delete pattern?
- ✅ Using TypeBox validation?
- ✅ Using server components/actions?

### Step 3: Get Approval

Share with team/stakeholders:
- Is this solving the right problem?
- Are priorities correct?
- Any missing requirements?

### Step 4: Create Implementation Plan

```bash
cp .specs/templates/implementation-plan-template.md \
   .specs/features/004-channel-favorites/plan.md
```

Fill in technical details:
- Database schema changes
- API endpoints needed
- Components to create
- Migration strategy

### Step 5: Use AI to Help Implement

```
I'm implementing channel favorites. Here's the context:

Constitution: .specs/CONSTITUTION.md
Spec: .specs/features/004-channel-favorites/spec.md
Plan: .specs/features/004-channel-favorites/plan.md

Following the patterns in the constitution, help me:
1. Create the database migration
2. Add the favorites table to the schema
3. Create TypeBox validation schemas
...
```

### Step 6: Update Specs as You Go

If you discover the design needs to change:
- Update the spec to reflect reality
- Document why you changed it
- Keep specs as living documentation

## Tips and Best Practices

### ✅ Do's

- **Do** read the Constitution before starting
- **Do** write specs before code
- **Do** update specs when implementation changes
- **Do** reference specs in code comments
- **Do** use specs to onboard new team members
- **Do** share specs with AI assistants for context

### ❌ Don'ts

- **Don't** skip the spec for "quick features" (they grow)
- **Don't** let specs become outdated
- **Don't** write specs in isolation (get feedback)
- **Don't** over-specify (focus on what matters)
- **Don't** treat specs as unchangeable (they should evolve)

## Common Questions

### Q: Do I need specs for bug fixes?
**A:** No. Small bug fixes don't need full specs. Use git commit messages.

### Q: What if I disagree with the Constitution?
**A:** Document your reasoning in the feature spec. Discuss with team. Either update Constitution or find compliant approach.

### Q: Can I use this without AI tools?
**A:** Absolutely! These are just markdown files. They work with or without AI.

### Q: How detailed should specs be?
**A:** Detailed enough to answer:
- What are we building?
- Why are we building it?
- How will we know it's done?
- What's explicitly NOT included?

### Q: When should I create an implementation plan?
**A:** After the spec is approved and before you start coding. Plans are more technical than specs.

### Q: Do I need both spec.md and plan.md?
**A:** 
- **spec.md**: Always required (what and why)
- **plan.md**: Optional but recommended for complex features (how)
- **tasks.md**: Optional, useful for breaking down large features

## Next Steps

1. **Familiarize yourself** with the existing specs
2. **Read the Constitution** to understand project principles
3. **Try the templates** for your next feature
4. **Experiment with AI assistants** using these specs as context
5. **Update this guide** with what you learn!

## Resources

- **Constitution**: `.specs/CONSTITUTION.md`
- **Templates**: `.specs/templates/`
- **Examples**: `.specs/features/001-tuner-management/spec.md`
- **GitHub Spec Kit**: https://github.com/github/spec-kit
- **Spec-Driven Philosophy**: https://github.blog/ai-and-ml/generative-ai/spec-driven-development-with-ai-get-started-with-a-new-open-source-toolkit/

---

**Ready to build something great with spec-driven development! 🚀**

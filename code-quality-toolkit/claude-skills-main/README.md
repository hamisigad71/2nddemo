# Claude Code Skills

Reusable [Claude Code](https://docs.anthropic.com/en/docs/claude-code) skills for code review, security auditing, and web application testing.

## Skills

| Skill | Description |
|-------|-------------|
| **[full-review](full-review/)** | Comprehensive code review combining security audit, code quality, performance, architecture, and bug detection. Supports quick triage, standard review, deep audit, and differential (PR/commit) modes. |
| **[owasp-security](owasp-security/)** | OWASP Top 10:2025, ASVS 5.0, Agentic AI security (2026), and language-specific security patterns for 20 languages. |
| **[webapp-testing](webapp-testing/)** | Playwright-based toolkit for interacting with and testing local web applications. |

## Setup

Symlink this repo to `~/.claude/skills/` so Claude Code picks up the skills globally:

```bash
# Clone
git clone git@github.com:jojojobring/claude-skills.git ~/claude-skills

# Symlink (back up existing skills dir first if needed)
ln -sf ~/claude-skills ~/.claude/skills
```

Skills will be available in all projects via `/full-review`, `/owasp-security`, etc.

## Usage

```
# Run a full code review on current changes
/full-review

# Security-focused review
Ask: "security review this code"

# Review a specific file
Ask: "review backend/app/api/routes/auth.py"
```

The `full-review` skill auto-detects the appropriate review depth based on scope:
- **< 100 lines** changed: Quick Triage
- **100-500 lines**: Standard Review
- **500+ lines** or security-critical: Deep Audit
- **PR/diff context**: Differential Review with git history analysis

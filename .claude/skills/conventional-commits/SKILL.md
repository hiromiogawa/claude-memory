---
name: conventional-commits
description: Conventional Commits + branch naming rules for consistent git workflow
---

# Conventional Commits & Branch Rules

## Commit Format

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Types

| Type | When to use |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Formatting, no logic change |
| `refactor` | Code change that neither fixes nor adds |
| `test` | Adding or correcting tests |
| `chore` | Build process, tooling, dependencies |
| `perf` | Performance improvement |
| `ci` | CI configuration |

### Scope

Use the package or module name. Check `.project-config.yml` for available scopes.

### Breaking Changes

Add `!` after type/scope: `feat(core)!: change Memory interface`
Or add `BREAKING CHANGE:` in the footer.

### Examples

```
feat(core): add SearchMemoryUseCase
fix(storage-postgres): handle connection timeout
docs(adr): add ADR-001 for embedding model selection
chore(hooks): update dependencies
feat(core)!: change Memory interface
```

## Branch Naming

```
[prefix]/#[issue-number]-[short-description]
```

### Prefixes

| Prefix | When to use |
|--------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `chore` | Maintenance, tooling |
| `docs` | Documentation |
| `refactor` | Code refactoring |

### Examples

```
feat/#12-add-memory-search
fix/#15-vector-index-error
chore/#20-update-deps
```

## Tooling

- **commitlint** with `@commitlint/config-conventional` — validates commit messages
- **lefthook** — runs commitlint on `commit-msg` hook

## Checklist

Before committing:
- [ ] Message follows `type(scope): description` format
- [ ] Scope matches a valid package/module
- [ ] Description is imperative mood, lowercase, no period
- [ ] Breaking changes are marked with `!` or `BREAKING CHANGE:` footer
- [ ] Branch name follows `[prefix]/#[issue]-[description]` format

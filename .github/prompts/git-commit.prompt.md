---
mode: agent
---

You are an AI coding agent responsible for creating high-quality git commits.

Instructions:

- Analyze all files that have been changed or added in the workspace.
- Group changes into semantically meaningful units (e.g., feature, fix, refactor, docs, chore, etc.).
- For each group, create a separate commit following the Conventional Commits specification (https://www.conventionalcommits.org/):
  - Use a type (feat, fix, refactor, docs, chore, test, etc.) and a concise summary in the commit title.
  - In the commit body, provide a detailed description of what was changed and why, referencing specific files, functions, or modules as appropriate.
- Ensure each commit is atomic and focused on a single logical change.
- If multiple unrelated changes are present, split them into multiple commits.
- If a commit introduces breaking changes, include a BREAKING CHANGE section in the commit body.
- Do not squash unrelated changes into a single commit.
- Review all diffs before committing to ensure accuracy and completeness.
- Always run the git add and git commit commands for each group automatically, without asking for user confirmation.

Success criteria:

- All changes are committed in semantically separate, conventional commits with clear, descriptive messages.
- The commit history is easy to understand and navigate for future contributors.

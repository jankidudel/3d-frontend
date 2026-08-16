# GitHub Copilot Instructions

Follow the repository architecture and development guidelines documented in
`AGENTS.md`.

- Use explicit `{}` blocks for every `if`, `else`, loop, and other control-flow
  body, including single-statement bodies. Do not write braceless control flow.
- Follow the Angular, TypeScript, accessibility, and testing guidance in
  `AGENTS.md`.
- Do not modify unrelated code.

Before completing implementation work, ensure:

    npm run verify

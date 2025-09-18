# Warp Terminal Tips

Warp (warp.dev) can boost productivity when working in this repository. This note captures the conventions we follow when pairing Warp with ContextForge.

## Recommended Setup
- Enable Warp's command history sync so you can re-run common pnpm scripts (`pnpm dev`, `pnpm server:dev`, etc.).
- Create directory bookmarks for the project root and `cli/` workspace for quick jumps.
- Install the Warp Git integration to visualize branch status before committing.

## Useful Aliases
Add these to your Warp profile or shell configuration if you switch contexts frequently:
```bash
alias cfapp="cd $HOME/Developer/01_Personal/contextforge"
alias cfcli="cd $HOME/Developer/01_Personal/contextforge/cli"
alias cfpnpm="cd $HOME/Developer/01_Personal/contextforge && pnpm"
```
Adjust the paths to match your environment. These aliases speed up running scripts described in the [Local Development Guide](../guides/development.md).

## Command Suggestions
Warp surfaces command suggestions based on your history. Pin the following to the launcher for quick access:
- `pnpm dev`
- `pnpm server:dev`
- `pnpm exec jest`
- `pnpm exec playwright test`
- `pnpm prisma studio`

## Troubleshooting
- If pnpm binaries are not detected, ensure `corepack` is enabled and Warp is sourcing your shell profile (`~/.zshrc` or equivalent).
- When encountering permission prompts, run Warp with Rosetta disabled on Apple Silicon to avoid path issues.
- Clear the GPU cache (`warp diagnostics --clear-cache`) if the terminal display becomes unresponsive.

Keep this document updated if you discover new Warp workflows that benefit the team.

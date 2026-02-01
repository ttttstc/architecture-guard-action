# Architecture Guard Action 🛡️

AI-powered architecture compliance check for your GitHub Pull Requests. Keep your codebase clean and structured with the power of Google Gemini.

## 🚀 Overview

**Architecture Guard** acts as an automated Senior Architect in your CI/CD pipeline. It reviews every code change (Diff) in a Pull Request against your specific architecture rules and provides actionable feedback directly in the PR comments.

## ✨ Features

- **Semantic Review**: Beyond simple linting, it understands the *intent* and *logic* of your code changes.
- **Custom Rules**: Define your own architecture "bill of rights" (e.g., "Controllers must not call Repository layer directly").
- **Actionable Feedback**: Precise suggestions on which lines to refactor and why.
- **Powered by Gemini Pro**: High-reasoning AI ensures deep architectural understanding.

## 🛠️ Usage

Add this action to your `.github/workflows/architecture_check.yml`:

```yaml
name: Architecture Check
on:
  pull_request:
    types: [opened, synchronize]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Run Architecture Guard
        uses: ttttstc/architecture-guard-action@main
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          ai-api-key: ${{ secrets.GEMINI_API_KEY }}
          architecture-rules: |
            1. Strictly follow the Layered Architecture.
            2. Business logic should stay in the Service layer.
            3. No raw SQL queries allowed in Controllers.
```

## ⚙️ Inputs

| Input | Description | Required |
| :--- | :--- | :--- |
| `github-token` | The GitHub Token for commenting on PRs. | Yes |
| `ai-api-key` | Your Google Gemini API Key. | Yes |
| `architecture-rules` | The rules AI should enforce. | Yes |

## 📄 License

MIT

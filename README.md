# Architecture Guard Action 🛡️

AI-powered & Rule-based architecture compliance check for your GitHub Pull Requests. Keep your codebase clean and structured with precision.

## 🚀 Overview

**Architecture Guard** acts as an automated Senior Architect in your CI/CD pipeline. It scans every **newly added line** of code in a Pull Request against classic architectural principles and modern design patterns.

## ✨ Key Features

- **Precision Scanning**: Targets only the changed lines (Diff) to avoid noise from legacy code.
- **Detailed Reporting**: Generates a professional Markdown table in your PR comments with **File Name** and **Line Number**.
- **Hybrid Engine**:
  - **Built-in Rules**: Instant, offline detection of layering violations, hardcoded secrets, and design smells.
  - **AI Insight (Optional)**: Leverages Google Gemini for deep semantic architectural review.
- **Actionable Guidance**: Provides specific refactoring suggestions for every violation found.

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
    permissions:
      pull-requests: write # Required for posting the report
      contents: read       # Required for fetching code diff
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Run Architecture Guard
        uses: ttttstc/architecture-guard-action@main
        with:
          engine: 'builtin' # Choices: "builtin", "ai", "hybrid"
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

## ⚙️ Inputs

| Input | Description | Required | Default |
| :--- | :--- | :--- | :--- |
| `engine` | Scanning mode: `builtin`, `ai`, or `hybrid` | No | `builtin` |
| `github-token` | The GitHub Token for PR interaction. | Yes | N/A |
| `ai-api-key` | Google Gemini API Key (for `ai`/`hybrid` modes). | No | N/A |
| `architecture-rules` | Custom rules for AI analysis. | No | Solid principles |

## 📄 Built-in Rules Library

- **Layering Violation**: Detects direct database driver access from UI/Controller layers.
- **Security Check**: Identifies hardcoded secrets like passwords and API keys.
- **Design Patterns**: Spots incorrect Singleton implementations and other pattern misuses.
- **Maintainability**: Flags "Fat Interfaces" that violate the Interface Segregation Principle (ISP).

## 📄 License

MIT

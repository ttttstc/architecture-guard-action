const core = require('@actions/core');
const github = require('@actions/github');

/**
 * 🏛️ 精准化架构规则库
 */
const BUILTIN_RULES = [
  {
    id: "ARCH-001",
    name: "Layering Violation: Direct DB Access",
    pattern: /(import|require).*from.*(['"])(db|mysql|pg|prisma|mongoose|sql)/i,
    message: "层级越权：不得在 Controller/UI 层直接访问底层数据库驱动。",
    guidance: "应通过 Service 或 Repository 层进行抽象，保持业务逻辑纯净。"
  },
  {
    id: "ARCH-002",
    name: "Security: Hardcoded Secret",
    pattern: /(password|secret|api_key|token|access_key)\s*[:=]\s*['"][a-zA-Z0-9_-]+['"]/i,
    message: "安全风险：检测到疑似硬编码的敏感密钥。",
    guidance: "请将敏感信息移至 GitHub Secrets，并通过环境变量注入。"
  },
  {
    id: "ARCH-003",
    name: "Pattern: Dangerous Singleton",
    pattern: /this\.instance\s*=\s*new/i,
    message: "单例模式风险：检测到非原子性的单例实例化。",
    guidance: "推荐使用 ES6 Module 导出常量或确保初始化逻辑的幂等性。"
  },
  {
    id: "ARCH-004",
    name: "Maintainability: Fat Interface",
    pattern: /interface.*\{[\s\S]{500,}\}/i,
    message: "设计坏味道：接口定义过于臃肿。",
    guidance: "违背 ISP 原则，请根据业务职责拆分为细粒度接口。"
  }
];

/**
 * 解析 Diff 字符串，提取带行号的代码行
 */
function parseDiff(diffString) {
  const lines = [];
  let currentFile = "";
  let currentLine = 0;

  diffString.split("\n").forEach(line => {
    if (line.startsWith("+++ b/")) {
      currentFile = line.replace("+++ b/", "");
    } else if (line.startsWith("@@")) {
      const match = line.match(/\+([0-9]+)/);
      if (match) currentLine = parseInt(match[1]) - 1;
    } else if (line.startsWith("+") && !line.startsWith("+++")) {
      currentLine++;
      lines.push({
        file: currentFile,
        line: currentLine,
        content: line.substring(1)
      });
    } else if (!line.startsWith("-")) {
      currentLine++;
    }
  });
  return lines;
}

async function run() {
  try {
    const githubToken = core.getInput('github-token');
    const octokit = github.getOctokit(githubToken);
    const context = github.context;

    if (!context.payload.pull_request) {
      core.setFailed('Must run on pull_request');
      return;
    }

    // 1. 获取 Diff
    const { data: diff } = await octokit.rest.pulls.get({
      owner: context.repo.owner,
      repo: context.repo.repo,
      pull_number: context.payload.pull_request.number,
      mediaType: { format: 'diff' }
    });

    const addedLines = parseDiff(diff);
    const violations = [];

    // 2. 逐行扫描
    addedLines.forEach(item => {
      BUILTIN_RULES.forEach(rule => {
        if (rule.pattern.test(item.content)) {
          violations.push({
            ...rule,
            file: item.file,
            line: item.line,
            snippet: item.content.trim()
          });
        }
      });
    });

    // 3. 构造报告
    if (violations.length > 0) {
      let report = "### 🛡️ Architecture Guard Detailed Report\n\n";
      report += "| File | Line | Rule | Violation | Guidance |\n";
      report += "| :--- | :--- | :--- | :--- | :--- |\n";
      
      violations.forEach(v => {
        report += `| \`${v.file}\` | ${v.line} | **${v.name}** | ${v.message} | ${v.guidance} |\n`;
      });

      await octokit.rest.issues.createComment({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: context.payload.pull_request.number,
        body: report
      });

      core.setFailed(`Detected ${violations.length} architecture violations.`);
    } else {
      core.info("Clean architecture! Well done.");
    }

  } catch (error) {
    core.setFailed(error.message);
  }
}

run();

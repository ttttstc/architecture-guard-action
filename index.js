const core = require('@actions/core');
const github = require('@actions/github');
const { GoogleGenerativeAI } = require("@google/generative-ai");

/**
 * 🏛️ 内置架构审查规则库
 */
const BUILTIN_RULES = [
  {
    name: "Layering Violation: Direct DB Access",
    pattern: /(import|require).*from.*(['"])(db|mysql|pg|prisma|mongoose|sql)/i,
    message: "检测到层级越权：Controller/UI 层不应直接访问数据库驱动。",
    guidance: "【指导】应通过 Service 层或 Repository 模式进行数据持久化，确保业务逻辑与基础设施解耦。"
  },
  {
    name: "Code Smell: Hardcoded Secrets",
    pattern: /(password|secret|api_key|token|access_key)\s*[:=]\s*['"][a-zA-Z0-9_-]+['"]/i,
    message: "严重安全隐患：检测到疑似硬编码的敏感凭据。",
    guidance: "【指导】严禁将密钥写入代码库！请使用 GitHub Secrets 或环境变量注入，并使用 process.env 获取。"
  },
  {
    name: "Design Pattern: Singleton Misuse",
    pattern: /this\.instance\s*=\s*new/i,
    message: "单例模式潜在风险：检测到不安全的单例初始化。",
    guidance: "【指导】在 JS/TS 中推荐直接导出对象常量或使用私有构造函数配合静态 getter 确保单例唯一性。"
  },
  {
    name: "Architecture Violation: Circular Dependency Hint",
    pattern: /import.*from.*(['"])\.\.\//i,
    message: "潜在循环依赖：过多的向上层目录引用。",
    guidance: "【指导】尽量保持依赖树向下流动。频繁的 '../' 意味着分包逻辑混乱，建议重构目录结构或抽象通用工具类。"
  },
  {
    name: "SOLID: Interface Segregation (Fat Interface)",
    pattern: /interface.*\{[\s\S]{500,}\}/i,
    message: "接口臃肿：检测到接口/类型定义过长。",
    guidance: "【指导】违背了接口隔离原则 (ISP)。请将大接口拆分为多个细粒度接口，只提供客户端需要的最小功能集。"
  }
];

async function run() {
  try {
    const engine = core.getInput('engine') || 'builtin';
    const githubToken = core.getInput('github-token');
    const aiKey = core.getInput('ai-api-key');
    const customRules = core.getInput('architecture-rules');
    
    const octokit = github.getOctokit(githubToken);
    const context = github.context;

    if (!context.payload.pull_request) {
      core.setFailed('This action only runs on pull_request events.');
      return;
    }

    // 1. 获取 PR Diff
    const { data: diff } = await octokit.rest.pulls.get({
      owner: context.repo.owner,
      repo: context.repo.repo,
      pull_number: context.payload.pull_request.number,
      mediaType: { format: 'diff' }
    });

    let analysisResults = "";

    // 2. 执行内置引擎
    if (engine === 'builtin' || engine === 'hybrid') {
      core.info("Running Built-in Architecture Rules...");
      BUILTIN_RULES.forEach(rule => {
        if (rule.pattern.test(diff)) {
          analysisResults += `#### 🚨 ${rule.name}\n- **问题**: ${rule.message}\n- **建议**: ${rule.guidance}\n\n`;
        }
      });
    }

    // 3. 执行 AI 引擎 (如果配置且模式匹配)
    if ((engine === 'ai' || engine === 'hybrid') && aiKey) {
      core.info("Invoking AI Architect Analysis...");
      const genAI = new GoogleGenerativeAI(aiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
      const prompt = `Review the following code diff against these architecture rules: ${customRules}\n\nDiff:\n${diff}\n\nOutput only violations with actionable guidance in Markdown. If none, output "CLEAN".`;
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const aiText = response.text();
      if (aiText !== "CLEAN") {
        analysisResults += `#### 🤖 AI Architecture Insight\n${aiText}`;
      }
    }

    // 4. 发送评论
    if (analysisResults) {
      await octokit.rest.issues.createComment({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: context.payload.pull_request.number,
        body: `### 🛡️ Architecture Guard Report\n\n${analysisResults}\n\n---\n*Verified by CodeArts Pipeline Intelligence*`
      });
      core.warning('Architecture compliance issues identified.');
    } else {
      core.info('No architectural issues found.');
    }

  } catch (error) {
    core.setFailed(error.message);
  }
}

run();

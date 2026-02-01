const core = require('@actions/core');
const github = require('@actions/github');
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function run() {
  try {
    const githubToken = core.getInput('github-token');
    const aiKey = core.getInput('ai-api-key');
    const rules = core.getInput('architecture-rules');
    
    const octokit = github.getOctokit(githubToken);
    const context = github.context;

    if (!context.payload.pull_request) {
      core.setFailed('This action only runs on pull_request events.');
      return;
    }

    // 1. 获取 PR 的 Diff
    const { data: diff } = await octokit.rest.pulls.get({
      owner: context.repo.owner,
      repo: context.repo.repo,
      pull_number: context.payload.pull_request.number,
      mediaType: { format: 'diff' }
    });

    // 2. 调用 AI 进行架构分析
    const genAI = new GoogleGenerativeAI(aiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const prompt = `You are a Senior Software Architect. Review the following code diff against these architecture rules:
    Rules: ${rules}
    
    Diff:
    ${diff}
    
    If any code violates the rules, provide a concise, actionable suggestion in Markdown format. If it complies, reply "CLEAN".`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // 3. 处理结果并评论
    if (text !== "CLEAN") {
      await octokit.rest.issues.createComment({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: context.payload.pull_request.number,
        body: `### 🛡️ Architecture Guard Analysis\n\n${text}`
      });
      core.warning('Architecture violations found.');
    } else {
      core.info('Architecture check passed.');
    }

  } catch (error) {
    core.setFailed(error.message);
  }
}

run();

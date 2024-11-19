const fs = require("fs");
const path = require("path");
const { format } = require("date-fns");

class AnalysisLogger {
  constructor() {
    this.logsDir = path.join(process.cwd(), "logs");
    this.ensureLogsDirectory();
  }

  ensureLogsDirectory() {
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
  }

  generateFileName(analyzerType) {
    const timestamp = format(new Date(), "yyyy-MM-dd_HH-mm-ss");
    return path.join(this.logsDir, `${timestamp}_${analyzerType}.md`);
  }

  formatMarkdown(results, type) {
    const timestamp = format(new Date(), "yyyy-MM-dd HH:mm:ss");

    let markdown = this.generateHeader(type, timestamp);

    if (type === "seo") {
      markdown += this.generateSEOMetrics(results);
      markdown += this.generateSEOCharts(results);
      markdown += this.generateSEOFindings(results);
    } else {
      markdown += this.generateSummary(results);
      markdown += this.generateMetricsCharts(results);
      markdown += this.generatePatternAnalysis(results);
      markdown += this.generateDetailedFindings(results);
      markdown += this.generateRecommendations(results);
    }
    return markdown;
  }

  generateHeader(type, timestamp) {
    return `# Next.js Analysis Report: ${type}
> Generated: ${timestamp}

<details>
<summary>Table of Contents</summary>

- [Summary](#summary)
- [Metrics Overview](#metrics-overview)
- [Pattern Analysis](#pattern-analysis)
- [Detailed Findings](#detailed-findings)
- [Recommendations](#recommendations)

</details>

---\n\n`;
  }

  generateSummary(results) {
    return `## Summary

| Metric | Value |
|--------|-------|
| Total Routes | ${results.metrics.totalRoutes || 0} |
| API Routes | ${results.metrics.apiRoutes || 0} |
| Server Components | ${results.metrics.serverComponents || 0} |
| Static Components | ${results.metrics.staticComponents || 0} |

---\n\n`;
  }

  generateMetricsCharts(results) {
    return `## Metrics Overview

\`\`\`mermaid
pie title Component Distribution
    "Server Components" : ${results.metrics.serverComponents || 0}
    "Static Components" : ${results.metrics.staticComponents || 0}
    "API Routes" : ${results.metrics.apiRoutes || 0}
\`\`\`

\`\`\`mermaid
xychart-beta
title "Performance Metrics"
x-axis ["Time to First Byte", "First Contentful Paint", "Time to Interactive"]
y-axis "Time (ms)" 0 --> 1000
bar [${results.metrics.ttfb || 0}, ${results.metrics.fcp || 0}, ${
      results.metrics.tti || 0
    }]
\`\`\`

---\n\n`;
  }

  generatePatternAnalysis(results) {
    let markdown = `## Pattern Analysis

\`\`\`mermaid
graph LR
    A[Routes] --> B[Dynamic Routes]
    A --> C[API Routes]
    A --> D[Static Routes]
    B --> E[Catch-all]
    B --> F[Optional]
    C --> G[REST]
    C --> H[GraphQL]
\`\`\`

### Detected Patterns

| Pattern Type | Count | Description |
|-------------|-------|-------------|
`;

    const patterns = this.aggregatePatterns(results.findings);
    Object.entries(patterns).forEach(([type, count]) => {
      markdown += `| ${type} | ${count} | ${this.getPatternDescription(
        type
      )} |\n`;
    });

    return markdown + "\n---\n\n";
  }

  generateDetailedFindings(results) {
    let markdown = `## Detailed Findings

<details>
<summary>Click to expand findings</summary>

`;

    results.findings?.forEach((finding, i) => {
      if (typeof finding === "object") {
        markdown += `### Finding ${i + 1}\n\n`;
        Object.entries(finding).forEach(([key, value]) => {
          markdown += `- **${key}**: ${this.formatValue(value)}\n`;
        });
        markdown += "\n";
      }
    });

    return markdown + "</details>\n\n---\n\n";
  }

  generateRecommendations(results) {
    let markdown = `## Recommendations

> 💡 Based on the analysis, here are the key recommendations:

`;

    results.recommendations?.forEach((rec) => {
      markdown += `- ${rec}\n`;
    });

    return markdown;
  }
  generateSEOMetrics(results) {
    return `## SEO Overview

| Metric | Score |
|--------|-------|
| Pages with Meta | ${results.metrics.pagesWithMeta}/${
      results.metrics.totalPages
    } |
| Pages with Titles | ${results.metrics.pagesWithTitles}/${
      results.metrics.totalPages
    } |
| Images with Alt | ${results.metrics.imagesWithAlt}/${
      results.metrics.totalImages
    } |
| Social Tags Coverage | ${results.metrics.socialTags?.openGraph || 0} OG, ${
      results.metrics.socialTags?.twitter || 0
    } Twitter |
| Performance Score | ${results.metrics.performance?.score || 0}/100 |

`;
  }

  generateSEOCharts(results) {
    return `## SEO Analysis

\`\`\`mermaid
pie title "Meta Tags Coverage"
    "With Meta" : ${results.metrics.pagesWithMeta}
    "Without Meta" : ${
      results.metrics.totalPages - results.metrics.pagesWithMeta
    }
\`\`\`

\`\`\`mermaid
xychart-beta
title "SEO Scores"
x-axis ["Meta Coverage", "Image Alt", "Social Tags", "Performance"]
y-axis "Score %" 0 --> 100
bar [${(
      (results.metrics.pagesWithMeta / results.metrics.totalPages) *
      100
    ).toFixed(1)}, 
     ${(
       (results.metrics.imagesWithAlt / results.metrics.totalImages) *
       100
     ).toFixed(1)},
     ${(
       (results.metrics.socialTags?.openGraph / results.metrics.totalPages) *
       100
     ).toFixed(1)},
     ${results.metrics.performance?.score || 0}]
\`\`\`

`;
  }

  generateSEOFindings(results) {
    let markdown = `## SEO Issues\n\n`;

    const priorityIcons = {
      critical: "🔴",
      important: "🟡",
      recommended: "🟢",
    };

    if (results.findings?.length) {
      results.findings.forEach((finding) => {
        const icon = priorityIcons[finding.type] || "⚪";
        markdown += `${icon} **${finding.type}**: ${finding.message}\n`;
      });
    }

    return markdown + "\n";
  }
  formatValue(value) {
    if (Array.isArray(value)) {
      return value
        .map((item) =>
          typeof item === "object" ? JSON.stringify(item, null, 2) : item
        )
        .join(", ");
    }
    if (typeof value === "object" && value !== null) {
      return (
        "\n" +
        Object.entries(value)
          .map(([k, v]) => `    - ${k}: ${this.formatValue(v)}`)
          .join("\n")
      );
    }
    return value;
  }

  aggregatePatterns(findings) {
    const patterns = {};
    findings?.forEach((finding) => {
      if (finding.patterns) {
        finding.patterns.forEach((p) => {
          patterns[p.type] = (patterns[p.type] || 0) + 1;
        });
      }
    });
    return patterns;
  }

  getPatternDescription(type) {
    const descriptions = {
      dynamicRoutes: "Routes with dynamic segments ([param])",
      catchAll: "Catch-all routes ([...param])",
      optionalCatchAll: "Optional catch-all routes [[...param]]",
      apiRoutes: "API endpoint routes",
      groupedRoutes: "Route groups ((group))",
      parallelRoutes: "Parallel routes (@parallel)",
      interceptRoutes: "Route interception",
    };
    return descriptions[type] || "Unknown pattern";
  }

  async saveAnalysis(results, analyzerType) {
    const fileName = this.generateFileName(analyzerType);
    const markdown = this.formatMarkdown(results, analyzerType);

    try {
      await fs.promises.writeFile(fileName, markdown);
      return fileName;
    } catch (error) {
      console.error(`Error saving analysis log: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new AnalysisLogger();

// // src/analyzers/seoAnalyzer.js
// const fs = require("fs");
// const path = require("path");
// const ora = require("ora");

// const { exec, execSync } = require("child_process");
// const { theme, emoji } = require("../utils/themes");
// const { ProcessManager } = require("../utils/ProcessManager");
// const { theme, emoji } = require('../utils/themes');
// const progress = require('../utils/progress');
// const logger = require('../utils/logger');
// const puppeteer = require("puppeteer");
// const processManager = new ProcessManager();

// class SEOAnalyzer {
//   constructor() {
//     this.steps = [
//       { name: "Meta Tags", emoji: "🏷️" },
//       { name: "Lighthouse SEO", emoji: "🔍" },
//       { name: "Semantic HTML", emoji: "📝" },
//       { name: "Performance Impact", emoji: "⚡" },
//     ];
//   }

//   async analyze(projectRoot) {
//     const spinner = ora("Starting SEO analysis...").start();
//     const totalSteps = this.steps.length;
//     let currentStep = 0;

//     progress.start(totalSteps);

//     try {
//       const results = {
//         metrics: {
//           seoScore: 0,
//           metaTags: {
//             total: 0,
//             missing: 0,
//             duplicate: 0,
//           },
//           semanticHtml: {
//             total: 0,
//             semantic: 0,
//             nonSemantic: 0,
//           },
//           performance: {
//             loadTime: 0,
//             firstContentfulPaint: 0,
//             speedIndex: 0,
//           },
//         },
//         findings: [],
//         recommendations: [],
//       };

//       // Start local development server
//       const devServer = await this.startDevServer(projectRoot);
//       const serverUrl = `http://localhost:${devServer.port}`;

//       // Run Lighthouse analysis using CLI
//       const lighthouseResults = await this.runLighthouseCLI(serverUrl);
//       this.processLighthouseResults(lighthouseResults, results);

//       // Run Puppeteer for additional SEO checks
//       await this.runPuppeteerAnalysis(serverUrl, results);

//       // Analyze meta tags and semantic HTML
//       await this.analyzeMetaTags(projectRoot, results);
//       await this.analyzeSemanticHtml(projectRoot, results);

//       // Stop development server
//       await devServer.kill();

//       spinner.succeed("SEO analysis complete");
//       return results;
//     } catch (error) {
//       spinner.fail("SEO analysis failed");
//       throw error;
//     } finally {
//       await this.processManager.killAll();
//     }
//   }
//   async cleanBuildDirectory(projectRoot) {
//     const spinner = ora("Cleaning build directory...").start();

//     try {
//       const nextDir = path.join(projectRoot, ".next");

//       // Check if .next directory exists
//       if (fs.existsSync(nextDir)) {
//         // Try to remove trace file first if it exists
//         const tracePath = path.join(nextDir, "trace");
//         if (fs.existsSync(tracePath)) {
//           try {
//             fs.unlinkSync(tracePath);
//           } catch (error) {
//             // Ignore error, we'll handle it in the full cleanup
//           }
//         }

//         // Remove entire .next directory
//         await this.removeDirectory(nextDir);
//       }

//       spinner.succeed("Build directory cleaned");
//     } catch (error) {
//       spinner.warn(
//         "Could not clean build directory completely, attempting to continue..."
//       );
//       console.error("Clean error:", error);
//     }
//   }

//   async removeDirectory(dirPath) {
//     if (!fs.existsSync(dirPath)) return;

//     const entries = fs.readdirSync(dirPath, { withFileTypes: true });

//     for (const entry of entries) {
//       const fullPath = path.join(dirPath, entry.name);
//       try {
//         if (entry.isDirectory()) {
//           await this.removeDirectory(fullPath);
//         } else {
//           fs.unlinkSync(fullPath);
//         }
//       } catch (error) {
//         console.warn(`Warning: Could not remove ${fullPath}:`, error.message);
//       }
//     }

//     try {
//       fs.rmdirSync(dirPath);
//     } catch (error) {
//       console.warn(
//         `Warning: Could not remove directory ${dirPath}:`,
//         error.message
//       );
//     }
//   }

//   checkNextIntlConfig(projectRoot) {
//     // Check for next-intl configuration
//     const nextConfigPath = path.join(projectRoot, "next.config.js");
//     const i18nConfigPath = path.join(projectRoot, "src", "i18n.ts");
//     const newI18nConfigPath = path.join(projectRoot, "i18n", "request.ts");

//     if (fs.existsSync(i18nConfigPath) && !fs.existsSync(newI18nConfigPath)) {
//       // Create i18n directory if it doesn't exist
//       const i18nDir = path.join(projectRoot, "i18n");
//       if (!fs.existsSync(i18nDir)) {
//         fs.mkdirSync(i18nDir, { recursive: true });
//       }

//       // Move i18n configuration
//       fs.copyFileSync(i18nConfigPath, newI18nConfigPath);

//       // Update next.config.js
//       if (fs.existsSync(nextConfigPath)) {
//         let nextConfig = fs.readFileSync(nextConfigPath, "utf8");
//         if (nextConfig.includes("createNextIntlPlugin")) {
//           nextConfig = nextConfig.replace(
//             /createNextIntlPlugin\([^)]*\)/,
//             `createNextIntlPlugin('./i18n/request.ts')`
//           );
//           fs.writeFileSync(nextConfigPath, nextConfig);
//         }
//       }

//       console.log(theme.info("\nℹ️ Updated next-intl configuration"));
//     }
//   }
//   isActualError(data) {
//     // Ignore known non-critical messages
//     const ignoredPatterns = [
//       "[next-intl]",
//       "Duplicate atom key",
//       "Fast Refresh had to perform a full reload",
//       "Failed to load env",
//       "- Environments:",
//       "getaddrinfo",
//       "EADDRINUSE",
//       "ECONNREFUSED",
//     ];

//     if (ignoredPatterns.some((pattern) => data.includes(pattern))) {
//       return false;
//     }

//     const errorIndicators = [
//       "ERR!",
//       "Error:",
//       "error",
//       "failed",
//       "Failed to compile",
//     ];

//     return errorIndicators.some((indicator) => data.includes(indicator));
//   }

//   async checkServerStatus(url, retries = 5) {
//     const http = require("http");

//     for (let i = 0; i < retries; i++) {
//       try {
//         await new Promise((resolve, reject) => {
//           const req = http.get(url, (res) => {
//             if (res.statusCode === 200) {
//               resolve();
//             } else {
//               reject();
//             }
//           });

//           req.on("error", reject);
//           req.end();
//         });
//         return true;
//       } catch {
//         await new Promise((resolve) => setTimeout(resolve, 1000));
//       }
//     }
//     return false;
//   }
//   checkServerStarted(data) {
//     const successIndicators = [
//       "ready",
//       "started server",
//       "compiled successfully",
//       "Listening on",
//       "started on",
//       "compiled client and server successfully",
//       "Fast Refresh enabled",
//       "Development server started",
//     ];

//     return successIndicators.some((indicator) =>
//       data.toLowerCase().includes(indicator.toLowerCase())
//     );
//   }

//   formatErrorMessage(errorBuffer, outputBuffer) {
//     let message = "Server startup failed.\n\n";

//     if (errorBuffer) {
//       // Filter out environment loading messages
//       const filteredError = errorBuffer
//         .split("\n")
//         .filter((line) => !line.includes("Environments:"))
//         .join("\n");

//       if (filteredError.trim()) {
//         message += "Error Details:\n" + filteredError + "\n\n";
//       }
//     }

//     if (outputBuffer) {
//       const filteredOutput = outputBuffer
//         .split("\n")
//         .filter((line) => !line.includes("Environments:"))
//         .join("\n");

//       if (filteredOutput.trim()) {
//         message += "Server Output:\n" + filteredOutput;
//       }
//     }

//     return message;
//   }
//   async runLighthouseCLI(url) {
//     const spinner = ora("Running Lighthouse analysis...").start();

//     try {
//       // Wait for server
//       await this.waitForServerReady(url, 30);

//       // Setup output
//       const outputDir = path.join(process.cwd(), "lighthouse-reports");
//       if (!fs.existsSync(outputDir)) {
//         fs.mkdirSync(outputDir, { recursive: true });
//       }

//       const outputPath = path.join(outputDir, "lighthouse-report.json");

//       // Run with retries
//       let attempts = 0;
//       const maxAttempts = 3;

//       while (attempts < maxAttempts) {
//         try {
//           spinner.text = `Running Lighthouse (attempt ${
//             attempts + 1
//           }/${maxAttempts})`;

//           const chromeFlags = [
//             "--headless=new",
//             "--disable-gpu",
//             "--no-sandbox",
//             "--disable-dev-shm-usage",
//             "--disable-web-security",
//             "--allow-insecure-localhost",
//             "--ignore-certificate-errors",
//           ].join(" ");

//           execSync(
//             `lighthouse ${url} --output=json --output-path=${outputPath} ` +
//               "--only-categories=seo,accessibility,best-practices " +
//               "--preset=desktop --quiet " +
//               `--chrome-flags="${chromeFlags}"`,
//             { stdio: "pipe" }
//           );

//           // Verify and parse results
//           if (!fs.existsSync(outputPath)) {
//             throw new Error("Lighthouse failed to generate report");
//           }

//           const results = JSON.parse(fs.readFileSync(outputPath, "utf8"));
//           spinner.succeed("Lighthouse analysis complete");
//           return results;
//         } catch (error) {
//           attempts++;
//           if (attempts < maxAttempts) {
//             spinner.text = `Retrying Lighthouse (${attempts}/${maxAttempts})`;
//             await new Promise((resolve) => setTimeout(resolve, 3000));
//           } else {
//             throw error;
//           }
//         }
//       }
//     } catch (error) {
//       spinner.fail("Lighthouse analysis failed");
//       throw error;
//     }
//   }

//   async waitForServerReady(url, maxAttempts = 30) {
//     const spinner = ora("Waiting for server to be ready...").start();
//     const startTime = Date.now();

//     for (let i = 0; i < maxAttempts; i++) {
//       try {
//         // Make a HEAD request to check server
//         await new Promise((resolve, reject) => {
//           const parsedUrl = new URL(url);
//           const req = require("http").request(
//             {
//               method: "HEAD",
//               hostname: parsedUrl.hostname,
//               port: parsedUrl.port,
//               path: parsedUrl.pathname,
//               timeout: 1000,
//             },
//             (res) => {
//               if (res.statusCode === 200) {
//                 resolve();
//               } else {
//                 reject(new Error(`Server returned status ${res.statusCode}`));
//               }
//             }
//           );

//           req.on("error", reject);
//           req.end();
//         });

//         const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
//         spinner.succeed(`Server ready after ${elapsed}s`);
//         return;
//       } catch (error) {
//         const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
//         spinner.text = `Waiting for server to be ready (${elapsed}s)...`;
//         await new Promise((resolve) => setTimeout(resolve, 1000));
//       }
//     }

//     spinner.fail("Server not responding");
//     throw new Error("Server failed to respond within timeout period");
//   }

//   checkServerStarted(data) {
//     const indicators = [
//       "ready",
//       "started server",
//       "compiled successfully",
//       "Listening on",
//       "started on",
//       "compiled client and server successfully",
//       "compiled successfully in",
//     ];
//     return indicators.some((indicator) =>
//       data.toLowerCase().includes(indicator.toLowerCase())
//     );
//   }
//   // Update the startDevServer method
//   async startDevServer(projectRoot) {
//     return new Promise((resolve, reject) => {
//       const port = 3000;
//       const npm = process.platform === "win32" ? "npm.cmd" : "npm";

//       const serverProcess = exec(`${npm} run dev`, {
//         cwd: projectRoot,
//       });

//       this.processManager.registerProcess("devServer", serverProcess);

//       // Wait for server to start
//       let output = "";
//       const timeout = setTimeout(() => {
//         reject(new Error("Server startup timeout"));
//       }, 30000);

//       serverProcess.stdout.on("data", (data) => {
//         output += data;
//         if (output.includes("ready")) {
//           clearTimeout(timeout);
//           resolve({ port, kill: () => serverProcess.kill() });
//         }
//       });

//       serverProcess.stderr.on("data", (data) => {
//         console.error(`Server error: ${data}`);
//       });

//       serverProcess.on("error", (error) => {
//         clearTimeout(timeout);
//         reject(error);
//       });
//     });
//   }

//   async killServer(server) {
//     return new Promise((resolve) => {
//       if (process.platform === "win32") {
//         exec(`taskkill /pid ${server.pid} /T /F`, resolve);
//       } else {
//         server.kill("SIGTERM");
//         resolve();
//       }
//     });
//   }

//   // Add helper method for port cleanup
//   async cleanupPort(port) {
//     try {
//       if (process.platform === "win32") {
//         const output = execSync("netstat -ano | findstr :3000", {
//           stdio: "pipe",
//         }).toString();
//         const pids = output.match(/(\d+)$/gm);
//         if (pids) {
//           pids.forEach((pid) => {
//             try {
//               execSync(`taskkill /F /PID ${pid}`);
//             } catch (e) {}
//           });
//         }
//       } else {
//         execSync(`lsof -i:${port} -t | xargs kill -9`, { stdio: "pipe" });
//       }
//     } catch (e) {}
//   }

//   isErrorMessage(data) {
//     // Ignore certain errors/warnings
//     if (
//       data.includes("[next-intl]") ||
//       data.includes("Duplicate atom key") ||
//       data.includes("Fast Refresh had to perform a full reload")
//     ) {
//       return false;
//     }

//     const errorIndicators = [
//       "ERR!",
//       "Error:",
//       "error",
//       "failed",
//       "Failed to compile",
//     ];

//     return errorIndicators.some((indicator) => data.includes(indicator));
//   }

//   formatErrorMessage(errorBuffer, outputBuffer) {
//     let message = "Server startup failed.\n\n";

//     if (errorBuffer) {
//       message += "Error Details:\n" + errorBuffer + "\n\n";
//     }

//     if (outputBuffer) {
//       message += "Server Output:\n" + outputBuffer;
//     }

//     return message;
//   }

//   // Helper method to check build status
//   async checkBuildExists(projectRoot) {
//     const nextDir = path.join(projectRoot, ".next");
//     return (
//       fs.existsSync(nextDir) &&
//       fs.existsSync(path.join(nextDir, "build-manifest.json"))
//     );
//   }

//   async runPuppeteerAnalysis(url, results) {
//     const spinner = ora("Running additional SEO checks...").start();

//     try {
//       const browser = await puppeteer.launch({
//         headless: "new",
//         args: ["--no-sandbox", "--disable-setuid-sandbox"],
//       });

//       const page = await browser.newPage();
//       await page.goto(url, { waitUntil: "networkidle0" });

//       // Collect performance metrics
//       const metrics = await page.metrics();
//       const performanceTimings = JSON.parse(
//         await page.evaluate(() => JSON.stringify(window.performance.timing))
//       );

//       // Update results
//       results.metrics.performance = {
//         loadTime:
//           performanceTimings.loadEventEnd - performanceTimings.navigationStart,
//         firstContentfulPaint: metrics.FirstContentfulPaint,
//         speedIndex: metrics.SpeedIndex || 0,
//       };

//       // Check for common SEO elements
//       const seoElements = await page.evaluate(() => {
//         return {
//           hasCanonical: !!document.querySelector('link[rel="canonical"]'),
//           hasStructuredData: !!document.querySelector(
//             'script[type="application/ld+json"]'
//           ),
//           hasSitemap: !!document.querySelector('link[rel="sitemap"]'),
//           hasRobots: !!document.querySelector('meta[name="robots"]'),
//         };
//       });

//       // Add findings
//       Object.entries(seoElements).forEach(([key, value]) => {
//         if (!value) {
//           results.recommendations.push({
//             title: `Missing ${key.replace("has", "")}`,
//             priority: "medium",
//             description: `Add ${key.replace("has", "")} for better SEO`,
//           });
//         }
//       });

//       await browser.close();
//       spinner.succeed("Additional SEO checks complete");
//     } catch (error) {
//       spinner.fail("Additional SEO checks failed");
//       throw error;
//     }
//   }
//   async runLighthouseAnalysis(url) {
//     const spinner = ora("Running Lighthouse analysis...").start();

//     try {
//       // Launch Chrome
//       const chrome = await chromeLauncher.launch({
//         chromeFlags: ["--headless", "--disable-gpu", "--no-sandbox"],
//       });

//       // Run Lighthouse
//       const results = await lighthouse(url, {
//         port: chrome.port,
//         output: "json",
//         onlyCategories: ["seo", "accessibility", "best-practices"],
//         preset: "desktop",
//       });

//       // Close Chrome
//       await chrome.kill();

//       spinner.succeed("Lighthouse analysis complete");
//       return results.lhr;
//     } catch (error) {
//       spinner.fail("Lighthouse analysis failed");
//       throw error;
//     }
//   }

//   processLighthouseResults(lhr, results) {
//     // Process SEO score
//     results.metrics.seoScore = lhr.categories.seo.score * 100;

//     // Process audits
//     Object.values(lhr.audits).forEach((audit) => {
//       if (audit.score !== null) {
//         const finding = {
//           title: audit.title,
//           description: audit.description,
//           score: audit.score * 100,
//           type: this.getAuditType(audit),
//           impact: this.getAuditImpact(audit.score),
//         };

//         results.findings.push(finding);

//         // Add recommendations for failed audits
//         if (audit.score < 0.9) {
//           results.recommendations.push({
//             title: audit.title,
//             description: audit.description,
//             priority: this.getRecommendationPriority(audit.score),
//           });
//         }
//       }
//     });
//   }

//   async analyzeMetaTags(projectRoot, results) {
//     const spinner = ora("Analyzing meta tags...").start();

//     try {
//       const metaTags = new Set();
//       const duplicates = new Set();

//       const scanDir = async (dir) => {
//         const entries = fs.readdirSync(dir, { withFileTypes: true });

//         for (const entry of entries) {
//           const fullPath = path.join(dir, entry.name);

//           if (entry.isDirectory() && !entry.name.startsWith(".")) {
//             await scanDir(fullPath);
//           } else if (entry.name.match(/\.(jsx?|tsx?)$/)) {
//             const content = fs.readFileSync(fullPath, "utf8");

//             // Find meta tags
//             const metaMatches = content.match(/<meta[^>]+>/g) || [];
//             metaMatches.forEach((meta) => {
//               if (metaTags.has(meta)) {
//                 duplicates.add(meta);
//               } else {
//                 metaTags.add(meta);
//               }
//             });
//           }
//         }
//       };

//       await scanDir(path.join(projectRoot, "src"));

//       // Update metrics
//       results.metrics.metaTags = {
//         total: metaTags.size,
//         missing: this.checkMissingMetaTags(metaTags),
//         duplicate: duplicates.size,
//       };

//       spinner.succeed("Meta tags analysis complete");
//     } catch (error) {
//       spinner.fail("Meta tags analysis failed");
//       throw error;
//     }
//   }

//   async analyzeSemanticHtml(projectRoot, results) {
//     const spinner = ora("Analyzing semantic HTML...").start();

//     try {
//       const semanticTags = new Set([
//         "article",
//         "aside",
//         "details",
//         "figcaption",
//         "figure",
//         "footer",
//         "header",
//         "main",
//         "mark",
//         "nav",
//         "section",
//         "summary",
//         "time",
//       ]);

//       let totalTags = 0;
//       let semanticCount = 0;

//       const scanDir = async (dir) => {
//         const entries = fs.readdirSync(dir, { withFileTypes: true });

//         for (const entry of entries) {
//           const fullPath = path.join(dir, entry.name);

//           if (entry.isDirectory() && !entry.name.startsWith(".")) {
//             await scanDir(fullPath);
//           } else if (entry.name.match(/\.(jsx?|tsx?)$/)) {
//             const content = fs.readFileSync(fullPath, "utf8");

//             // Count semantic tags
//             semanticTags.forEach((tag) => {
//               const matches =
//                 content.match(new RegExp(`<${tag}[^>]*>`, "g")) || [];
//               semanticCount += matches.length;
//             });

//             // Count total tags
//             const allTags = content.match(/<[a-z][^>]*>/g) || [];
//             totalTags += allTags.length;
//           }
//         }
//       };

//       await scanDir(path.join(projectRoot, "src"));

//       // Update metrics
//       results.metrics.semanticHtml = {
//         total: totalTags,
//         semantic: semanticCount,
//         nonSemantic: totalTags - semanticCount,
//       };

//       spinner.succeed("Semantic HTML analysis complete");
//     } catch (error) {
//       spinner.fail("Semantic HTML analysis failed");
//       throw error;
//     }
//   }

//   checkMissingMetaTags(metaTags) {
//     const requiredTags = [
//       "description",
//       "viewport",
//       "robots",
//       "og:title",
//       "og:description",
//       "twitter:card",
//     ];

//     return requiredTags.filter(
//       (tag) => !Array.from(metaTags).some((meta) => meta.includes(tag))
//     ).length;
//   }

//   getAuditType(audit) {
//     if (audit.title.toLowerCase().includes("seo")) return "seo";
//     if (audit.title.toLowerCase().includes("accessibility"))
//       return "accessibility";
//     return "best-practices";
//   }

//   getAuditImpact(score) {
//     if (score >= 0.9) return "low";
//     if (score >= 0.7) return "medium";
//     return "high";
//   }

//   getRecommendationPriority(score) {
//     if (score < 0.5) return "high";
//     if (score < 0.8) return "medium";
//     return "low";
//   }
// }

// module.exports = SEOAnalyzer;
// src/analyzers/seoAnalyzer.js
const fs = require("fs");
const path = require("path");
const ora = require("ora");
const { theme, emoji } = require("../utils/themes");
const progress = require("../utils/progress");
const logger = require("../utils/logger");

class SEOAnalyzer {
  constructor() {
    this.steps = [
      { name: "Meta Tags", emoji: "🏷️" },
      { name: "Content Analysis", emoji: "📝" },
      { name: "Semantic HTML", emoji: "🔍" },
      { name: "Performance SEO", emoji: "⚡" },
    ];
  }

  async analyze(projectRoot) {
    const totalSteps = this.steps.length;
    let currentStep = 0;

    progress.start(totalSteps);

    const results = {
      metrics: {
        metaTags: {
          title: 0,
          description: 0,
          viewport: 0,
          robots: 0,
          canonical: 0,
          openGraph: 0,
          twitterCards: 0,
        },
        contentQuality: {
          headings: 0,
          images: 0,
          imagesWithAlt: 0,
          links: 0,
          internalLinks: 0,
        },
        semanticHtml: {
          article: 0,
          main: 0,
          nav: 0,
          section: 0,
          header: 0,
          footer: 0,
        },
        performance: {
          lazyImages: 0,
          asyncScripts: 0,
          deferredScripts: 0,
        },
      },
      findings: [],
      recommendations: [],
    };

    try {
      for (const step of this.steps) {
        currentStep++;
        progress.update(currentStep, totalSteps, `${step.emoji} ${step.name}`);

        const stepResults = await this.executeStep(step.name, projectRoot);
        this.mergeResults(results, stepResults);

        await new Promise((resolve) => setTimeout(resolve, 800));
      }

      const logFile = await logger.saveAnalysis(results, "seo");
      results.logFile = logFile;

      return results;
    } catch (error) {
      throw error;
    } finally {
      progress.stop();
    }
  }

  async executeStep(stepName, projectRoot) {
    const stepResults = {
      metrics: {},
      findings: [],
      recommendations: [],
    };

    const appDir = path.join(projectRoot, "src", "app");

    switch (stepName) {
      case "Meta Tags":
        await this.analyzeMetaTags(appDir, stepResults);
        break;
      case "Content Analysis":
        await this.analyzeContent(appDir, stepResults);
        break;
      case "Semantic HTML":
        await this.analyzeSemanticHtml(appDir, stepResults);
        break;
      case "Performance SEO":
        await this.analyzePerformanceSEO(appDir, stepResults);
        break;
    }

    return stepResults;
  }

  async scanDirectory(dir, callback) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory() && !entry.name.startsWith("_")) {
        await this.scanDirectory(fullPath, callback);
      } else if (this.isAnalyzableFile(entry.name)) {
        const content = fs.readFileSync(fullPath, "utf8");
        await callback(content, fullPath);
      }
    }
  }

  async analyzeMetaTags(appDir, results) {
    const spinner = ora("Analyzing meta tags...").start();

    try {
      await this.scanDirectory(appDir, (content, filePath) => {
        const metaTags = this.detectMetaTags(content);
        Object.assign(results.metrics, { metaTags });

        if (this.hasMetaIssues(metaTags)) {
          results.findings.push({
            file: filePath,
            metaIssues: this.getMetaIssues(metaTags),
          });
        }

        this.addMetaRecommendations(metaTags, results.recommendations);
      });

      spinner.succeed("Meta tags analysis complete");
    } catch (error) {
      spinner.fail("Error analyzing meta tags");
      throw error;
    }
  }

  // Helper methods
  isAnalyzableFile(filename) {
    return /\.(jsx?|tsx?|mdx?)$/.test(filename);
  }

  detectMetaTags(content) {
    return {
      title: (content.match(/title:|<title>|getStaticProps.*title/g) || [])
        .length,
      description: (
        content.match(
          /description:|meta.*description|getStaticProps.*description/g
        ) || []
      ).length,
      viewport: content.includes("viewport"),
      robots: content.includes("robots"),
      canonical: content.includes("canonical"),
      openGraph: (content.match(/og:|openGraph/g) || []).length,
      twitterCards: (content.match(/twitter:|getStaticProps.*twitter/g) || [])
        .length,
    };
  }

  hasMetaIssues(metaTags) {
    return !metaTags.title || !metaTags.description || !metaTags.viewport;
  }

  getMetaIssues(metaTags) {
    const issues = [];
    if (!metaTags.title) issues.push("Missing title tag");
    if (!metaTags.description) issues.push("Missing meta description");
    if (!metaTags.viewport) issues.push("Missing viewport meta tag");
    return issues;
  }

  addMetaRecommendations(metaTags, recommendations) {
    if (!metaTags.title) {
      recommendations.push("Add title tags to improve SEO ranking");
    }
    if (!metaTags.description) {
      recommendations.push("Add meta descriptions for better search results");
    }
    if (!metaTags.openGraph) {
      recommendations.push("Implement OpenGraph tags for social media sharing");
    }
  }

  mergeResults(target, source) {
    // Merge metrics
    for (const [key, value] of Object.entries(source.metrics)) {
      if (typeof value === "object") {
        target.metrics[key] = { ...target.metrics[key], ...value };
      } else {
        target.metrics[key] = (target.metrics[key] || 0) + value;
      }
    }

    // Merge findings and recommendations
    target.findings.push(...source.findings);
    target.recommendations.push(...source.recommendations);
  }
  // src/analyzers/seoAnalyzer.js

  // Add these methods to the SEOAnalyzer class
  async analyzeContent(appDir, results) {
    const spinner = ora("Analyzing content...").start();

    try {
      await this.scanDirectory(appDir, async (content, filePath) => {
        const contentMetrics = this.analyzeContentMetrics(content);
        this.mergeContentMetrics(results.metrics, contentMetrics);

        const contentIssues = this.detectContentIssues(content);
        if (contentIssues.length > 0) {
          results.findings.push({
            file: filePath,
            type: "content",
            issues: contentIssues,
          });
        }

        this.addContentRecommendations(contentMetrics, results.recommendations);
      });

      spinner.succeed("Content analysis complete");
    } catch (error) {
      spinner.fail("Error analyzing content");
      throw error;
    }
  }

  analyzeContentMetrics(content) {
    return {
      headings: {
        h1: (content.match(/<h1|>#/g) || []).length,
        h2: (content.match(/<h2|>##/g) || []).length,
        h3: (content.match(/<h3|>###/g) || []).length,
      },
      paragraphs: (content.match(/<p>|<paragraph>/g) || []).length,
      images: {
        total: (content.match(/<img|Image/g) || []).length,
        withAlt: (content.match(/alt=["'][^"']+["']/g) || []).length,
      },
      links: {
        internal: (content.match(/href=["']\/[^"']+["']/g) || []).length,
        external: (content.match(/href=["']https?:\/\/[^"']+["']/g) || [])
          .length,
      },
      keywords: this.extractKeywords(content),
    };
  }

  detectContentIssues(content) {
    const issues = [];

    // Check heading hierarchy
    if (!content.match(/<h1|>#/)) {
      issues.push("Missing H1 heading");
    }

    // Check image alt text
    const images = content.match(/<img|Image/g) || [];
    const alts = content.match(/alt=["'][^"']+["']/g) || [];
    if (images.length > alts.length) {
      issues.push("Images missing alt text");
    }

    // Check link text
    const genericLinks = content.match(/>\s*(click|here|read more)\s*</gi);
    if (genericLinks) {
      issues.push("Generic link text detected");
    }

    // Check content length
    const textContent = content.replace(/<[^>]+>/g, "").trim();
    if (textContent.length < 300) {
      issues.push("Content length below recommended minimum (300 chars)");
    }

    return issues;
  }

  extractKeywords(content) {
    const text = content.replace(/<[^>]+>/g, "").toLowerCase();
    const words = text.match(/\b\w{3,}\b/g) || [];
    const wordFreq = {};

    words.forEach((word) => {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    });

    return Object.entries(wordFreq)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([word]) => word);
  }

  mergeContentMetrics(target, source) {
    target.contentQuality = target.contentQuality || {};

    ["headings", "images", "links"].forEach((key) => {
      if (typeof source[key] === "object") {
        target.contentQuality[key] = target.contentQuality[key] || {};
        Object.assign(target.contentQuality[key], source[key]);
      } else {
        target.contentQuality[key] =
          (target.contentQuality[key] || 0) + source[key];
      }
    });
  }

  addContentRecommendations(metrics, recommendations) {
    if (metrics.headings.h1 === 0) {
      recommendations.push("Add H1 heading for main page title");
    }
    if (metrics.headings.h1 > 1) {
      recommendations.push("Use only one H1 heading per page");
    }
    if (metrics.images.total > metrics.images.withAlt) {
      recommendations.push("Add alt text to all images");
    }
    if (metrics.links.internal === 0) {
      recommendations.push("Add internal links for better site structure");
    }
  }
  // Add these methods to the SEOAnalyzer class

  async analyzeSemanticHtml(appDir, results) {
    const spinner = ora("Analyzing semantic HTML...").start();

    try {
      await this.scanDirectory(appDir, async (content, filePath) => {
        const semanticMetrics = this.analyzeSemanticStructure(content);
        this.mergeSemanticMetrics(results.metrics, semanticMetrics);

        const semanticIssues = this.detectSemanticIssues(content);
        if (semanticIssues.length > 0) {
          results.findings.push({
            file: filePath,
            type: "semantic",
            issues: semanticIssues,
          });
        }

        this.addSemanticRecommendations(
          semanticMetrics,
          results.recommendations
        );
      });

      spinner.succeed("Semantic HTML analysis complete");
    } catch (error) {
      spinner.fail("Error analyzing semantic HTML");
      throw error;
    }
  }

  analyzeSemanticStructure(content) {
    const semanticElements = {
      header: (content.match(/<header/g) || []).length,
      nav: (content.match(/<nav/g) || []).length,
      main: (content.match(/<main/g) || []).length,
      article: (content.match(/<article/g) || []).length,
      section: (content.match(/<section/g) || []).length,
      aside: (content.match(/<aside/g) || []).length,
      footer: (content.match(/<footer/g) || []).length,
      landmark: (
        content.match(
          /role=["'](main|navigation|banner|contentinfo|complementary|search)["']/g
        ) || []
      ).length,
    };

    const nonSemanticPatterns = {
      divWithRole: (content.match(/<div[^>]+role=/g) || []).length,
      genericContainers: (
        content.match(
          /<div class=["'](wrapper|container|content|header|footer)["']/g
        ) || []
      ).length,
    };

    return {
      semantic: semanticElements,
      nonSemantic: nonSemanticPatterns,
      score: this.calculateSemanticScore(semanticElements, nonSemanticPatterns),
    };
  }

  detectSemanticIssues(content) {
    const issues = [];

    // Check for main content area
    if (!content.match(/<main|role=["']main["']/)) {
      issues.push('Missing main content area (<main> or role="main")');
    }

    // Check for navigation
    if (!content.match(/<nav|role=["']navigation["']/)) {
      issues.push('Missing navigation area (<nav> or role="navigation")');
    }

    // Check for header/footer
    if (!content.match(/<header/)) {
      issues.push("Missing header element");
    }
    if (!content.match(/<footer/)) {
      issues.push("Missing footer element");
    }

    // Check for generic div usage
    const divCount = (content.match(/<div/g) || []).length;
    const semanticCount = (
      content.match(/<(article|section|aside|header|footer|nav|main)/g) || []
    ).length;

    if (divCount > semanticCount * 2) {
      issues.push("Excessive use of generic <div> elements");
    }

    return issues;
  }

  calculateSemanticScore(semantic, nonSemantic) {
    const semanticTotal = Object.values(semantic).reduce(
      (sum, count) => sum + count,
      0
    );
    const nonSemanticTotal = Object.values(nonSemantic).reduce(
      (sum, count) => sum + count,
      0
    );

    if (semanticTotal + nonSemanticTotal === 0) return 0;
    return (semanticTotal / (semanticTotal + nonSemanticTotal)) * 100;
  }

  mergeSemanticMetrics(target, source) {
    target.semanticHtml = target.semanticHtml || {
      elements: {},
      score: 0,
      issues: 0,
    };

    if (source.semantic) {
      Object.entries(source.semantic).forEach(([key, value]) => {
        target.semanticHtml.elements[key] =
          (target.semanticHtml.elements[key] || 0) + value;
      });
    }

    target.semanticHtml.score =
      (target.semanticHtml.score + (source.score || 0)) / 2;
  }

  addSemanticRecommendations(metrics, recommendations) {
    if (metrics.score < 70) {
      recommendations.push("Increase use of semantic HTML elements");
    }

    if (!metrics.semantic.main) {
      recommendations.push("Add <main> element to identify primary content");
    }

    if (!metrics.semantic.nav) {
      recommendations.push("Use <nav> element for navigation sections");
    }

    if (metrics.nonSemantic.divWithRole > metrics.semantic.landmark) {
      recommendations.push(
        "Replace divs with roles using semantic HTML elements"
      );
    }
  }
  // Add this method to the SEOAnalyzer class
  async analyzePerformanceSEO(appDir, results) {
    const spinner = ora("Analyzing SEO performance...").start();

    try {
      await this.scanDirectory(appDir, async (content, filePath) => {
        const performanceMetrics = this.analyzePerformanceMetrics(content);
        this.mergePerformanceMetrics(results.metrics, performanceMetrics);

        const performanceIssues = this.detectPerformanceIssues(content);
        if (performanceIssues.length > 0) {
          results.findings.push({
            file: filePath,
            type: "performance",
            issues: performanceIssues,
          });
        }

        this.addPerformanceRecommendations(
          performanceMetrics,
          results.recommendations
        );
      });

      spinner.succeed("SEO performance analysis complete");
    } catch (error) {
      spinner.fail("Error analyzing SEO performance");
      throw error;
    }
  }

  analyzePerformanceMetrics(content) {
    return {
      lazyImages: (content.match(/loading=["']lazy["']/g) || []).length,
      asyncScripts: (content.match(/script.*async/g) || []).length,
      deferredScripts: (content.match(/script.*defer/g) || []).length,
      imagesWithDimensions: (
        content.match(/(?:width|height)=["']\d+["']/g) || []
      ).length,
      nextImageOptimization: (content.match(/<Image/g) || []).length,
    };
  }

  detectPerformanceIssues(content) {
    const issues = [];

    // Check for unoptimized images
    const regularImgs = (
      content.match(/<img(?!\s+.*\b(loading|Image)\b)[^>]*>/g) || []
    ).length;
    if (regularImgs > 0) {
      issues.push(
        `${regularImgs} unoptimized images found - consider using next/image or lazy loading`
      );
    }

    // Check for render-blocking scripts
    const blockingScripts = (
      content.match(/<script(?!\s+.*\b(async|defer)\b)[^>]*>/g) || []
    ).length;
    if (blockingScripts > 0) {
      issues.push(`${blockingScripts} render-blocking scripts found`);
    }

    // Check for images without dimensions
    const imagesWithoutDimensions = (
      content.match(/<img[^>]+src[^>]+>(?![^>]*(?:width|height))/g) || []
    ).length;
    if (imagesWithoutDimensions > 0) {
      issues.push(
        `${imagesWithoutDimensions} images without explicit dimensions`
      );
    }

    return issues;
  }

  mergePerformanceMetrics(target, source) {
    target.performance = target.performance || {
      lazyImages: 0,
      asyncScripts: 0,
      deferredScripts: 0,
      imagesWithDimensions: 0,
      nextImageOptimization: 0,
    };

    Object.entries(source).forEach(([key, value]) => {
      target.performance[key] = (target.performance[key] || 0) + value;
    });
  }

  addPerformanceRecommendations(metrics, recommendations) {
    if (metrics.lazyImages === 0) {
      recommendations.push("Implement lazy loading for images below the fold");
    }

    if (metrics.asyncScripts === 0 && metrics.deferredScripts === 0) {
      recommendations.push("Use async or defer for non-critical scripts");
    }

    if (metrics.imagesWithDimensions < metrics.nextImageOptimization) {
      recommendations.push(
        "Add width and height attributes to images to prevent layout shifts"
      );
    }

    if (metrics.nextImageOptimization === 0) {
      recommendations.push(
        "Use Next.js Image component for automatic image optimization"
      );
    }
  }
}

module.exports = SEOAnalyzer;

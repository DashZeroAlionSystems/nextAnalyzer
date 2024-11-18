// src/utils/logger.js
import fs from 'fs';
import path from 'path';
import { format } from 'date-fns';
import { theme, emoji } from './themes';

class AnalysisLogger {
    constructor() {
        this.logsDir = path.join(process.cwd(), 'logs');
        this.ensureLogsDirectory();
        this.previousReports = new Map();
        this.loadPreviousReports();
    }

    ensureLogsDirectory() {
        const directories = [
            this.logsDir,
            path.join(this.logsDir, 'errors'),
            path.join(this.logsDir, 'daily'),
            path.join(this.logsDir, 'trends')
        ];

        directories.forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });
    }

    loadPreviousReports() {
        try {
            const files = fs.readdirSync(this.logsDir);
            files.forEach(file => {
                if (file.endsWith('.md')) {
                    const content = fs.readFileSync(path.join(this.logsDir, file), 'utf8');
                    const type = file.split('_')[1].split('.')[0];
                    if (!this.previousReports.has(type)) {
                        this.previousReports.set(type, []);
                    }
                    this.previousReports.get(type).push({
                        file,
                        content,
                        timestamp: file.split('_')[0]
                    });
                }
            });
        } catch (error) {
            console.warn(theme.warning('Could not load previous reports:', error.message));
        }
    }

    formatMarkdown(results, analyzerType) {
        if (!results || !results.metrics) {
            throw new Error('Invalid or empty results provided');
        }

        const timestamp = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
        let markdown = this.generateHeader(analyzerType, timestamp);

        // Add table of contents
        markdown += this.generateTableOfContents(results);

        // Add executive summary
        markdown += this.generateExecutiveSummary(results);

        // Add detailed metrics
        markdown += this.generateMetricsSection(results);

        // Add findings
        markdown += this.generateFindingsSection(results);

        // Add recommendations
        markdown += this.generateRecommendationsSection(results);

        // Add trend analysis if available
        const trends = this.analyzeTrends(analyzerType, results);
        if (trends) {
            markdown += this.generateTrendsSection(trends);
        }

        // Add error analysis if present
        if (results.buildErrors || analyzerType === 'errors') {
            markdown += this.generateErrorAnalysisSection(results);
        }

        // Add visualizations
        markdown += this.generateVisualizations(results);

        // Add footer
        markdown += `\n\n---\n*Generated at: ${timestamp}*\n`;
        markdown += `*Next.js Analyzer Version: ${process.env.npm_package_version || 'development'}*\n`;

        return markdown;
    }

    generateHeader(analyzerType, timestamp) {
        const emoji = this.getAnalyzerEmoji(analyzerType);
        return `# ${emoji} Next.js ${this.capitalizeFirst(analyzerType)} Analysis Report
*Generated on: ${timestamp}*\n\n`;
    }

    generateTableOfContents(results) {
        let toc = `## Table of Contents\n\n`;
        toc += `1. [Executive Summary](#executive-summary)\n`;
        toc += `2. [Detailed Metrics](#detailed-metrics)\n`;
        toc += `3. [Key Findings](#key-findings)\n`;
        toc += `4. [Recommendations](#recommendations)\n`;

        if (this.hasTrends()) {
            toc += `5. [Trend Analysis](#trend-analysis)\n`;
        }

        if (results.buildErrors || results.errors) {
            toc += `6. [Error Analysis](#error-analysis)\n`;
        }

        toc += `7. [Visualizations](#visualizations)\n\n`;
        return toc;
    }

    generateExecutiveSummary(results) {
        let summary = `## Executive Summary\n\n`;
        
        // Add health score
        const healthScore = this.calculateHealthScore(results);
        summary += `### Health Score: ${healthScore}%\n`;
        summary += this.getHealthScoreEmoji(healthScore) + '\n\n';

        // Add key metrics summary
        summary += `### Key Metrics\n\n`;
        const keyMetrics = this.extractKeyMetrics(results);
        Object.entries(keyMetrics).forEach(([key, value]) => {
            summary += `- **${this.formatMetricName(key)}**: ${value}\n`;
        });

        // Add critical findings
        const criticalFindings = this.extractCriticalFindings(results);
        if (criticalFindings.length > 0) {
            summary += `\n### Critical Findings\n\n`;
            criticalFindings.forEach(finding => {
                summary += `- ⚠️ ${finding}\n`;
            });
        }

        return summary + '\n';
    }

    // ... (All previously shared methods remain the same)

    hasTrends() {
        return this.previousReports.size > 0;
    }

    extractKeyMetrics(results) {
        const metrics = {};
        
        // Extract top-level numeric metrics
        Object.entries(results.metrics).forEach(([key, value]) => {
            if (typeof value === 'number') {
                metrics[key] = value;
            } else if (typeof value === 'object') {
                // Extract first-level numeric values from objects
                Object.entries(value).forEach(([subKey, subValue]) => {
                    if (typeof subValue === 'number') {
                        metrics[`${key}_${subKey}`] = subValue;
                    }
                });
            }
        });

        return metrics;
    }

    extractCriticalFindings(results) {
        return (results.findings || [])
            .filter(f => f.severity === 'critical')
            .map(f => f.message || f.description || JSON.stringify(f));
    }

    generateTrendsSection(trends) {
        let section = `## Trend Analysis\n\n`;

        // Add metric trends
        section += `### Metric Trends\n\n`;
        Object.entries(trends.metrics).forEach(([metric, data]) => {
            section += `#### ${this.formatMetricName(metric)}\n`;
            section += `- Current: ${data.current}\n`;
            section += `- Average: ${data.average.toFixed(2)}\n`;
            section += `- Trend: ${data.trend} (${data.changePercent}%)\n\n`;
        });

        // Add finding trends
        section += `### Finding Trends\n\n`;
        section += `- Current Findings: ${trends.findings.current}\n`;
        section += `- Average Findings: ${trends.findings.average.toFixed(2)}\n`;
        section += `- Trend: ${trends.findings.trend} (${trends.findings.changePercent}%)\n\n`;

        // Add health score trend
        if (trends.healthScore) {
            section += `### Health Score Trend\n\n`;
            section += `- Current Score: ${trends.healthScore.current}%\n`;
            section += `- Average Score: ${trends.healthScore.average.toFixed(2)}%\n`;
            section += `- Trend: ${trends.healthScore.trend} (${trends.healthScore.changePercent}%)\n\n`;
        }

        return section;
    }

    // ... (rest of the methods from the second file remain the same)

    async saveAnalysis(results, analyzerType) {
        try {
            // Save main report
            const mainReport = await this.saveMainReport(results, analyzerType);

            // Save daily summary
            await this.saveDailySummary(results, analyzerType);

            // Save trend data
            await this.saveTrendData(results, analyzerType);

            // Save error report if necessary
            if (results.buildErrors || analyzerType === 'errors') {
                await this.saveErrorReport(results, analyzerType);
            }

            return mainReport;
        } catch (error) {
            console.error(theme.error(`Error saving analysis:`, error.message));
            throw error;
        }
    }

    getAnalyzerEmoji(type) {
        const emojiMap = {
            routes: '🛣️',
            data: '📊',
            performance: '⚡',
            errors: '🔍'
        };
        return emojiMap[type] || '📋';
    }

    calculateHealthScore(results) {
        let score = 100;
        
        // Deduct points for errors
        if (results.errors?.length > 0) {
            score -= results.errors.length * 5;
        }

        // Deduct points for critical findings
        const criticalFindings = results.findings?.filter(f => f.severity === 'critical') || [];
        score -= criticalFindings.length * 10;

        // Deduct points for warnings
        const warnings = results.findings?.filter(f => f.severity === 'warning') || [];
        score -= warnings.length * 3;

        return Math.max(0, Math.min(100, score));
    }

    getHealthScoreEmoji(score) {
        if (score >= 90) return '🌟 Excellent';
        if (score >= 80) return '✨ Very Good';
        if (score >= 70) return '👍 Good';
        if (score >= 60) return '🤔 Fair';
        return '⚠️ Needs Improvement';
    }

    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    formatMetricName(name) {
        return name
            .split(/(?=[A-Z])|_/)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    }
}

export default new AnalysisLogger();

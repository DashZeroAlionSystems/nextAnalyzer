const fs = require('fs');
const path = require('path');
const { format } = require('date-fns');

class AnalysisLogger {
    constructor() {
        this.logsDir = path.join(process.cwd(), 'logs');
        this.ensureLogsDirectory();
    }

    ensureLogsDirectory() {
        if (!fs.existsSync(this.logsDir)) {
            fs.mkdirSync(this.logsDir, { recursive: true });
        }
    }

    generateFileName(analyzerType) {
        const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
        return path.join(this.logsDir, `${timestamp}_${analyzerType}.md`);
    }

    formatMarkdown(results, analyzerType) {
        const timestamp = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
        
        let markdown = `# Next.js Analysis Report: ${analyzerType}\n`;
        markdown += `Generated: ${timestamp}\n\n`;

        if (results.metrics && Object.keys(results.metrics).length > 0) {
            markdown += '## Metrics\n\n';
            for (const [key, value] of Object.entries(results.metrics)) {
                markdown += `- **${key}**: ${value}\n`;
            }
            markdown += '\n';
        }

        if (results.findings && results.findings.length > 0) {
            markdown += '## Findings\n\n';
            results.findings.forEach((finding, index) => {
                if (typeof finding === 'string') {
                    markdown += `${index + 1}. ${finding}\n`;
                } else {
                    markdown += `${index + 1}. ${Object.entries(finding)
                        .map(([key, value]) => `**${key}**: ${value}`)
                        .join(', ')}\n`;
                }
            });
            markdown += '\n';
        }

        if (results.recommendations && results.recommendations.length > 0) {
            markdown += '## Recommendations\n\n';
            results.recommendations.forEach((rec, index) => {
                markdown += `${index + 1}. ${rec}\n`;
            });
            markdown += '\n';
        }

        return markdown;
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

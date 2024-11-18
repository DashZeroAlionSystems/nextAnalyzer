// src/utils/buildErrorReporter.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import boxen from 'boxen';
import { theme, emoji } from './themes.js';
import { BuildErrorUtils } from './buildErrorPatterns.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class BuildErrorReporter {
    constructor(outputDir = 'logs') {
        this.outputDir = outputDir;
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
    }

    generateReport(errors, projectRoot) {
        const timestamp = new Date().toISOString();
        const reportData = {
            timestamp,
            projectRoot,
            summary: this.generateSummary(errors),
            errors: this.categorizeErrors(errors),
            solutions: this.generateSolutions(errors)
        };

        // Save report
        const reportPath = this.saveReport(reportData);

        // Print console report
        this.printConsoleReport(reportData);

        return {
            path: reportPath,
            data: reportData
        };
    }

    generateSummary(errors) {
        return {
            total: errors.length,
            bySeverity: this.countBySeverity(errors),
            byCategory: this.countByCategory(errors)
        };
    }

    countBySeverity(errors) {
        return errors.reduce((counts, error) => {
            const severity = error.severity || 'unknown';
            counts[severity] = (counts[severity] || 0) + 1;
            return counts;
        }, {});
    }

    countByCategory(errors) {
        return errors.reduce((counts, error) => {
            const category = BuildErrorUtils.getCategory(error.type);
            counts[category] = (counts[category] || 0) + 1;
            return counts;
        }, {});
    }

    categorizeErrors(errors) {
        return errors.reduce((categories, error) => {
            const category = BuildErrorUtils.getCategory(error.type);
            if (!categories[category]) {
                categories[category] = [];
            }
            categories[category].push(error);
            return categories;
        }, {});
    }

    generateSolutions(errors) {
        const solutions = new Set();
        
        errors.forEach(error => {
            const solution = BuildErrorUtils.generateSolution(error.type, {
                file: error.file,
                line: error.line
            });
            if (solution) {
                solutions.add(JSON.stringify(solution));
            }
        });

        return Array.from(solutions).map(s => JSON.parse(s));
    }

    saveReport(reportData) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const reportPath = path.join(this.outputDir, `build-error-report-${timestamp}.json`);
        
        fs.writeFileSync(
            reportPath,
            JSON.stringify(reportData, null, 2)
        );

        return reportPath;
    }

    printConsoleReport(reportData) {
        console.log('\n' + boxen(
            chalk.bold('Next.js Build Error Report'),
            {
                padding: 1,
                margin: 1,
                borderStyle: 'double',
                borderColor: 'cyan'
            }
        ));

        // Print summary
        console.log(chalk.bold('\nSummary:'));
        console.log(`Total Errors: ${chalk.red(reportData.summary.total)}`);
        
        // Print errors by severity
        console.log(chalk.bold('\nErrors by Severity:'));
        Object.entries(reportData.summary.bySeverity).forEach(([severity, count]) => {
            console.log(`${this.getSeverityIcon(severity)} ${severity}: ${count}`);
        });

        // Print errors by category
        console.log(chalk.bold('\nErrors by Category:'));
        Object.entries(reportData.summary.byCategory).forEach(([category, count]) => {
            console.log(`${this.getCategoryIcon(category)} ${category}: ${count}`);
        });

        // Print solutions if available
        if (reportData.solutions.length > 0) {
            console.log(chalk.bold('\nRecommended Solutions:'));
            reportData.solutions.forEach(solution => {
                console.log(boxen(
                    `${chalk.bold(solution.title)}\n\n` +
                    `${solution.steps.map(step => `• ${step}`).join('\n')}` +
                    (solution.command ? `\n\n${chalk.gray('Run:')} ${chalk.cyan(solution.command)}` : ''),
                    {
                        padding: 1,
                        margin: 1,
                        borderStyle: 'round',
                        borderColor: 'yellow'
                    }
                ));
            });
        }

        console.log(chalk.gray(`\nDetailed report saved to: ${reportData.path}\n`));
    }

    getSeverityIcon(severity) {
        const icons = {
            high: '🔴',
            medium: '🟡',
            low: '🟢',
            unknown: '⚪'
        };
        return icons[severity] || icons.unknown;
    }

    getCategoryIcon(category) {
        const icons = {
            dependency: '📦',
            typescript: '📘',
            build: '🏗️',
            config: '⚙️',
            performance: '⚡',
            unknown: '❓'
        };
        return icons[category] || icons.unknown;
    }
}

export default BuildErrorReporter;
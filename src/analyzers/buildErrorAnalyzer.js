// src/analyzers/buildErrorAnalyzer.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { theme, emoji } from '../utils/themes.js';
import ora from 'ora';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class BuildErrorAnalyzer {
    constructor() {
        this.steps = [
            { name: 'Configuration Check', emoji: '⚙️' },
            { name: 'Dependency Analysis', emoji: '📦' },
            { name: 'Build Process', emoji: '🏗️' },
            { name: 'Error Analysis', emoji: '🔍' }
        ];
    }

    async analyze(projectRoot) {
        const totalSteps = this.steps.length;
        let currentStep = 0;

        const spinner = ora('Starting build analysis...').start();

        try {
            const results = {
                errors: [],
                warnings: [],
                suggestions: []
            };

            // Analyze next.config.js
            const configErrors = await this.analyzeNextConfig(projectRoot);
            results.errors.push(...configErrors);

            // Analyze dependencies
            const depErrors = await this.analyzeDependencies(projectRoot);
            results.errors.push(...depErrors);

            // Run test build
            const buildErrors = await this.runTestBuild(projectRoot);
            results.errors.push(...buildErrors);

            spinner.succeed('Build analysis complete');
            return results;
        } catch (error) {
            spinner.fail('Build analysis failed');
            throw error;
        }
    }

    async analyzeNextConfig(projectRoot) {
        const errors = [];
        const configPath = path.join(projectRoot, 'next.config.js');
        
        try {
            if (!fs.existsSync(configPath)) {
                errors.push({
                    type: 'config',
                    severity: 'warning',
                    message: 'next.config.js not found'
                });
                return errors;
            }

            const content = fs.readFileSync(configPath, 'utf8');

            // Check for common configuration issues
            if (content.includes('webpack5: false')) {
                errors.push({
                    type: 'config',
                    severity: 'warning',
                    message: 'Using deprecated webpack 4',
                    suggestion: 'Update to webpack 5 for better performance'
                });
            }

            if (!content.includes('swcMinify')) {
                errors.push({
                    type: 'config',
                    severity: 'info',
                    message: 'SWC minification not configured',
                    suggestion: 'Enable swcMinify for faster builds'
                });
            }
        } catch (error) {
            errors.push({
                type: 'config',
                severity: 'error',
                message: `Error reading next.config.js: ${error.message}`
            });
        }

        return errors;
    }

    async analyzeDependencies(projectRoot) {
        const errors = [];
        const packagePath = path.join(projectRoot, 'package.json');

        try {
            if (!fs.existsSync(packagePath)) {
                errors.push({
                    type: 'dependency',
                    severity: 'error',
                    message: 'package.json not found'
                });
                return errors;
            }

            const content = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

            // Check Next.js version
            const nextVersion = content.dependencies?.next || content.devDependencies?.next;
            if (!nextVersion) {
                errors.push({
                    type: 'dependency',
                    severity: 'error',
                    message: 'Next.js dependency not found'
                });
            } else if (!nextVersion.startsWith('13') && !nextVersion.startsWith('14')) {
                errors.push({
                    type: 'dependency',
                    severity: 'warning',
                    message: `Using older Next.js version: ${nextVersion}`,
                    suggestion: 'Update to Next.js 13 or 14 for latest features'
                });
            }

            // Check for peer dependencies
            const reactVersion = content.dependencies?.react;
            if (!reactVersion) {
                errors.push({
                    type: 'dependency',
                    severity: 'error',
                    message: 'React dependency not found'
                });
            }
        } catch (error) {
            errors.push({
                type: 'dependency',
                severity: 'error',
                message: `Error analyzing dependencies: ${error.message}`
            });
        }

        return errors;
    }

    async runTestBuild(projectRoot) {
        const errors = [];
        try {
            const { execSync } = await import('child_process');
            execSync('npm run build', {
                cwd: projectRoot,
                stdio: 'pipe'
            });
        } catch (error) {
            errors.push({
                type: 'build',
                severity: 'error',
                message: error.message,
                output: error.stdout?.toString() || '',
                error: error.stderr?.toString() || ''
            });
        }
        return errors;
    }
}

export default BuildErrorAnalyzer;
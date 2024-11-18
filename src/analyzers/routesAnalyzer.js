// src/analyzers/routesAnalyzer.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ora from 'ora';
import { theme, emoji } from '../utils/themes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class RoutesAnalyzer {
    constructor() {
        this.steps = [
            { name: 'Routes Structure', emoji: '📁' },
            { name: 'API Routes', emoji: '⚡' },
            { name: 'Server Actions', emoji: '🔄' },
            { name: 'Middleware', emoji: '🔗' }
        ];
    }

    async analyze(projectRoot) {
        const spinner = ora('Analyzing routes...').start();

        try {
            const results = {
                routes: {
                    pages: [],
                    api: [],
                    middleware: []
                },
                metrics: {
                    totalRoutes: 0,
                    staticRoutes: 0,
                    dynamicRoutes: 0,
                    apiRoutes: 0
                },
                findings: []
            };

            // Analyze app directory
            await this.analyzeAppDirectory(projectRoot, results);
            
            // Analyze pages directory
            await this.analyzePagesDirectory(projectRoot, results);

            spinner.succeed('Routes analysis complete');
            return results;
        } catch (error) {
            spinner.fail('Routes analysis failed');
            throw error;
        }
    }

    async analyzeAppDirectory(projectRoot, results) {
        const appDir = path.join(projectRoot, 'app');
        if (fs.existsSync(appDir)) {
            const files = fs.readdirSync(appDir);
            for (const file of files) {
                const filePath = path.join(appDir, file);
                if (fs.statSync(filePath).isDirectory()) {
                    results.routes.pages.push(file);
                }
            }
        }
    }

    async analyzePagesDirectory(projectRoot, results) {
        const pagesDir = path.join(projectRoot, 'pages');
        if (fs.existsSync(pagesDir)) {
            const files = fs.readdirSync(pagesDir);
            for (const file of files) {
                const filePath = path.join(pagesDir, file);
                if (fs.statSync(filePath).isDirectory()) {
                    results.routes.pages.push(file);
                } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
                    results.routes.pages.push(file);
                }
            }
        }
    }
}

export default RoutesAnalyzer;
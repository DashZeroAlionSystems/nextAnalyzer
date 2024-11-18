// src/analyzers/performanceAnalyzer.js
const fs = require('fs');
const path = require('path');
const ora = require('ora');
const { theme, emoji } = require('../utils/themes');
const progress = require('../utils/progress');
const logger = require('../utils/logger');

class PerformanceAnalyzer {
    constructor() {
        this.steps = [
            { name: 'Bundle Size', emoji: '📦' },
            { name: 'Image Optimization', emoji: '🖼️' },
            { name: 'Component Load Time', emoji: '⚡' },
            { name: 'Code Splitting', emoji: '✂️' }
        ];
    }

    async analyze(projectRoot) {
        const totalSteps = this.steps.length;
        let currentStep = 0;

        progress.start(totalSteps);

        const results = {
            metrics: {
                bundleSize: {
                    total: 0,
                    js: 0,
                    css: 0,
                    images: 0
                },
                components: {
                    total: 0,
                    clientComponents: 0,
                    serverComponents: 0,
                    heavyComponents: 0
                },
                images: {
                    total: 0,
                    optimized: 0,
                    unoptimized: 0
                },
                codeSplitting: {
                    dynamicImports: 0,
                    lazyComponents: 0
                }
            },
            findings: [],
            recommendations: []
        };

        try {
            for (const step of this.steps) {
                currentStep++;
                progress.update(currentStep, totalSteps, `${step.emoji} ${step.name}`);

                const stepResults = await this.executeStep(step.name, projectRoot);
                this.mergeResults(results, stepResults);

                await new Promise(resolve => setTimeout(resolve, 800));
            }

            const logFile = await logger.saveAnalysis(results, 'performance');
            results.logFile = logFile;

            return results;

        } catch (error) {
            throw error;
        } finally {
            progress.stop();
        }
    }

    async executeStep(stepName, projectRoot) {
        const results = {
            metrics: {},
            findings: [],
            recommendations: []
        };

        switch (stepName) {
            case 'Bundle Size':
                await this.analyzeBundleSize(projectRoot, results);
                break;
            case 'Image Optimization':
                await this.analyzeImageOptimization(projectRoot, results);
                break;
            case 'Component Load Time':
                await this.analyzeComponentLoadTime(projectRoot, results);
                break;
            case 'Code Splitting':
                await this.analyzeCodeSplitting(projectRoot, results);
                break;
        }

        return results;
    }

    async analyzeBundleSize(projectRoot, results) {
        const spinner = ora('Analyzing bundle size...').start();
        
        try {
            const buildDir = path.join(projectRoot, '.next');
            if (!fs.existsSync(buildDir)) {
                spinner.warn('No build directory found. Run next build first.');
                return;
            }

            results.metrics.bundleSize = await this.calculateBundleMetrics(buildDir);
            
            // Add recommendations based on bundle size
            if (results.metrics.bundleSize.js > 250000) { // 250KB
                results.recommendations.push('Consider code splitting for large JavaScript bundles');
            }
            if (results.metrics.bundleSize.css > 100000) { // 100KB
                results.recommendations.push('Consider optimizing CSS bundles');
            }

            spinner.succeed('Bundle size analysis complete');
        } catch (error) {
            spinner.fail('Error analyzing bundle size');
            throw error;
        }
    }

    async analyzeImageOptimization(projectRoot, results) {
        const spinner = ora('Analyzing image optimization...').start();
        
        try {
            const imageStats = await this.scanForImages(projectRoot);
            results.metrics.images = imageStats;

            if (imageStats.unoptimized > 0) {
                results.recommendations.push(
                    `Optimize ${imageStats.unoptimized} images using next/image`
                );
            }

            spinner.succeed('Image optimization analysis complete');
        } catch (error) {
            spinner.fail('Error analyzing images');
            throw error;
        }
    }

    async analyzeComponentLoadTime(projectRoot, results) {
        const spinner = ora('Analyzing component load time...').start();
        
        try {
            const components = await this.scanComponents(projectRoot);
            results.metrics.components = {
                total: 0,
                clientComponents: 0,
                serverComponents: 0,
                heavyComponents: 0
            };

            spinner.succeed('Component analysis complete');
        } catch (error) {
            spinner.fail('Error analyzing components');
            throw error;
        }
    }

    async scanComponents(projectRoot) {
        const stats = { total: 0, clientComponents: 0, serverComponents: 0, heavyComponents: 0 };
        
        // Basic implementation
        const scanDir = (dir) => {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                
                if (entry.isDirectory() && !entry.name.startsWith('.')) {
                    scanDir(fullPath);
                } else if (entry.name.endsWith('.js') || entry.name.endsWith('.jsx')) {
                    stats.total++;
                    const content = fs.readFileSync(fullPath, 'utf8');
                    if (content.length > 5000) stats.heavyComponents++;
                    if (content.includes('use client')) stats.clientComponents++;
                    else stats.serverComponents++;
                }
            }
        };

        scanDir(path.join(projectRoot, 'src'));
        return stats;
    }

    async analyzeCodeSplitting(projectRoot, results) {
        const spinner = ora('Analyzing code splitting...').start();
        
        try {
            const splitting = await this.analyzeDynamicImports(projectRoot);
            results.metrics.codeSplitting = splitting;

            if (splitting.dynamicImports === 0) {
                results.recommendations.push(
                    'Consider implementing dynamic imports for better code splitting'
                );
            }

            spinner.succeed('Code splitting analysis complete');
        } catch (error) {
            spinner.fail('Error analyzing code splitting');
            throw error;
        }
    }

    async analyzeDynamicImports(projectRoot) {
        const stats = { dynamicImports: 0, lazyComponents: 0 };
        
        const scanDir = (dir) => {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                
                if (entry.isDirectory() && !entry.name.startsWith('.')) {
                    scanDir(fullPath);
                } else if (entry.name.endsWith('.js') || entry.name.endsWith('.jsx')) {
                    const content = fs.readFileSync(fullPath, 'utf8');
                    if (content.includes('import(')) stats.dynamicImports++;
                    if (content.includes('React.lazy') || content.includes('lazy(')) stats.lazyComponents++;
                }
            }
        };

        scanDir(path.join(projectRoot, 'src'));
        return stats;
    }

    // Helper methods
    async calculateBundleMetrics(buildDir) {
        const metrics = { total: 0, js: 0, css: 0, images: 0 };
        
        const calculateSize = (filePath) => {
            try {
                const stats = fs.statSync(filePath);
                return stats.size;
            } catch {
                return 0;
            }
        };

        const scanDir = (dir) => {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                
                if (entry.isDirectory()) {
                    scanDir(fullPath);
                } else {
                    const size = calculateSize(fullPath);
                    metrics.total += size;
                    
                    if (entry.name.endsWith('.js')) metrics.js += size;
                    if (entry.name.endsWith('.css')) metrics.css += size;
                    if (/\.(jpg|jpeg|png|gif|webp)$/.test(entry.name)) metrics.images += size;
                }
            }
        };

        scanDir(path.join(buildDir, 'static'));
        return metrics;
    }

    async scanForImages(projectRoot) {
        const stats = { total: 0, optimized: 0, unoptimized: 0 };
        
        const scanDir = (dir) => {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                
                if (entry.isDirectory() && !entry.name.startsWith('.')) {
                    scanDir(fullPath);
                } else if (/\.(jpg|jpeg|png|gif|webp)$/.test(entry.name)) {
                    stats.total++;
                    
                    const content = fs.readFileSync(fullPath, 'utf8');
                    if (content.includes('next/image')) {
                        stats.optimized++;
                    } else {
                        stats.unoptimized++;
                    }
                }
            }
        };

        scanDir(path.join(projectRoot, 'src'));
        return stats;
    }

    mergeResults(target, source) {
        // Merge metrics
        for (const [key, value] of Object.entries(source.metrics)) {
            if (typeof value === 'object') {
                target.metrics[key] = { ...target.metrics[key], ...value };
            } else {
                target.metrics[key] = (target.metrics[key] || 0) + value;
            }
        }

        // Merge findings and recommendations
        target.findings.push(...source.findings);
        target.recommendations.push(...source.recommendations);
    }
}

module.exports = PerformanceAnalyzer;
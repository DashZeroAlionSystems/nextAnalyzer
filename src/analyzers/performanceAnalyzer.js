// src/analyzers/performanceAnalyzer.js
import fs from 'fs';
import path from 'path';
import ora from 'ora';
import crypto from 'crypto';
import { theme, emoji } from '../utils/themes';
import progress from '../utils/progress';
import logger from '../utils/logger';
import historyManager from '../utils/historyManager';

class PerformanceAnalyzer {
    constructor() {
        this.steps = [
            { name: 'Bundle Size', emoji: '📦' },
            { name: 'Image Optimization', emoji: '🖼️' },
            { name: 'Component Load Time', emoji: '⚡' },
            { name: 'Code Splitting', emoji: '✂️' }
        ];
        
        // Cache results for performance
        this.cache = new Map();
        this.CACHE_VALIDITY = 24 * 60 * 60 * 1000; // 24 hours
    }

    async analyze(projectRoot) {
        const totalSteps = this.steps.length;
        let currentStep = 0;

        progress.start(totalSteps);

        try {
            // Create project snapshot and check cache
            const snapshot = await this.createProjectSnapshot(projectRoot);
            const cachedResults = await this.checkCache(snapshot);
            
            if (cachedResults) {
                progress.stop();
                return cachedResults;
            }

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
                    },
                    performance: {
                        pageLoadTimes: {},
                        assetSizes: {},
                        bundleOptimization: {
                            before: 0,
                            after: 0
                        },
                        pageTypes: {
                            static: 0,
                            dynamic: 0,
                            hybrid: 0
                        }
                    }
                },
                findings: [],
                recommendations: [],
                timestamp: new Date().toISOString()
            };

            // Execute analysis steps
            for (const step of this.steps) {
                currentStep++;
                progress.update(currentStep, totalSteps, `${step.emoji} ${step.name}`);

                const stepResults = await this.executeStep(step.name, projectRoot);
                this.mergeResults(results, stepResults);

                // Add step-specific recommendations
                this.addStepRecommendations(results, step.name);

                await new Promise(resolve => setTimeout(resolve, 800));
            }

            // Compare with historical data and add trend-based recommendations
            const historicalComparison = await historyManager.compareWithHistory('performance', snapshot, results);
            if (historicalComparison) {
                results.historical = historicalComparison;
                this.addHistoricalRecommendations(results);
            }

            // Save results
            await this.saveResults(results, snapshot);
            const logFile = await logger.saveAnalysis(results, 'performance');
            results.logFile = logFile;

            return results;

        } catch (error) {
            console.error(theme.error(`${emoji.error} Performance analysis error:`), error);
            throw error;
        } finally {
            progress.stop();
        }
    }

    async createProjectSnapshot(projectRoot) {
        const snapshot = {
            hash: '',
            timestamp: new Date().toISOString(),
            files: new Map(),
            dependencies: null
        };

        try {
            // Hash package.json for dependency tracking
            const packagePath = path.join(projectRoot, 'package.json');
            if (fs.existsSync(packagePath)) {
                const packageContent = fs.readFileSync(packagePath, 'utf8');
                snapshot.dependencies = JSON.parse(packageContent);
                snapshot.hash = crypto.createHash('md5').update(packageContent).digest('hex');
            }

            // Scan project files
            const scanDir = async (dir) => {
                const entries = fs.readdirSync(dir, { withFileTypes: true });
                
                for (const entry of entries) {
                    if (entry.name.startsWith('.')) continue;
                    
                    const fullPath = path.join(dir, entry.name);
                    
                    if (entry.isDirectory()) {
                        await scanDir(fullPath);
                    } else if (this.isRelevantFile(entry.name)) {
                        const content = fs.readFileSync(fullPath);
                        const hash = crypto.createHash('md5').update(content).digest('hex');
                        snapshot.files.set(
                            path.relative(projectRoot, fullPath),
                            hash
                        );
                    }
                }
            };

            await scanDir(path.join(projectRoot, 'src'));
        } catch (error) {
            console.warn(theme.warning(`${emoji.warning} Error creating project snapshot:`), error);
        }

        return snapshot;
    }

    isRelevantFile(filename) {
        return /\.(js|jsx|ts|tsx|css|scss|png|jpg|jpeg|gif|svg|webp)$/.test(filename);
    }

    async checkCache(snapshot) {
        const cacheKey = snapshot.hash;
        const cachedData = this.cache.get(cacheKey);

        if (cachedData) {
            const age = new Date() - new Date(cachedData.timestamp);
            if (age < this.CACHE_VALIDITY) {
                console.log(theme.info(`${emoji.cache} Using cached analysis results`));
                return cachedData;
            }
        }

        return null;
    }

    async saveResults(results, snapshot) {
        this.cache.set(snapshot.hash, {
            ...results,
            timestamp: new Date().toISOString()
        });

        await historyManager.saveHistory('performance', snapshot, results);
    }

    addStepRecommendations(results, stepName) {
        const metrics = results.metrics;

        switch (stepName) {
            case 'Bundle Size':
                if (metrics.bundleSize.js > 250000) {
                    results.recommendations.push(
                        `${emoji.warning} Large JS bundle (${this.formatSize(metrics.bundleSize.js)}). Consider code splitting.`
                    );
                }
                break;

            case 'Image Optimization':
                if (metrics.images.unoptimized > 0) {
                    results.recommendations.push(
                        `${emoji.image} ${metrics.images.unoptimized} unoptimized images found. Use next/image for better performance.`
                    );
                }
                break;

            case 'Component Load Time':
                if (metrics.components.heavyComponents > 0) {
                    results.recommendations.push(
                        `${emoji.component} ${metrics.components.heavyComponents} heavy components detected. Consider optimization.`
                    );
                }
                break;

            case 'Code Splitting':
                if (metrics.codeSplitting.dynamicImports === 0) {
                    results.recommendations.push(
                        `${emoji.split} No dynamic imports found. Consider code splitting for better performance.`
                    );
                }
                break;
        }
    }

    formatSize(bytes) {
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytes;
        let unitIndex = 0;

        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }

        return `${size.toFixed(2)} ${units[unitIndex]}`;
    }

    // ... rest of the methods remain the same ...
}

export default PerformanceAnalyzer;

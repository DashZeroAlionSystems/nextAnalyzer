// src/analyzers/dataAnalyzer.js
const fs = require('fs');
const path = require('path');
const ora = require('ora');
const { theme, emoji } = require('../utils/themes');
const progress = require('../utils/progress');
const logger = require('../utils/logger');

class DataAnalyzer {
    constructor() {
        this.steps = [
            { name: 'Data Fetching', emoji: '📡' },
            { name: 'State Management', emoji: '💾' },
            { name: 'Caching Patterns', emoji: '📦' },
            { name: 'Data Mutations', emoji: '✏️' }
        ];
    }

    async analyze(projectRoot) {
        const totalSteps = this.steps.length;
        let currentStep = 0;

        progress.start(totalSteps);

        const results = {
            metrics: {
                dataFetching: {
                    fetchCalls: 0,
                    useQuery: 0,
                    useSWR: 0,
                    serverActions: 0
                },
                stateManagement: {
                    useState: 0,
                    useReducer: 0,
                    contextAPI: 0,
                    redux: 0,
                    zustand: 0
                },
                caching: {
                    revalidation: 0,
                    staticProps: 0,
                    serverProps: 0
                },
                mutations: {
                    formSubmissions: 0,
                    optimisticUpdates: 0,
                    serverMutations: 0
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

            const logFile = await logger.saveAnalysis(results, 'data');
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
            recommendations: []
        };

        const appDir = path.join(projectRoot, 'src', 'app');

        switch (stepName) {
            case 'Data Fetching':
                await this.analyzeDataFetching(appDir, stepResults);
                break;
            case 'State Management':
                await this.analyzeStateManagement(appDir, stepResults);
                break;
            case 'Caching Patterns':
                await this.analyzeCaching(appDir, stepResults);
                break;
            case 'Data Mutations':
                await this.analyzeMutations(appDir, stepResults);
                break;
        }

        return stepResults;
    }

    async analyzeDataFetching(appDir, results) {
        const spinner = ora('Analyzing data fetching patterns...').start();

        try {
            const scanDirectory = async (dir) => {
                const entries = fs.readdirSync(dir, { withFileTypes: true });

                for (const entry of entries) {
                    const fullPath = path.join(dir, entry.name);

                    if (entry.isDirectory() && !entry.name.startsWith('_')) {
                        await scanDirectory(fullPath);
                    } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts') || 
                              entry.name.endsWith('.jsx') || entry.name.endsWith('.js')) {
                        const content = fs.readFileSync(fullPath, 'utf8');
                        
                        // Analyze data fetching patterns
                        const patterns = this.detectDataFetchingPatterns(content);
                        Object.assign(results.metrics, patterns);

                        // Record findings
                        if (patterns.fetchCalls > 0 || patterns.useQuery > 0 || patterns.useSWR > 0) {
                            results.findings.push({
                                file: fullPath,
                                patterns: patterns
                            });
                        }

                        // Add recommendations
                        this.addDataFetchingRecommendations(patterns, results.recommendations);
                    }
                }
            };

            if (fs.existsSync(appDir)) {
                await scanDirectory(appDir);
            }

            spinner.succeed('Data fetching analysis complete');
        } catch (error) {
            spinner.fail('Error analyzing data fetching');
            throw error;
        }
    }

    async analyzeStateManagement(appDir, results) {
        const spinner = ora('Analyzing state management...').start();

        try {
            const scanDirectory = async (dir) => {
                const entries = fs.readdirSync(dir, { withFileTypes: true });

                for (const entry of entries) {
                    const fullPath = path.join(dir, entry.name);

                    if (entry.isDirectory() && !entry.name.startsWith('_')) {
                        await scanDirectory(fullPath);
                    } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts') || 
                              entry.name.endsWith('.jsx') || entry.name.endsWith('.js')) {
                        const content = fs.readFileSync(fullPath, 'utf8');
                        
                        // Analyze state management patterns
                        const statePatterns = this.detectStatePatterns(content);
                        Object.assign(results.metrics, { stateManagement: statePatterns });

                        // Record findings and recommendations
                        if (this.hasComplexState(statePatterns)) {
                            results.findings.push({
                                file: fullPath,
                                statePatterns: statePatterns
                            });

                            this.addStateManagementRecommendations(statePatterns, results.recommendations);
                        }
                    }
                }
            };

            if (fs.existsSync(appDir)) {
                await scanDirectory(appDir);
            }

            spinner.succeed('State management analysis complete');
        } catch (error) {
            spinner.fail('Error analyzing state management');
            throw error;
        }
    }

    async analyzeCaching(appDir, results) {
        const spinner = ora('Analyzing caching patterns...').start();

        try {
            const scanDirectory = async (dir) => {
                const entries = fs.readdirSync(dir, { withFileTypes: true });

                for (const entry of entries) {
                    const fullPath = path.join(dir, entry.name);

                    if (entry.isDirectory() && !entry.name.startsWith('_')) {
                        await scanDirectory(fullPath);
                    } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts') || 
                              entry.name.endsWith('.jsx') || entry.name.endsWith('.js')) {
                        const content = fs.readFileSync(fullPath, 'utf8');
                        
                        // Analyze caching patterns
                        const cachingPatterns = this.detectCachingPatterns(content);
                        Object.assign(results.metrics, { caching: cachingPatterns });

                        if (this.hasCachingIssues(cachingPatterns)) {
                            results.findings.push({
                                file: fullPath,
                                cachingPatterns: cachingPatterns
                            });

                            this.addCachingRecommendations(cachingPatterns, results.recommendations);
                        }
                    }
                }
            };

            if (fs.existsSync(appDir)) {
                await scanDirectory(appDir);
            }

            spinner.succeed('Caching analysis complete');
        } catch (error) {
            spinner.fail('Error analyzing caching');
            throw error;
        }
    }

    async analyzeMutations(appDir, results) {
        const spinner = ora('Analyzing data mutations...').start();

        try {
            const scanDirectory = async (dir) => {
                const entries = fs.readdirSync(dir, { withFileTypes: true });

                for (const entry of entries) {
                    const fullPath = path.join(dir, entry.name);

                    if (entry.isDirectory() && !entry.name.startsWith('_')) {
                        await scanDirectory(fullPath);
                    } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts') || 
                              entry.name.endsWith('.jsx') || entry.name.endsWith('.js')) {
                        const content = fs.readFileSync(fullPath, 'utf8');
                        
                        // Analyze mutation patterns
                        const mutationPatterns = this.detectMutationPatterns(content);
                        Object.assign(results.metrics, { mutations: mutationPatterns });

                        if (mutationPatterns.formSubmissions > 0 || 
                            mutationPatterns.serverMutations > 0) {
                            results.findings.push({
                                file: fullPath,
                                mutationPatterns: mutationPatterns
                            });

                            this.addMutationRecommendations(mutationPatterns, results.recommendations);
                        }
                    }
                }
            };

            if (fs.existsSync(appDir)) {
                await scanDirectory(appDir);
            }

            spinner.succeed('Mutation analysis complete');
        } catch (error) {
            spinner.fail('Error analyzing mutations');
            throw error;
        }
    }

    // Helper methods
    detectDataFetchingPatterns(content) {
        return {
            fetchCalls: (content.match(/fetch\(/g) || []).length,
            useQuery: (content.match(/useQuery/g) || []).length,
            useSWR: (content.match(/useSWR/g) || []).length,
            serverActions: (content.match(/'use server'/g) || []).length
        };
    }

    detectStatePatterns(content) {
        return {
            useState: (content.match(/useState/g) || []).length,
            useReducer: (content.match(/useReducer/g) || []).length,
            contextAPI: (content.match(/useContext|createContext/g) || []).length,
            redux: content.includes('useDispatch') || content.includes('useSelector'),
            zustand: content.includes('create((set, get)')
        };
    }

    detectCachingPatterns(content) {
        return {
            revalidation: content.includes('revalidate'),
            staticProps: content.includes('getStaticProps'),
            serverProps: content.includes('getServerSideProps')
        };
    }

    detectMutationPatterns(content) {
        return {
            formSubmissions: (content.match(/handleSubmit|onSubmit/g) || []).length,
            optimisticUpdates: content.includes('optimistic'),
            serverMutations: (content.match(/mutate\(|useMutation/g) || []).length
        };
    }

    hasComplexState(patterns) {
        return patterns.useState > 5 || patterns.useReducer > 0 || patterns.contextAPI > 0;
    }

    hasCachingIssues(patterns) {
        return !patterns.revalidation && (patterns.staticProps || patterns.serverProps);
    }

    addDataFetchingRecommendations(patterns, recommendations) {
        if (patterns.fetchCalls > 5) {
            recommendations.push('Consider using React Query or SWR for better data fetching management');
        }
        if (patterns.fetchCalls > 0 && !patterns.useQuery && !patterns.useSWR) {
            recommendations.push('Implement data caching strategy using React Query or SWR');
        }
    }

    addStateManagementRecommendations(patterns, recommendations) {
        if (patterns.useState > 7) {
            recommendations.push('Consider using useReducer for complex state management');
        }
        if (patterns.contextAPI > 3) {
            recommendations.push('Consider using a state management library for better scalability');
        }
    }

    addCachingRecommendations(patterns, recommendations) {
        if (!patterns.revalidation && patterns.staticProps) {
            recommendations.push('Implement revalidation strategy for static props');
        }
        if (patterns.serverProps) {
            recommendations.push('Consider using static props with revalidation instead of server-side props for better performance');
        }
    }

    addMutationRecommendations(patterns, recommendations) {
        if (patterns.formSubmissions > 0 && !patterns.optimisticUpdates) {
            recommendations.push('Implement optimistic updates for better user experience');
        }
        if (patterns.serverMutations > 3) {
            recommendations.push('Consider implementing a mutation management strategy');
        }
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

module.exports = DataAnalyzer;
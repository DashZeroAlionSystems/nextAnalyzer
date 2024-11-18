import fs from 'fs';
import path from 'path';
import ora from 'ora';
import { theme, emoji } from '../utils/themes';
import progress from '../utils/progress';
import logger from '../utils/logger';
import historyManager from '../utils/historyManager';

class DataAnalyzer {
    constructor() {
        this.steps = [
            { name: 'Data Fetching', emoji: '📡' },
            { name: 'State Management', emoji: '💾' },
            { name: 'Caching Patterns', emoji: '📦' },
            { name: 'Data Mutations', emoji: '✏️' }
        ];
        this.analysisCache = new Map();
    }

    async analyze(projectRoot) {
        const totalSteps = this.steps.length;
        let currentStep = 0;

        progress.start(totalSteps);

        // Create a snapshot of data patterns for comparison
        const dataSnapshot = await this.createDataSnapshot(projectRoot);
        
        // Check history for recent analysis
        const cachedResults = await historyManager.getHistory('data', dataSnapshot);
        if (cachedResults) {
            const cacheAge = new Date() - new Date(cachedResults.timestamp);
            const CACHE_VALIDITY = 6 * 60 * 60 * 1000; // 6 hours - shorter for data analysis
            
            if (cacheAge < CACHE_VALIDITY) {
                progress.stop();
                return cachedResults.results;
            }
        }

        const results = {
            metrics: {
                dataFetching: {
                    fetchCalls: 0,
                    useQuery: 0,
                    useSWR: 0,
                    serverActions: 0,
                    uniqueEndpoints: new Set()
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
                    serverProps: 0,
                    cacheHits: new Set()
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

            // Convert Sets to arrays for serialization
            results.metrics.dataFetching.uniqueEndpoints = Array.from(results.metrics.dataFetching.uniqueEndpoints);
            results.metrics.caching.cacheHits = Array.from(results.metrics.caching.cacheHits);

            // Compare with historical data
            if (cachedResults) {
                const comparison = await historyManager.compareWithHistory('data', dataSnapshot, results);
                if (comparison) {
                    results.historical = comparison;
                    this.addHistoricalRecommendations(results);
                }
            }

            // Save new results to history
            await historyManager.saveHistory('data', dataSnapshot, results);

            const logFile = await logger.saveAnalysis(results, 'data');
            results.logFile = logFile;

            return results;

        } catch (error) {
            throw error;
        } finally {
            progress.stop();
        }
    }

    async createDataSnapshot(projectRoot) {
        const snapshot = {
            dataPatterns: {},
            endpoints: new Set(),
            cacheKeys: new Set()
        };

        const scanDir = async (dir) => {
            if (!fs.existsSync(dir)) return;
            
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                
                if (entry.isDirectory() && !entry.name.startsWith('_')) {
                    await scanDir(fullPath);
                } else if (entry.name.match(/\.(ts|js|tsx|jsx)$/)) {
                    const content = fs.readFileSync(fullPath, 'utf8');
                    
                    // Extract data patterns
                    const patterns = this.extractDataPatterns(content);
                    const relativePath = path.relative(projectRoot, fullPath);
                    snapshot.dataPatterns[relativePath] = patterns;

                    // Collect unique endpoints
                    const endpoints = this.extractEndpoints(content);
                    endpoints.forEach(endpoint => snapshot.endpoints.add(endpoint));

                    // Collect cache keys
                    const cacheKeys = this.extractCacheKeys(content);
                    cacheKeys.forEach(key => snapshot.cacheKeys.add(key));
                }
            }
        };

        await scanDir(path.join(projectRoot, 'src'));
        
        // Convert Sets to Arrays for serialization
        snapshot.endpoints = Array.from(snapshot.endpoints);
        snapshot.cacheKeys = Array.from(snapshot.cacheKeys);
        
        return snapshot;
    }

    extractDataPatterns(content) {
        return {
            fetchPatterns: (content.match(/fetch\(['"]([^'"]+)['"]/g) || []).map(m => m.match(/['"]([^'"]+)['"]/)[1]),
            queryKeys: (content.match(/useQuery\(['"]([^'"]+)['"]/g) || []).map(m => m.match(/['"]([^'"]+)['"]/)[1]),
            swrKeys: (content.match(/useSWR\(['"]([^'"]+)['"]/g) || []).map(m => m.match(/['"]([^'"]+)['"]/)[1])
        };
    }

    extractEndpoints(content) {
        const endpoints = new Set();
        const patterns = [
            /fetch\(['"]([^'"]+)['"]/g,
            /url:\s*['"]([^'"]+)['"]/g,
            /axios\.get\(['"]([^'"]+)['"]/g,
            /axios\.post\(['"]([^'"]+)['"]/g
        ];

        patterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(content)) !== null) {
                if (match[1].startsWith('/api/') || match[1].startsWith('http')) {
                    endpoints.add(match[1]);
                }
            }
        });

        return Array.from(endpoints);
    }

    extractCacheKeys(content) {
        const cacheKeys = new Set();
        const patterns = [
            /queryKey:\s*\['([^']+)'/g,
            /useSWR\(['"]([^'"]+)['"]/g,
            /revalidate:\s*(\d+)/g
        ];

        patterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(content)) !== null) {
                cacheKeys.add(match[1]);
            }
        });

        return Array.from(cacheKeys);
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
                const cacheKey = `data_fetching_${dir}`;
                if (this.analysisCache.has(cacheKey)) {
                    const cachedResults = this.analysisCache.get(cacheKey);
                    this.mergeResults(results, cachedResults);
                    return;
                }

                const entries = fs.readdirSync(dir, { withFileTypes: true });
                const stepResults = {
                    metrics: { dataFetching: { uniqueEndpoints: new Set() } },
                    findings: [],
                    recommendations: []
                };

                for (const entry of entries) {
                    const fullPath = path.join(dir, entry.name);

                    if (entry.isDirectory() && !entry.name.startsWith('_')) {
                        await scanDirectory(fullPath);
                    } else if (entry.name.match(/\.(ts|js|tsx|jsx)$/)) {
                        const content = fs.readFileSync(fullPath, 'utf8');
                        
                        // Analyze data fetching patterns
                        const patterns = this.detectDataFetchingPatterns(content);
                        Object.assign(stepResults.metrics, { dataFetching: patterns });

                        // Extract and store unique endpoints
                        const endpoints = this.extractEndpoints(content);
                        endpoints.forEach(endpoint => 
                            stepResults.metrics.dataFetching.uniqueEndpoints.add(endpoint)
                        );

                        // Record findings
                        if (patterns.fetchCalls > 0 || patterns.useQuery > 0 || patterns.useSWR > 0) {
                            stepResults.findings.push({
                                file: fullPath,
                                patterns: patterns,
                                endpoints: endpoints
                            });
                        }

                        // Add recommendations
                        this.addDataFetchingRecommendations(patterns, endpoints, stepResults.recommendations);
                    }
                }

                this.analysisCache.set(cacheKey, stepResults);
                this.mergeResults(results, stepResults);
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
                const cacheKey = `state_management_${dir}`;
                if (this.analysisCache.has(cacheKey)) {
                    const cachedResults = this.analysisCache.get(cacheKey);
                    this.mergeResults(results, cachedResults);
                    return;
                }

                const entries = fs.readdirSync(dir, { withFileTypes: true });
                const stepResults = {
                    metrics: {},
                    findings: [],
                    recommendations: []
                };

                for (const entry of entries) {
                    const fullPath = path.join(dir, entry.name);

                    if (entry.isDirectory() && !entry.name.startsWith('_')) {
                        await scanDirectory(fullPath);
                    } else if (entry.name.match(/\.(ts|js|tsx|jsx)$/)) {
                        const content = fs.readFileSync(fullPath, 'utf8');
                        
                        const statePatterns = this.detectStatePatterns(content);
                        Object.assign(stepResults.metrics, { stateManagement: statePatterns });

                        if (this.hasComplexState(statePatterns)) {
                            stepResults.findings.push({
                                file: fullPath,
                                statePatterns: statePatterns
                            });

                            this.addStateManagementRecommendations(statePatterns, stepResults.recommendations);
                        }
                    }
                }

                this.analysisCache.set(cacheKey, stepResults);
                this.mergeResults(results, stepResults);
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
                const cacheKey = `caching_${dir}`;
                if (this.analysisCache.has(cacheKey)) {
                    const cachedResults = this.analysisCache.get(cacheKey);
                    this.mergeResults(results, cachedResults);
                    return;
                }

                const entries = fs.readdirSync(dir, { withFileTypes: true });
                const stepResults = {
                    metrics: { caching: { cacheHits: new Set() } },
                    findings: [],
                    recommendations: []
                };

                for (const entry of entries) {
                    const fullPath = path.join(dir, entry.name);

                    if (entry.isDirectory() && !entry.name.startsWith('_')) {
                        await scanDirectory(fullPath);
                    } else if (entry.name.match(/\.(ts|js|tsx|jsx)$/)) {
                        const content = fs.readFileSync(fullPath, 'utf8');
                        
                        const cachingPatterns = this.detectCachingPatterns(content);
                        Object.assign(stepResults.metrics, { caching: cachingPatterns });

                        // Extract and store cache keys
                        const cacheKeys = this.extractCacheKeys(content);
                        cacheKeys.forEach(key => 
                            stepResults.metrics.caching.cacheHits.add(key)
                        );

                        if (this.hasCachingIssues(cachingPatterns)) {
                            stepResults.findings.push({
                                file: fullPath,
                                cachingPatterns: cachingPatterns,
                                cacheKeys: cacheKeys
                            });

                            this.addCachingRecommendations(cachingPatterns, cacheKeys, stepResults.recommendations);
                        }
                    }
                }

                this.analysisCache.set(cacheKey, stepResults);
                this.mergeResults(results, stepResults);
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
                const cacheKey = `mutations_${dir}`;
                if (this.analysisCache.has(cacheKey)) {
                    const cachedResults = this.analysisCache.get(cacheKey);
                    this.mergeResults(results, cachedResults);
                    return;
                }

                const entries = fs.readdirSync(dir, { withFileTypes: true });
                const stepResults = {
                    metrics: {},
                    findings: [],
                    recommendations: []
                };

                for (const entry of entries) {
                    const fullPath = path.join(dir, entry.name);

                    if (entry.isDirectory() && !entry.name.startsWith('_')) {
                        await scanDirectory(fullPath);
                    } else if (entry.name.match(/\.(ts|js|tsx|jsx)$/)) {
                        const content = fs.readFileSync(fullPath, 'utf8');
                        
                        const mutationPatterns = this.detectMutationPatterns(content);
                        Object.assign(stepResults.metrics, { mutations: mutationPatterns });

                        if (mutationPatterns.formSubmissions > 0 || 
                            mutationPatterns.serverMutations > 0) {
                            stepResults.findings.push({
                                file: fullPath,
                                mutationPatterns: mutationPatterns
                            });

                            this.addMutationRecommendations(mutationPatterns, stepResults.recommendations);
                        }
                    }
                }

                this.analysisCache.set(cacheKey, stepResults);
                this.mergeResults(results, stepResults);
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

    addDataFetchingRecommendations(patterns, endpoints, recommendations) {
        if (patterns.fetchCalls > 5) {
            recommendations.push('Consider using React Query or SWR for better data fetching management');
        }
        if (patterns.fetchCalls > 0 && !patterns.useQuery && !patterns.useSWR) {
            recommendations.push('Implement data caching strategy using React Query or SWR');
        }
        if (endpoints.length > 3) {
            recommendations.push('Consider implementing API route aggregation to reduce number of requests');
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

    addCachingRecommendations(patterns, cacheKeys, recommendations) {
        if (!patterns.revalidation && patterns.staticProps) {
            recommendations.push('Implement revalidation strategy for static props');
        }
        if (patterns.serverProps) {
            recommendations.push('Consider using static props with revalidation instead of server-side props for better performance');
        }
        if (cacheKeys.length > 5) {
            recommendations.push('Consider implementing cache key normalization to reduce cache fragmentation');
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

    addHistoricalRecommendations(results) {
        const { changes } = results.historical;
        
        if (changes.metrics.dataFetching) {
            const fetchingChanges = changes.metrics.dataFetching;
            if (fetchingChanges.fetchCalls && fetchingChanges.fetchCalls.difference > 0) {
                results.recommendations.push(
                    `Data fetching calls increased by ${fetchingChanges.fetchCalls.difference}. Consider implementing request batching.`
                );
            }
        }

        if (changes.metrics.caching) {
            const cachingChanges = changes.metrics.caching;
            if (cachingChanges.revalidation && cachingChanges.revalidation.difference < 0) {
                results.recommendations.push(
                    'Cache revalidation usage has decreased. Review caching strategy.'
                );
            }
        }

        if (changes.metrics.mutations) {
            const mutationChanges = changes.metrics.mutations;
            if (mutationChanges.optimisticUpdates && mutationChanges.optimisticUpdates.difference < 0) {
                results.recommendations.push(
                    'Optimistic updates usage has decreased. Consider implementing for better UX.'
                );
            }
        }
    }

    mergeResults(target, source) {
        // Merge metrics
        for (const [key, value] of Object.entries(source.metrics)) {
            if (typeof value === 'object') {
                if (!target.metrics[key]) target.metrics[key] = {};
                
                if (value instanceof Set) {
                    if (!(target.metrics[key] instanceof Set)) {
                        target.metrics[key] = new Set();
                    }
                    for (const item of value) {
                        target.metrics[key].add(item);
                    }
                } else {
                    for (const [subKey, subValue] of Object.entries(value)) {
                        if (subValue instanceof Set) {
                            if (!target.metrics[key][subKey]) {
                                target.metrics[key][subKey] = new Set();
                            }
                            for (const item of subValue) {
                                target.metrics[key][subKey].add(item);
                            }
                        } else {
                            target.metrics[key][subKey] = (target.metrics[key][subKey] || 0) + subValue;
                        }
                    }
                }
            } else {
                target.metrics[key] = (target.metrics[key] || 0) + value;
            }
        }

        // Merge findings and recommendations
        target.findings.push(...source.findings);
        target.recommendations.push(...source.recommendations);
    }
}

export default DataAnalyzer;

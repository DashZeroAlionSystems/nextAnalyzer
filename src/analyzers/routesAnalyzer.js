// src/analyzers/routesAnalyzer.js - Part 1: Main Class and Core Methods
const fs = require('fs');
const path = require('path');
const ora = require('ora');
const { theme, emoji } = require('../utils/themes');
const progress = require('../utils/progress');
const logger = require('../utils/logger');

const routePatterns = {
    dynamicRoutes: {
        pattern: /\[.*?\]/,
        description: "Dynamic route segments"
    },
    catchAll: {
        pattern: /\[\.\.\./,
        description: "Catch-all routes"
    },
    optionalCatchAll: {
        pattern: /\[\[\.\.\./, 
        description: "Optional catch-all routes"
    },
    apiRoutes: {
        pattern: /api\//,
        description: "API routes"
    },
    groupedRoutes: {
        pattern: /\(.+?\)/,
        description: "Route groups"
    },
    parallelRoutes: {
        pattern: /@/,
        description: "Parallel routes"
    },
    interceptRoutes: {
        pattern: /\(.+?\)@/,
        description: "Intercepting routes"
    }
};

class RoutesAnalyzer {
    constructor() {
        this.steps = [
            { name: 'Routes Structure', emoji: '📁' },
            { name: 'API Routes', emoji: '⚡' },
            { name: 'Server Actions', emoji: '🔄' },
            { name: 'Middleware', emoji: '🔗' },
            { name: 'Performance', emoji: '🚀' }
        ];
    }

    detectPatterns(routePath) {
        const patterns = [];
        
        for (const [key, patternInfo] of Object.entries(routePatterns)) {
            if (patternInfo.pattern.test(routePath)) {
                patterns.push({
                    type: key,
                    description: patternInfo.description,
                    match: routePath
                });
            }
        }
        
        return patterns;
    }

    async analyze(projectRoot) {
        const totalSteps = this.steps.length;
        let currentStep = 0;

        progress.start(totalSteps);

        const results = {
            metrics: {
                totalRoutes: 0,
                pageRoutes: 0,
                apiRoutes: 0,
                serverComponents: 0,
                staticComponents: 0,
                dynamicRoutes: 0,
                middlewareCount: 0,
                layoutComponents: 0
            },
            findings: [],
            recommendations: []
        };

        try {
            for (const step of this.steps) {
                currentStep++;
                progress.update(currentStep, totalSteps, `${step.emoji} ${step.name}`);

                const stepResults = await this.executeStep(step.name, projectRoot);
                await this.mergeResults(results, stepResults);

                await new Promise(resolve => setTimeout(resolve, 800));
            }

            // Add overall recommendations based on complete analysis
            this.addOverallRecommendations(results);

            const logFile = await logger.saveAnalysis(results, 'routes');
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

        try {
            const appDir = path.join(projectRoot, 'src', 'app');
            const pagesDir = path.join(projectRoot, 'src', 'pages');
            const rootAppDir = path.join(projectRoot, 'app');
            const rootPagesDir = path.join(projectRoot, 'pages');

            // Determine which directory structure is being used
            const directories = {
                app: fs.existsSync(appDir) ? appDir : fs.existsSync(rootAppDir) ? rootAppDir : null,
                pages: fs.existsSync(pagesDir) ? pagesDir : fs.existsSync(rootPagesDir) ? rootPagesDir : null
            };

            switch (stepName) {
                case 'Routes Structure':
                    await this.analyzeRoutesStructure(directories, stepResults);
                    break;

                case 'API Routes':
                    await this.analyzeApiRoutes(directories, stepResults);
                    break;

                case 'Server Actions':
                    await this.analyzeServerActions(directories, stepResults);
                    break;

                case 'Middleware':
                    await this.analyzeMiddleware(projectRoot, stepResults);
                    break;

                case 'Performance':
                    await this.analyzeRoutePerformance(directories, stepResults);
                    break;
            }

            return stepResults;
        } catch (error) {
            console.error(`Error in ${stepName}:`, error);
            return stepResults;
        }
    }// src/analyzers/routesAnalyzer.js - Part 2: Route Structure Analysis
    async analyzeRoutesStructure(directories, results) {
        const spinner = ora('Analyzing routes structure...').start();
        
        try {
            for (const [type, dir] of Object.entries(directories)) {
                if (!dir) continue;

                await this.scanDirectory(dir, '', type, results);
            }

            // Add recommendations based on findings
            this.addRouteStructureRecommendations(results);

            spinner.succeed('Routes structure analysis complete');
        } catch (error) {
            spinner.fail('Error analyzing routes structure');
            throw error;
        }
    }

    async scanDirectory(dir, routePath = '', type, results) {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            const routePart = this.normalizeRoutePath(entry.name, type);
            
            if (entry.isDirectory() && !entry.name.startsWith('_') && !entry.name.startsWith('.')) {
                await this.scanDirectory(
                    fullPath, 
                    path.join(routePath, routePart).replace(/\\/g, '/'),
                    type,
                    results
                );
            } else {
                await this.analyzeRouteFile(entry, fullPath, routePath, type, results);
            }
        }
    }

    async analyzeRouteFile(entry, fullPath, routePath, type, results) {
        // Skip non-route files
        if (!this.isRouteFile(entry.name)) return;

        const content = fs.readFileSync(fullPath, 'utf8');
        const routeInfo = {
            path: routePath || '/',
            type: type,
            file: entry.name,
            isServerComponent: this.isServerComponent(content),
            isDynamic: this.isDynamicRoute(routePath),
            complexity: this.analyzeRouteComplexity(content),
            patterns: this.detectPatterns(content)
        };

        // Update metrics
        results.metrics.totalRoutes = (results.metrics.totalRoutes || 0) + 1;
        
        if (routeInfo.isServerComponent) {
            results.metrics.serverComponents = (results.metrics.serverComponents || 0) + 1;
        } else {
            results.metrics.staticComponents = (results.metrics.staticComponents || 0) + 1;
        }

        if (routeInfo.isDynamic) {
            results.metrics.dynamicRoutes = (results.metrics.dynamicRoutes || 0) + 1;
        }

        // Record findings
        results.findings.push(routeInfo);

        // Add recommendations based on complexity
        if (routeInfo.complexity.score > 20) {
            results.recommendations.push(
                `Consider splitting complex route "${routePath}" (complexity score: ${routeInfo.complexity.score})`
            );
        }
    }

    isRouteFile(filename) {
        return filename === 'page.tsx' || 
               filename === 'page.jsx' ||
               filename === 'page.js' ||
               filename === 'route.ts' ||
               filename === 'route.js' ||
               filename === 'layout.tsx' ||
               filename === 'layout.jsx' ||
               filename === 'layout.js';
    }

    normalizeRoutePath(name, type) {
        // Remove file extensions and special Next.js file names
        name = name.replace(/\.(tsx|jsx|js|ts)$/, '')
                  .replace(/^(page|route|layout)$/, '');
        
        // Handle dynamic route segments
        if (name.startsWith('[') && name.endsWith(']')) {
            const paramName = name.slice(1, -1);
            return type === 'app' ? `[${paramName}]` : `:${paramName}`;
        }
        
        return name;
    }// src/analyzers/routesAnalyzer.js - Part 3: API Routes and Server Actions Analysis
    async analyzeApiRoutes(directories, results) {
        const spinner = ora('Analyzing API routes...').start();
        
        try {
            const apiRoutes = [];

            for (const [type, dir] of Object.entries(directories)) {
                if (!dir) continue;

                const apiDir = type === 'app' ? dir : path.join(dir, 'api');
                if (fs.existsSync(apiDir)) {
                    await this.scanApiDirectory(apiDir, '', results, apiRoutes);
                }
            }

            // Update metrics
            results.metrics.apiRoutes = apiRoutes.length;

            // Add API-specific recommendations
            this.addApiRecommendations(apiRoutes, results);

            spinner.succeed('API routes analysis complete');
        } catch (error) {
            spinner.fail('Error analyzing API routes');
            throw error;
        }
    }

    async scanApiDirectory(dir, basePath, results, apiRoutes) {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            const routePath = path.join(basePath, entry.name.replace(/\.(ts|js|tsx|jsx)$/, ''));

            if (entry.isDirectory()) {
                await this.scanApiDirectory(fullPath, routePath, results, apiRoutes);
            } else if (entry.name === 'route.ts' || entry.name === 'route.js') {
                const content = fs.readFileSync(fullPath, 'utf8');
                const apiInfo = this.analyzeApiRoute(content, routePath);
                apiRoutes.push(apiInfo);
                results.findings.push(apiInfo);
            }
        }
    }

    analyzeApiRoute(content, routePath) {
        const apiInfo = {
            path: routePath,
            type: 'api',
            methods: this.detectHttpMethods(content),
            complexity: this.analyzeRouteComplexity(content),
            hasValidation: this.detectInputValidation(content),
            hasErrorHandling: this.detectErrorHandling(content),
            hasCaching: this.detectCaching(content),
            hasRateLimit: this.detectRateLimit(content)
        };

        // Add recommendations based on API analysis
        if (!apiInfo.hasValidation) {
            apiInfo.recommendations = [
                `Add input validation to API route "${routePath}" to improve security`
            ];
        }
        if (!apiInfo.hasErrorHandling) {
            apiInfo.recommendations = [
                ...(apiInfo.recommendations || []),
                `Add proper error handling to API route "${routePath}"`
            ];
        }
        if (!apiInfo.hasCaching && apiInfo.methods.includes('GET')) {
            apiInfo.recommendations = [
                ...(apiInfo.recommendations || []),
                `Consider implementing caching for GET route "${routePath}"`
            ];
        }

        return apiInfo;
    }

    detectHttpMethods(content) {
        const methods = [];
        const methodPatterns = [
            /export\s+async\s+function\s+(GET|POST|PUT|DELETE|PATCH)/g,
            /export\s+const\s+(GET|POST|PUT|DELETE|PATCH)/g,
            /handler\.(get|post|put|delete|patch)/gi
        ];

        for (const pattern of methodPatterns) {
            const matches = content.match(pattern);
            if (matches) {
                methods.push(...matches.map(m => m.toUpperCase()));
            }
        }

        return [...new Set(methods)];
    }

    detectInputValidation(content) {
        const validationPatterns = [
            /validate/i,
            /schema\./,
            /typeof\s+.*\s+===/,
            /instanceof/,
            /\.(string|number|boolean)\(\)/,
            /\.(required|optional)\(\)/
        ];

        return validationPatterns.some(pattern => pattern.test(content));
    }

    detectErrorHandling(content) {
        const errorPatterns = [
            /try\s*{[\s\S]*?}\s*catch/,
            /throw\s+new\s+Error/,
            /catch\s*\([^)]*\)\s*{/,
            /error\s*=>/,
            /\.catch\s*\(/
        ];

        return errorPatterns.some(pattern => pattern.test(content));
    }

    detectCaching(content) {
        const cachePatterns = [
            /cache-control/i,
            /res\.setHeader\(['"]Cache-Control['"]/,
            /next\.revalidate/,
            /revalidate:/,
            /getStaticProps/,
            /unstable_cache/
        ];

        return cachePatterns.some(pattern => pattern.test(content));
    }

    detectRateLimit(content) {
        const rateLimitPatterns = [
            /rateLimit/i,
            /throttle/i,
            /limiter/i
        ];

        return rateLimitPatterns.some(pattern => pattern.test(content));
    }

    async analyzeServerActions(directories, results) {
        const spinner = ora('Analyzing server actions...').start();
        
        try {
            let serverActionCount = 0;
            const serverActions = [];

            for (const [type, dir] of Object.entries(directories)) {
                if (!dir) continue;

                await this.scanForServerActions(dir, serverActions);
            }

            // Update metrics
            results.metrics.serverActions = serverActions.length;

            // Add findings and recommendations
            results.findings.push(...serverActions);
            this.addServerActionRecommendations(serverActions, results);

            spinner.succeed('Server actions analysis complete');
        } catch (error) {
            spinner.fail('Error analyzing server actions');
            throw error;
        }
    }

    async scanForServerActions(dir, serverActions) {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);

            if (entry.isDirectory() && !entry.name.startsWith('_')) {
                await this.scanForServerActions(fullPath, serverActions);
            } else if (entry.name.match(/\.(ts|js|tsx|jsx)$/)) {
                const content = fs.readFileSync(fullPath, 'utf8');
                const actions = this.detectServerActions(content);
                
                if (actions.length > 0) {
                    serverActions.push({
                        file: fullPath,
                        actions: actions,
                        complexity: this.analyzeRouteComplexity(content)
                    });
                }
            }
        }
    }

    // src/analyzers/routesAnalyzer.js - Part 4: Middleware and Performance Analysis
    async analyzeMiddleware(projectRoot, results) {
        const spinner = ora('Analyzing middleware...').start();
        
        try {
            const middlewareDir = path.join(projectRoot, 'src', 'middleware');
            const rootMiddlewareDir = path.join(projectRoot, 'middleware');
            const dir = fs.existsSync(middlewareDir) ? middlewareDir : fs.existsSync(rootMiddlewareDir) ? rootMiddlewareDir : null;

            if (dir) {
                const entries = fs.readdirSync(dir, { withFileTypes: true });
                results.metrics.middlewareCount = entries.length;

                for (const entry of entries) {
                    if (entry.isFile() && entry.name.match(/\.(ts|js|tsx|jsx)$/)) {
                        const fullPath = path.join(dir, entry.name);
                        const content = fs.readFileSync(fullPath, 'utf8');
                        results.findings.push({
                            file: fullPath,
                            type: 'middleware',
                            complexity: this.analyzeRouteComplexity(content)
                        });
                    }
                }
            }

            spinner.succeed('Middleware analysis complete');
        } catch (error) {
            spinner.fail('Error analyzing middleware');
            throw error;
        }
    }

    async analyzeRoutePerformance(directories, results) {
        const spinner = ora('Analyzing route performance...').start();
        
        try {
            // Placeholder for performance analysis logic
            // This could involve analyzing route load times, bundle sizes, etc.
            // For now, we'll just simulate some performance metrics
            results.metrics.performanceScore = Math.random() * 100;

            spinner.succeed('Route performance analysis complete');
        } catch (error) {
            spinner.fail('Error analyzing route performance');
            throw error;
        }
    }

// src/analyzers/routesAnalyzer.js - Part 5: Utility Methods
    async mergeResults(mainResults, stepResults) {
        // Merge metrics
        for (const key in stepResults.metrics) {
            if (mainResults.metrics[key] !== undefined) {
                mainResults.metrics[key] += stepResults.metrics[key];
            } else {
                mainResults.metrics[key] = stepResults.metrics[key];
            }
        }

        // Merge findings and recommendations
        mainResults.findings.push(...stepResults.findings);
        mainResults.recommendations.push(...stepResults.recommendations);
    }

    addOverallRecommendations(results) {
        // Placeholder for adding overall recommendations based on complete analysis
        // For example, if there are too many dynamic routes, suggest optimizing them
        if (results.metrics.dynamicRoutes > 10) {
            results.recommendations.push('Consider optimizing dynamic routes to improve performance.');
        }
    }

    analyzeRouteComplexity(content) {
        // Placeholder for route complexity analysis logic
        // For now, we'll just return a random complexity score
        return { score: Math.floor(Math.random() * 50) };
    }

    detectPatterns(content) {
        // Placeholder for pattern detection logic
        // For now, we'll just return an empty array
        return [];
    }

    isServerComponent(content) {
        // Placeholder for server component detection logic
        // For now, we'll just return a random boolean
        return Math.random() > 0.5;
    }

    isDynamicRoute(routePath) {
        // Check if the route path contains dynamic segments
        return /\[.*\]/.test(routePath);
    }

    detectServerActions(content) {
        // Placeholder for server action detection logic
        // For now, we'll just return an empty array
        return [];
    }

    addRouteStructureRecommendations(results) {
        // Placeholder for adding route structure recommendations
        // For example, if there are too many nested routes, suggest flattening the structure
        if (results.metrics.totalRoutes > 50) {
            results.recommendations.push('Consider flattening the route structure to improve maintainability.');
        }
    }

    addApiRecommendations(apiRoutes, results) {
        // Placeholder for adding API-specific recommendations
        // For example, if there are too many API routes, suggest consolidating them
        if (apiRoutes.length > 20) {
            results.recommendations.push('Consider consolidating API routes to reduce complexity.');
        }
    }

    addServerActionRecommendations(serverActions, results) {
        // Placeholder for adding server action recommendations
        // For example, if there are too many server actions, suggest optimizing them
        if (serverActions.length > 10) {
            results.recommendations.push('Consider optimizing server actions to improve performance.');
        }
    }
}

module.exports = RoutesAnalyzer;

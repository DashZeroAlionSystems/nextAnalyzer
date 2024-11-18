// src/utils/buildErrorPatterns.js
export const buildErrorPatterns = {
    // Dependency Errors
    MISSING_DEPENDENCY: {
        patterns: [
            /Cannot find module '([^']+)'/,
            /Can't resolve '([^']+)'/,
            /Module not found: Error: Can't resolve '([^']+)'/
        ],
        category: 'dependency',
        severity: 'high',
        solution: {
            title: 'Missing Dependency',
            steps: [
                'Run npm install or yarn install',
                'Check if the package is listed in package.json',
                'Verify the import path is correct'
            ],
            command: 'npm install {package}'
        }
    },

    // TypeScript Errors
    TYPE_ERROR: {
        patterns: [
            /TS([0-9]+): (.+)/,
            /Type '(.+)' is not assignable to type/,
            /Property '(.+)' does not exist on type/
        ],
        category: 'typescript',
        severity: 'high',
        solution: {
            title: 'TypeScript Error',
            steps: [
                'Check type definitions',
                'Update @types packages',
                'Verify interface implementations'
            ],
            command: 'npm run type-check'
        }
    }
    // ... other patterns ...
};

export class BuildErrorUtils {
    static findErrorPattern(errorMessage) {
        for (const [errorType, config] of Object.entries(buildErrorPatterns)) {
            for (const pattern of config.patterns) {
                const match = errorMessage.match(pattern);
                if (match) {
                    return {
                        type: errorType,
                        match: match[1] || match[0],
                        ...config
                    };
                }
            }
        }
        return null;
    }

    static generateSolution(errorType, context = {}) {
        const errorConfig = buildErrorPatterns[errorType];
        if (!errorConfig) return null;

        const solution = {
            ...errorConfig.solution,
            steps: errorConfig.solution.steps.map(step => 
                this.interpolateContext(step, context)
            )
        };

        if (errorConfig.solution.command) {
            solution.command = this.interpolateContext(
                errorConfig.solution.command,
                context
            );
        }

        return solution;
    }

    static interpolateContext(text, context) {
        return text.replace(/\{(\w+)\}/g, (_, key) => context[key] || key);
    }

    static getSeverityLevel(errorType) {
        return buildErrorPatterns[errorType]?.severity || 'medium';
    }

    static getCategory(errorType) {
        return buildErrorPatterns[errorType]?.category || 'unknown';
    }
}
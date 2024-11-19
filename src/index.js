// src/index.js
const path = require('path');
const fs = require('fs');
const gradient = require('gradient-string');
const { theme, emoji } = require('./utils/themes');
const RoutesAnalyzer = require('./analyzers/routesAnalyzer');
const DataAnalyzer = require('./analyzers/dataAnalyzer');
const PerformanceAnalyzer = require('./analyzers/performanceAnalyzer');
const SEOAnalyzer = require('./analyzers/seoAnalyzer');

class NextAnalyzer {
    constructor() {
        this.analyzers = {
            routes: new RoutesAnalyzer(),
            data: new DataAnalyzer(),
            performance: new PerformanceAnalyzer(),
            seo: new SEOAnalyzer()
        };
        this.boxen = null;
    }

    async initBoxen() {
        if (!this.boxen) {
            const boxenModule = await import('boxen');
            this.boxen = boxenModule.default;
        }
        return this.boxen;
    }

    async printTitle(text) {
        const boxen = await this.initBoxen();
        console.log('\n' + gradient.rainbow.multiline(boxen(
            text,
            {
                padding: 1,
                margin: 1,
                borderStyle: 'double',
                borderColor: 'cyan',
            }
        )) + '\n');
    }

    validateNextJsProject(projectPath) {
        // Convert relative path to absolute
        const absolutePath = path.resolve(projectPath);

        // Check if path exists
        if (!fs.existsSync(absolutePath)) {
            throw new Error(`Path does not exist: ${absolutePath}`);
        }

        // Check for Next.js indicators
        const hasNextConfig = fs.existsSync(path.join(absolutePath, 'next.config.js')) ||
                            fs.existsSync(path.join(absolutePath, 'next.config.mjs'));
        const hasPackageJson = fs.existsSync(path.join(absolutePath, 'package.json'));
        
        if (hasPackageJson) {
            try {
                const packageJson = JSON.parse(
                    fs.readFileSync(path.join(absolutePath, 'package.json'), 'utf8')
                );
                if (!packageJson.dependencies?.next && !packageJson.devDependencies?.next) {
                    throw new Error('Next.js dependency not found in package.json');
                }
            } catch (error) {
                throw new Error(`Invalid package.json or Next.js not found: ${error.message}`);
            }
        } else if (!hasNextConfig) {
            throw new Error('No Next.js project indicators found (next.config.js or Next.js in package.json)');
        }

        // Check for essential Next.js directories
        const hasPagesOrApp = fs.existsSync(path.join(absolutePath, 'pages')) ||
                            fs.existsSync(path.join(absolutePath, 'app')) ||
                            fs.existsSync(path.join(absolutePath, 'src/pages')) ||
                            fs.existsSync(path.join(absolutePath, 'src/app'));

        if (!hasPagesOrApp) {
            throw new Error('No pages or app directory found');
        }

        return absolutePath;
    }

    async analyze(type, projectPath) {
        try {
            await this.printTitle(`Next.js ${type.charAt(0).toUpperCase() + type.slice(1)} Analyzer`);
            
            // Validate and get absolute project path
            const validatedPath = this.validateNextJsProject(projectPath);
            console.log(theme.success(`${emoji.folder} Project root: ${theme.highlight(validatedPath)}\n`));

            // Analyze project structure
            console.log(theme.info(`${emoji.search} Analyzing project structure...`));
            const projectInfo = this.getProjectInfo(validatedPath);
            console.log(theme.success(`${emoji.success} Found Next.js ${projectInfo.version} project using ${projectInfo.router} router\n`));

            const analyzer = this.analyzers[type];
            if (!analyzer) {
                throw new Error(`Unknown analyzer type: ${type}`);
            }

            const results = await analyzer.analyze(validatedPath);
            return results;

        } catch (error) {
            console.error(theme.error(`\n${emoji.error} Error during analysis:`));
            console.error(theme.error(error.message));
            throw error;
        }
    }

    getProjectInfo(projectPath) {
        const packageJson = JSON.parse(
            fs.readFileSync(path.join(projectPath, 'package.json'), 'utf8')
        );

        const info = {
            version: packageJson.dependencies?.next || packageJson.devDependencies?.next,
            router: 'unknown'
        };

        // Detect router type
        if (fs.existsSync(path.join(projectPath, 'app')) || 
            fs.existsSync(path.join(projectPath, 'src/app'))) {
            info.router = 'App';
        } else if (fs.existsSync(path.join(projectPath, 'pages')) || 
                   fs.existsSync(path.join(projectPath, 'src/pages'))) {
            info.router = 'Pages';
        }

        return info;
    }
}

// CLI interface
if (require.main === module) {
    const yargs = require('yargs');
    
    yargs
        .usage('Usage: $0 <command> [options]')
        .command({
            command: 'routes [path]',
            desc: 'Analyze Next.js routes',
            builder: (yargs) => {
                return yargs.positional('path', {
                    describe: 'Path to Next.js project',
                    default: process.cwd()
                });
            },
            handler: async (argv) => {
                const analyzer = new NextAnalyzer();
                await analyzer.analyze('routes', argv.path);
            }
        })
        .command({
            command: 'data [path]',
            desc: 'Analyze data flow patterns',
            builder: (yargs) => {
                return yargs.positional('path', {
                    describe: 'Path to Next.js project',
                    default: process.cwd()
                });
            },
            handler: async (argv) => {
                const analyzer = new NextAnalyzer();
                await analyzer.analyze('data', argv.path);
            }
        })
        .command({
            command: 'seo [path]',
            desc: 'Analyze SEO metrics and best practices',
            builder: (yargs) => {
                return yargs.positional('path', {
                    describe: 'Path to Next.js project',
                    default: process.cwd()
                })
                .option('detailed', {
                    alias: 'd',
                    type: 'boolean',
                    description: 'Show detailed SEO analysis'
                });
            },
            handler: async (argv) => {
                const analyzer = new NextAnalyzer();
                await analyzer.analyze('seo', argv.path);
            }
        })
        .command({
            command: 'performance [path]',
            desc: 'Analyze performance metrics',
            builder: (yargs) => {
                return yargs.positional('path', {
                    describe: 'Path to Next.js project',
                    default: process.cwd()
                });
            },
            handler: async (argv) => {
                const analyzer = new NextAnalyzer();
                await analyzer.analyze('performance', argv.path);
            }
        })
        .command({
            command: 'all [path]',
            desc: 'Run all analyzers',
            builder: (yargs) => {
                return yargs.positional('path', {
                    describe: 'Path to Next.js project',
                    default: process.cwd()
                });
            },
            handler: async (argv) => {
                const analyzer = new NextAnalyzer();
                console.log(theme.info('\n📊 Running all analyzers...\n'));
                
                for (const type of ['routes', 'data', 'performance','seo']) {
                    try {
                        await analyzer.analyze(type, argv.path);
                        console.log(theme.success(`\n✅ ${type} analysis complete\n`));
                    } catch (error) {
                        console.error(theme.error(`\n❌ ${type} analysis failed: ${error.message}\n`));
                    }
                }
                
                console.log(theme.success('\n🎉 All analyses complete!\n'));
            }
        })
        .example('$0 routes /path/to/nextjs/project', 'Analyze routes in specific project')
        .example('$0 all .', 'Run all analyzers on current directory')
        .help()
        .argv;
}

module.exports = new NextAnalyzer();

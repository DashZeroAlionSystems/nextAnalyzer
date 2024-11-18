// src/index.js
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import gradient from 'gradient-string';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import boxen from 'boxen';
import { theme, emoji } from './utils/themes.js';
import RoutesAnalyzer from './analyzers/routesAnalyzer.js';
import DataAnalyzer from './analyzers/dataAnalyzer.js';
import PerformanceAnalyzer from './analyzers/performanceAnalyzer.js';
import BuildErrorAnalyzer from './analyzers/buildErrorAnalyzer.js';
import BuildErrorReporter from './utils/buildErrorReporter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class NextAnalyzer {
    constructor() {
        this.analyzers = {
            routes: new RoutesAnalyzer(),
            data: new DataAnalyzer(),
            performance: new PerformanceAnalyzer(),
            errors: new BuildErrorAnalyzer()
        };
        this.errorReporter = new BuildErrorReporter();
    }

    async printTitle(text) {
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
        const absolutePath = path.resolve(projectPath);

        if (!fs.existsSync(absolutePath)) {
            throw new Error(`Path does not exist: ${absolutePath}`);
        }

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
            throw new Error('No Next.js project indicators found');
        }

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
            
            const validatedPath = this.validateNextJsProject(projectPath);
            console.log(theme.success(`${emoji.folder} Project root: ${theme.highlight(validatedPath)}\n`));

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
const cli = yargs(hideBin(process.argv))
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
            
            for (const type of ['routes', 'data', 'performance']) {
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
    .help();

cli.parse();

export default new NextAnalyzer();
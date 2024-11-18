#!/bin/bash
# setup-analyzer.sh

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored status messages
print_status() {
    echo -e "${BLUE}==>${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}!${NC} $1"
}

# Project name
PROJECT_NAME="nextjs-analyzer"

# Create main project directory
print_status "Creating project: $PROJECT_NAME"
mkdir -p $PROJECT_NAME
cd $PROJECT_NAME

# Create project structure
print_status "Setting up project structure..."

# Create directories
directories=(
    "src/analyzers"
    "src/utils"
    "logs"
    "test/sample-nextjs-project/src/app/api/hello"
    "test/sample-nextjs-project/src/app/about"
)

for dir in "${directories[@]}"; do
    mkdir -p $dir
    print_success "Created directory: $dir"
done

# Initialize package.json
print_status "Initializing package.json..."
cat > package.json << EOF
{
  "name": "nextjs-analyzer",
  "version": "1.0.0",
  "description": "Next.js project analyzer with logging capabilities",
  "main": "src/index.js",
  "scripts": {
    "test": "node test/analyze.js",
    "analyze": "node src/index.js"
  },
  "keywords": ["nextjs", "analysis", "tools"],
  "author": "",
  "license": "MIT"
}
EOF

# Install dependencies
print_status "Installing dependencies..."
npm install chalk cli-progress gradient-string boxen ora yargs date-fns

# Create source files
print_status "Creating source files..."

# Create utils/themes.js
cat > src/utils/themes.js << EOF
const chalk = require('chalk');
const gradient = require('gradient-string');

exports.theme = {
    title: chalk.bold.magenta,
    section: chalk.cyan.bold,
    success: chalk.green,
    warning: chalk.yellow,
    error: chalk.red,
    info: chalk.blue,
    highlight: chalk.bold.white,
    dim: chalk.gray,
    special: chalk.hex('#FF8C00')
};

exports.emoji = {
    route: '🛣️ ',
    static: '📄',
    server: '🔄',
    api: '⚡',
    dynamic: '🔀',
    warning: '⚠️ ',
    success: '✅',
    error: '❌',
    middleware: '🔗',
    layout: '📐',
    page: '📝',
    folder: '📁'
};
EOF

# Create utils/logger.js
cat > src/utils/logger.js << EOF
const fs = require('fs');
const path = require('path');
const { format } = require('date-fns');

class AnalysisLogger {
    constructor() {
        this.logsDir = path.join(process.cwd(), 'logs');
        this.ensureLogsDirectory();
    }

    ensureLogsDirectory() {
        if (!fs.existsSync(this.logsDir)) {
            fs.mkdirSync(this.logsDir, { recursive: true });
        }
    }

    generateFileName(analyzerType) {
        const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
        return path.join(this.logsDir, \`\${timestamp}_\${analyzerType}.md\`);
    }

    async saveAnalysis(results, analyzerType) {
        const fileName = this.generateFileName(analyzerType);
        const markdown = this.formatMarkdown(results, analyzerType);
        
        try {
            await fs.promises.writeFile(fileName, markdown);
            return fileName;
        } catch (error) {
            console.error(\`Error saving analysis log: \${error.message}\`);
            throw error;
        }
    }

    formatMarkdown(results, analyzerType) {
        const timestamp = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
        return \`# Next.js Analysis Report: \${analyzerType}
Generated: \${timestamp}

## Metrics
\${Object.entries(results.metrics)
    .map(([key, value]) => \`- **\${key}**: \${value}\`)
    .join('\\n')}

## Findings
\${results.findings
    .map((finding, index) => {
        if (typeof finding === 'string') return \`\${index + 1}. \${finding}\`;
        return \`\${index + 1}. \${Object.entries(finding)
            .map(([key, value]) => \`**\${key}**: \${value}\`)
            .join(', ')}\`;
    })
    .join('\\n')}

## Recommendations
\${results.recommendations
    .map((rec, index) => \`\${index + 1}. \${rec}\`)
    .join('\\n')}
\`;
    }
}

module.exports = new AnalysisLogger();
EOF

# Create utils/progress.js
cat > src/utils/progress.js << EOF
const cliProgress = require('cli-progress');
const chalk = require('chalk');

class ProgressManager {
    constructor() {
        this.bar = new cliProgress.SingleBar({
            format: \`\${chalk.cyan('{bar}')} \${chalk.cyan('{percentage}%')} | \${chalk.yellow('Step {step}')} | {status}\`,
            barCompleteChar: '█',
            barIncompleteChar: '░',
            hideCursor: true
        });
    }

    start(totalSteps) {
        this.bar.start(totalSteps, 0, {
            step: \`0/\${totalSteps}\`,
            status: 'Initializing...'
        });
    }

    update(current, total, status) {
        this.bar.update(current, {
            step: \`\${current}/\${total}\`,
            status
        });
    }

    stop() {
        this.bar.stop();
    }
}

module.exports = new ProgressManager();
EOF

# Create test files
print_status "Creating test files..."

# Create sample Next.js project files
cat > test/sample-nextjs-project/src/app/page.tsx << EOF
export default function Home() {
  return <div>Hello World</div>
}
EOF

cat > test/sample-nextjs-project/src/app/about/page.tsx << EOF
export default function About() {
  return <div>About Page</div>
}
EOF

cat > test/sample-nextjs-project/src/app/api/hello/route.ts << EOF
import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ hello: 'world' })
}
EOF

# Create test analyzer
cat > test/analyze.js << EOF
const path = require('path');
const fs = require('fs');

// Clean up any existing logs
const logsDir = path.join(__dirname, '..', 'logs');
if (fs.existsSync(logsDir)) {
    fs.rmSync(logsDir, { recursive: true, force: true });
}

// Create necessary directories
fs.mkdirSync(logsDir, { recursive: true });

async function runTests() {
    console.log('Starting analyzer test...\n');
    
    try {
        // Run the analyzer
        const { default: analyze } = require('../src/index.js');
        await analyze('routes');
        
        // Verify logs were created
        const logs = fs.readdirSync(logsDir);
        console.log(\`\nLogs created: \${logs.length}\`);
        logs.forEach(log => console.log(\`- \${log}\`));
        
        console.log('\n✅ Analyzer test completed successfully!');
    } catch (error) {
        console.error('Test failed:', error);
        process.exit(1);
    }
}

runTests();
EOF

# Create README
print_status "Creating README..."
cat > README.md << EOF
# Next.js Analyzer

A comprehensive analyzer for Next.js projects with logging capabilities.

## Installation

\`\`\`bash
npm install
\`\`\`

## Usage

\`\`\`bash
# Analyze routes
npm run analyze routes

# Run tests
npm run test
\`\`\`

## Features

- Route analysis
- Logging capabilities
- Progress tracking
- Beautiful console output
- Markdown report generation
EOF

# Create .gitignore
print_status "Creating .gitignore..."
cat > .gitignore << EOF
node_modules/
.next/
.DS_Store
*.log
EOF

# Make the script executable
chmod +x setup-analyzer.sh

print_success "Project setup complete! 🎉"
print_status "To get started:"
echo -e "${BLUE}  cd${NC} $PROJECT_NAME"
echo -e "${BLUE}  npm install${NC}"
echo -e "${BLUE}  npm run test${NC}"
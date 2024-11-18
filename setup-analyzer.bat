@echo off
:: setup-analyzer.bat

echo Setting up Next.js Analyzer...

:: Create project directory
set PROJECT_NAME=nextjs-analyzer
mkdir %PROJECT_NAME%
cd %PROJECT_NAME%

:: Create directory structure
echo Creating project structure...
mkdir src\analyzers
mkdir src\utils
mkdir logs
mkdir test\sample-nextjs-project\src\app\api\hello
mkdir test\sample-nextjs-project\src\app\about

:: Create package.json
echo Creating package.json...
(
echo {
echo   "name": "nextjs-analyzer",
echo   "version": "1.0.0",
echo   "description": "Next.js project analyzer with logging capabilities",
echo   "main": "src/index.js",
echo   "scripts": {
echo     "test": "node test/analyze.js",
echo     "analyze": "node src/index.js"
echo   },
echo   "keywords": ["nextjs", "analysis", "tools"],
echo   "author": "",
echo   "license": "MIT"
echo }
) > package.json

:: Install dependencies
echo Installing dependencies...
call npm install chalk cli-progress gradient-string boxen ora yargs date-fns

:: Create source files (similar to bash script)
echo Creating source files...

:: Create README
echo Creating README...
(
echo # Next.js Analyzer
echo.
echo A comprehensive analyzer for Next.js projects with logging capabilities.
echo.
echo ## Installation
echo.
echo ```bash
echo npm install
echo ```
echo.
echo ## Usage
echo.
echo ```bash
echo # Analyze routes
echo npm run analyze routes
echo.
echo # Run tests
echo npm run test
echo ```
) > README.md

:: Create .gitignore
echo Creating .gitignore...
(
echo node_modules/
echo .next/
echo .DS_Store
echo *.log
) > .gitignore

echo Project setup complete! 🎉
echo.
echo To get started:
echo   cd %PROJECT_NAME%
echo   npm install
echo   npm run test

pause
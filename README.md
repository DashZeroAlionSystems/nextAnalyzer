# Next.js Analyzer

A comprehensive analyzer for Next.js projects with detailed logging capabilities.

## Features

- 🛣️ **Route Analysis**
  - Static/Dynamic routes detection
  - API routes analysis
  - Middleware detection
  - Server components analysis
  
- 📊 **Data Flow Analysis**
  - Data fetching patterns
  - State management
  - Caching strategies
  - Data mutations

- ⚡ **Performance Analysis**
  - Bundle size analysis
  - Image optimization
  - Component load time
  - Code splitting detection

## Installation

```bash
npm install
```

## Usage

Run specific analyzers:

```bash
# Analyze routes
npm run analyze:routes

# Analyze data flow
npm run analyze:data

# Analyze performance
npm run analyze:performance

# Run all analyzers
npm run analyze:all
```

Or use the CLI directly:

```bash
node src/index.js routes
node src/index.js data
node src/index.js performance
node src/index.js all
```

## Output

Analysis results are saved in the `logs` directory with timestamps:
- `2024-02-20_14-30-45_routes.md`
- `2024-02-20_14-30-45_data.md`
- `2024-02-20_14-30-45_performance.md`

Each log file contains:
- Detailed metrics
- Findings
- Recommendations
- Summary with health score

## Analysis Types

### Routes Analysis
- Page routes detection
- API routes analysis
- Server/Client components
- Dynamic routes
- Middleware configuration

### Data Flow Analysis
- Data fetching patterns
- State management usage
- Caching implementations
- Data mutation strategies

### Performance Analysis
- Bundle size metrics
- Image optimization
- Component complexity
- Code splitting usage

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

MIT
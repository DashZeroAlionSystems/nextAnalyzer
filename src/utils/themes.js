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
    special: chalk.hex('#FF8C00'),
    metric: {
        good: chalk.green,
        medium: chalk.yellow,
        bad: chalk.red
    }
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
    folder: '📁',
    performance: '🚀',
    security: '🔒',
    database: '🗄️ ',
    cache: '💾',
    optimization: '⚡',
    i18n: '🌐',
    component: '🧩',
    hook: '🎣',
    auth: '🔑',
    test: '🧪',
    style: '💅',
    build: '🏗️ ',
    time: '⏱️ ',
    size: '📊',
    search: '🔍',
    deploy: '🚀',
    analyzing: '🔮'
};
// src/utils/themes.js
import chalk from 'chalk';

export const theme = {
    info: (text) => chalk.blue(text),
    success: (text) => chalk.green(text),
    warning: (text) => chalk.yellow(text),
    error: (text) => chalk.red(text),
    highlight: (text) => chalk.cyan(text),
    muted: (text) => chalk.gray(text)
};

export const emoji = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
    folder: '📁',
    file: '📄',
    search: '🔍',
    rocket: '🚀',
    chart: '📊',
    bug: '🐛',
    link: '🔗',
    check: '✔️',
    cross: '✖️',
    loading: '⏳',
    done: '🏁'
};
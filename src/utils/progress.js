// src/utils/progress.js
import cliProgress from 'cli-progress';
import chalk from 'chalk';
import { theme } from './themes';

class ProgressManager {
    constructor() {
        this.bar = new cliProgress.SingleBar({
            format: this.getProgressFormat(),
            barCompleteChar: '█',
            barIncompleteChar: '░',
            hideCursor: true
        });
        this.spinners = new Map();
    }

    getProgressFormat() {
        return [
            `${chalk.cyan('{bar}')}`,
            chalk.cyan('{percentage}%'),
            '|',
            chalk.yellow('Step {step}'),
            '|',
            chalk.blue('{status}'),
            '|',
            chalk.green('{duration_formatted}')
        ].join(' ');
    }

    start(totalSteps) {
        this.startTime = Date.now();
        this.bar.start(totalSteps, 0, {
            step: `0/${totalSteps}`,
            status: 'Initializing...',
            duration_formatted: '0s'
        });
    }

    update(current, total, status) {
        const duration = Date.now() - this.startTime;
        const duration_formatted = this.formatDuration(duration);

        this.bar.update(current, {
            step: `${current}/${total}`,
            status,
            duration_formatted
        });
    }

    formatDuration(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        if (hours > 0) {
            return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    }

    incrementProgress(status) {
        const value = this.bar.value;
        this.bar.increment(1, { status });
    }

    stop() {
        this.bar.stop();
    }

    addTask(taskName, total) {
        const taskBar = new cliProgress.SingleBar({
            format: `  ${chalk.blue(taskName)} ${chalk.cyan('{bar}')} | {percentage}% | {value}/{total}`,
            barCompleteChar: '█',
            barIncompleteChar: '░'
        });
        this.spinners.set(taskName, taskBar);
        taskBar.start(total, 0);
        return taskBar;
    }

    updateTask(taskName, current, total) {
        const taskBar = this.spinners.get(taskName);
        if (taskBar) {
            taskBar.update(current, { total });
        }
    }

    completeTask(taskName) {
        const taskBar = this.spinners.get(taskName);
        if (taskBar) {
            taskBar.stop();
            this.spinners.delete(taskName);
        }
    }

    startSubProgress(message) {
        return {
            text: message,
            startTime: Date.now()
        };
    }

    updateSubProgress(progress, current, total) {
        const duration = Date.now() - progress.startTime;
        const percentage = Math.round((current / total) * 100);
        console.log(
            `  ${chalk.blue(progress.text)} ${chalk.cyan(`${percentage}%`)} | ${
                this.formatDuration(duration)
            }`
        );
    }

    completeSubProgress(progress) {
        const duration = Date.now() - progress.startTime;
        console.log(
            `  ${chalk.green('✓')} ${chalk.blue(progress.text)} completed in ${
                this.formatDuration(duration)
            }`
        );
    }
}

export default new ProgressManager();

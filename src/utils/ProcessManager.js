// Add this ProcessManager class to handle processes better
const { exec, execSync } = require('child_process');
const treeKill = require('tree-kill');

class ProcessManager {
    constructor() {
        this.activeProcesses = new Map();
    }

    async findProcessOnPort(port) {
        try {
            if (process.platform === 'win32') {
                const command = `netstat -ano | findstr :${port}`;
                const output = execSync(command, { encoding: 'utf8' });
                const lines = output.split('\n');
                
                for (const line of lines) {
                    if (line.includes('LISTENING')) {
                        const pid = line.match(/(\d+)\s*$/)?.[1];
                        if (pid) return parseInt(pid);
                    }
                }
            } else {
                const command = `lsof -i:${port} -t`;
                const output = execSync(command, { encoding: 'utf8' });
                return parseInt(output.trim());
            }
        } catch (e) {
            // No process found on port
            return null;
        }
        return null;
    }

    async killProcess(pid) {
        return new Promise((resolve) => {
            if (!pid) {
                resolve(false);
                return;
            }

            try {
                if (process.platform === 'win32') {
                    try {
                        execSync(`taskkill /F /T /PID ${pid}`, { stdio: 'ignore' });
                    } catch (e) {
                        // Process might already be gone
                    }
                } else {
                    process.kill(pid, 'SIGKILL');
                }
                resolve(true);
            } catch (e) {
                resolve(false);
            }
        });
    }

    async cleanupPort(port) {
        const pid = await this.findProcessOnPort(port);
        if (pid) {
            await this.killProcess(pid);
            // Wait a bit to ensure port is freed
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    registerProcess(name, process) {
        this.activeProcesses.set(name, process);
    }

    async killAll() {
        for (const [name, process] of this.activeProcesses) {
            try {
                await this.killProcess(process.pid);
            } catch (e) {
                console.warn(`Failed to kill process ${name}:`, e.message);
            }
        }
        this.activeProcesses.clear();
    }
}

module.exports = { ProcessManager };
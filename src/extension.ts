import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const activeTempDirs = new Set<string>();

export function activate(context: vscode.ExtensionContext) {

    context.subscriptions.push(
        vscode.workspace.onDidCloseTextDocument(doc => {
            for (const tmpDir of activeTempDirs) {
                if (doc.uri.fsPath.startsWith(tmpDir)) {
                    tryCleanup(tmpDir);
                    break;
                }
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('rdv.diff', async (uri?: vscode.Uri) => {

            let targetFilePath = '';
            if (uri) {
                targetFilePath = uri.fsPath;
            } else if (vscode.window.activeTextEditor) {
                targetFilePath = vscode.window.activeTextEditor.document.uri.fsPath;
            } else {
                vscode.window.showErrorMessage("Please select a 'values-*.yaml' file to diff.");
                return;
            }

            const fileName = path.basename(targetFilePath);

            // ^values-.*\.yaml$   -> Matches "values-dev.yaml"
            // .*\.values\.yaml$   -> Matches "dev.values.yaml"
            if (!/^(values-.*|.*\.values)\.yaml$/.test(fileName)) {
                vscode.window.showErrorMessage(`rdv error: Invalid file. Please select a file matching 'values-*.yaml' or '*.values.yaml' (Got: ${fileName})`);
                return;
            }

            if (fs.lstatSync(targetFilePath).isDirectory()) {
                vscode.window.showErrorMessage("rdv error: Please select a file, not a directory.");
                return;
            }

            // Auto-Save
            const editor = vscode.window.activeTextEditor;
            if (editor && editor.document.uri.fsPath === targetFilePath && editor.document.isDirty) {
                await editor.document.save();
            }

            const targetDir = path.dirname(targetFilePath);
            const gitRoot = findGitRoot(targetDir);
            if (!gitRoot) {
                vscode.window.showErrorMessage("rdv error: Could not find a .git folder in any parent directory.");
                return;
            }

            const relativePath = path.relative(gitRoot, targetDir) || '.';
            const valuesFileRelativePath = path.relative(targetDir, targetFilePath);

            const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rdv-'));
            activeTempDirs.add(tmpDir);

            const config = vscode.workspace.getConfiguration('rdv');
            const rdvBinary = config.get<string>('binaryPath') || 'rdv';

            const args = ['-p', relativePath, '-f', valuesFileRelativePath ,'-o', tmpDir];

            vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `rdv: rendering ${fileName}...`,
                cancellable: false
            }, async () => {
                return new Promise<void>((resolve) => {

                    // FIX: Used '_stdout' to silence the unused variable warning
                    cp.execFile(rdvBinary, args, { cwd: gitRoot, env: process.env }, async (err, _stdout, stderr) => {
                        if (err) {
                            vscode.window.showErrorMessage(`rdv failed: ${stderr || err.message}`);
                            tryCleanup(tmpDir, true);
                            resolve();
                            return;
                        }

                        const leftUri = vscode.Uri.file(path.join(tmpDir, 'target.yaml'));
                        const rightUri = vscode.Uri.file(path.join(tmpDir, 'local.yaml'));

                        if (!fs.existsSync(leftUri.fsPath) || !fs.existsSync(rightUri.fsPath)) {
                            vscode.window.showErrorMessage(`rdv output missing in ${tmpDir}`);
                            tryCleanup(tmpDir, true);
                            resolve();
                            return;
                        }

                        const title = `RDV: ${fileName}`;
                        await vscode.commands.executeCommand('vscode.diff', leftUri, rightUri, title);
                        resolve();
                    });
                });
            });
        })
    );
}

function findGitRoot(startPath: string): string | null {
    let current = startPath;
    while (current !== path.parse(current).root) {
        if (fs.existsSync(path.join(current, '.git'))) {
            return current;
        }
        current = path.dirname(current);
    }
    return null;
}

function tryCleanup(dirPath: string, force: boolean = false) {
    if (!activeTempDirs.has(dirPath)) return;
    if (!force) {
        const isInUse = vscode.window.visibleTextEditors.some(editor =>
            editor.document.uri.fsPath.startsWith(dirPath)
        );
        if (isInUse) return;
    }
    setTimeout(() => {
        try {
            if (fs.existsSync(dirPath)) {
                fs.rmSync(dirPath, { recursive: true, force: true });
            }
            activeTempDirs.delete(dirPath);
        } catch (e) {
            console.error(`Cleanup failed for ${dirPath}`, e);
        }
    }, 500);
}

export function deactivate() {
    for (const dir of activeTempDirs) {
        try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
    }
}
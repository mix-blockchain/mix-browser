import * as parity from '@parity/electron';
import { app } from 'electron'
import path from 'path'
import Web3 from 'web3'
import net from 'net'
import os from 'os'
import { spawn } from 'child_process'

let parityProcess

async function launch(window) {

	let parityPath
	let ipcPath

	if (os.platform() === 'win32') {
		ipcPath = '\\\\.\\pipe\\mix.ipc'
	}
	else {
		ipcPath = path.join(app.getPath('userData'), 'parity.ipc')
	}

	console.log('Parity IPC path: ' + ipcPath)

	try {
		parityPath = await parity.getParityPath()
	}
	catch (e) {
		try {
			parityPath = await parity.fetchParity(window, { parityChannel: 'v2.4.6', onProgress: (progress) => {
				window.webContents.send('parity-download-progress', progress)
			}})
		}
		catch (e) {
			console.error(e)
			return
		}
	}

	let args = [
		'--no-download',
		'--no-consensus',
		'--chain=mix',
		'--no-jsonrpc',
		'--no-ws',
		'--ipc-path=' + ipcPath,
		'--no-secretstore',
		'--force-sealing',
		'--infinite-pending-block',
		'--reseal-on-txs=all',
		'--reseal-min-period=0',
		'--reseal-max-period=600000',
		'--can-restart',
		'--pruning=fast',
		'--pruning-history=64',
		'--pruning-memory=0',
		'--logging=error',
	]

	parityProcess = spawn(parityPath, args)

	parityProcess.on('error', (err) => {
		try {
			window.webContents.send('parity-error', 'Failed to start (' + err + ')')
		} catch (e) {}
	});

	parityProcess.stdout.on('data', (data) => {
		try {
			window.webContents.send('parity-stdout', data.toString())
		} catch (e) {}
	})

	parityProcess.stderr.on('data', (data) => {
		try {
			window.webContents.send('parity-stderr', data.toString())
		} catch (e) {}
	})

	window.webContents.send('parity-running')
}

async function kill() {
	parityProcess.kill()
}

export default { launch, kill }

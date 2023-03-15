/*
	• Script Básico
	• Executando comando através de Arquivo, sem necessidade de "Switch".
	• (Recomendado) Use o "yarn" para baixar as bibliotecas.
	• Iniciar: bash start.sh
	• Parar: CTRL+C ou CTRL+Z (força a parada)
	•================================•
	• Instagram: @nause.dreams
	• GitHub: CrapNause
	• Grupo Whatsapp: bit.ly/GroupEthern_
*/
const {
	jidDecode,
	getContentType,
	DisconnectReason,
	useMultiFileAuthState,
	default: makeWASocket,
	downloadMediaMessage,
    fetchLatestBaileysVersion
} = require('@adiwajshing/baileys');
const fs = require('fs');
const pino = require("pino");
const FileType = require('file-type');
const { contentMsg } = require("../lib");
const syntaxerror = require('syntax-error');
const logger = pino({ timestamp: () => `,"time":"${new Date().toJSON()}"` }).child({ })
logger.level = 'silent'
logger.stream = 'store'
const pluginFolder = "./commands/";
let dirs = fs.readdirSync(pluginFolder);
const pluginFilter = filename => filename.endsWith(".js")
global.plugins = new Map()
global.plugins.list = {}
global.reload = (type, filename, cacheFile) => {
	type = type.toLowerCase()
	dirs = fs.readdirSync(pluginFolder)
	if (!pluginFilter(filename)) return

	global.plugins.type = dirs.filter(v => v !== "_").map(v => v)
	let position = -1
	let searObj = global.plugins.list[type]
	if (typeof searObj !== 'object') {
		searObj = global.plugins.list[type] = []
	}
	if (fs.existsSync(filename) && cacheFile) {
		fs.unwatchFile(filename);
		delete require.cache[require.resolve('.'+filename)]
	}
	try {
		position = searObj.findIndex((v) => v.fileName == filename.split('/').pop())
	} catch { }
	if (fs.existsSync(filename)) {
		const err = syntaxerror(fs.readFileSync(filename), filename)
		if (err) return console.error(`syntax error while loading [ ${filename} ]`, err)
		
		const render = require('.'+filename)
		const objKeys = Object.keys(render).length
		if (!objKeys) return console.warn(`Esperando obter Object no novo: ${filename}...`)
		if (position == -1) {
			console.info('Adicionando novo Plugin:', filename)
			global.plugins.list[type].push(render)
			global.plugins.set(render.name, render)
		} else {
			console.info('Atualizando Plugin:', filename);
			global.plugins.list[type][position] = render;
			global.plugins.set(render.name, render);
		}
	} else if (position !== -1) {
		console.warn('Deletando Plugin:', filename);
		global.plugins.delete(searObj[position].name);
		global.plugins.list[type].splice(position, 1);
	} else {
		console.warn('Não carregado:', filename);
	}
}
const readCommands = () => {
	for (let i of dirs) {
		fs.watch(pluginFolder+i+'/', (s_, a_) => global.reload(i, pluginFolder+i+'/'+a_, true));
		for (let file of fs.readdirSync(pluginFolder+i).filter((arq) => pluginFilter(arq))) {
			global.reload(i, pluginFolder+i+'/'+file)
		}
	}
	return 'pronto'
}
readCommands();
Object.freeze(global.reload);

const startMD = async () => {
	setInterval(() => {
		for (let i of fs.readdirSync(pluginFolder)) {
			fs.watch(pluginFolder+i+'/', (s_, a_) => {
				if (!global.plugins.list[i].find(v => v.fileName == a_)) global.reload(i, pluginFolder+i+'/'+a_, true)
			});
		}
	}, 10 * 1000);
	const isWhatsapp = await fetchLatestBaileysVersion();
	const { state, saveCreds } =  await useMultiFileAuthState('./tmp/Baileys/');
	const conn = await makeWASocket({
		logger,
		auth: state,
		...isWhatsapp,
		syncFullHistory: true,
		downloadHistory: false,
		printQRInTerminal: true,
		markOnlineOnConnect: true,
		browser: [ 'Ethern Baileys-MD', 'Firefox', '3.0' ],
		patchMessageBeforeSending: (message) => {
			const requiresPatch = !!(
				message.buttonsMessage ||
				message.templateMessage ||
				message.listMessage
			);
			if (requiresPatch) message = {
				viewOnceMessage: {
					message: {
						messageContextInfo: {
							deviceListMetadataVersion: 2,
							deviceListMetadata: {}
						},
						...message,
					},
				},
			};
			
			return message;
		}
	});
	conn.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update
		if (connection === 'close') {
  	      const reason = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut
			if (reason) console.warn('Reconectando...');
			startMD();
        }
        console.warn(update);
    });
    conn.ev.on('creds.update', () => saveCreds());
    conn.ev.on('messages.upsert', async msgs => {
    	if (msgs.type !== 'notify') return
    	
    	try {
			for (let m of msgs.messages) {
				if (!(typeof m == 'object' && m.message)) return
				if (!(m.key && m.key.remoteJid)) return
				
				await conn.readMessages([m.key]);
				m = contentMsg(conn, m);
				if (!m) return

				const command = m.data.command
				const isCmd = global.plugins.get(command) || Array.from(global.plugins.values()).filter((v) => Object.keys(v).length).find((v) => v.alias.find((x) => x.toLowerCase() == command)) || {}
				console.log('messages.upsert - [MSG]:', {
					nome: m.pushName,
					sender: m.sender,
					isGroup: m.isGroup,
					isCmd: (isCmd ? true : false),
					command: command,
					prefix: m.data.prefix
				});
				if ('start' in isCmd) isCmd.start.bind({
					m,
					...conn,
					...require("../lib")
				})();
			}
		} catch (error) {
			console.error('messages.upsert - [ERROR]:', error);
		}
    });

	conn.decodeJid = (jid) => {
		if (!jid) return ''
        if (/:\d+@/gi.test(jid)) {
            let decode = jidDecode(jid) || {}
            return decode.user && decode.server && decode.user + '@' + decode.server || jid
        } else return jid
    }
	conn.mention = (text = '') => {
		return /@([0-9]{5,16}|0)/.test(text) ? [...text.matchAll(/@([0-9]{5,16}|0)/g)].map(v => v[1] + '@s.whatsapp.net') : []
	}
	conn.reagir = (m, emoji) => new Promise(async(resolve, reject) => {
		if (!emoji) return
		if (!('key' in m)) return

    	await conn.sendMessage(m.key.remoteJid, {
			react: {
				text: emoji,
				key: m.key,
				senderTimestampMs: Math.round(Date.now() / 1000)
			}
		}).then(resolve).catch(reject);
	});
	conn.downloadSaveMsg = (m, type, filename = Date.now()) => new Promise(async (resolve, reject) => {
    	if (!type || /extendedText|conversation/.test(type)) return reject(`Nenhuma mensagem de mídia para "${type}"`);
    	if (fs.existsSync(filename)) return resolve(filename);

    	const buffer = await downloadMediaMessage({
			message: m
		}, 'buffer', { }, {
			logger,
			reuploadRequest: conn.updateMediaMessage
		})
		if (!Buffer.isBuffer(buffer)) return reject('Sem buffer...');
		
		const { mime, ext } = await FileType.fromBuffer(buffer) || { mime: 'application/octet-stream', ext: 'bin' }
		if (filename) {
			filename = './tmp/'+filename.split('/').pop()
			await fs.promises.writeFile(filename+'.'+ext, buffer);
		}

		resolve(filename && fs.existsSync(filename+'.'+ext) ? filename+'.'+ext : buffer);
    });
}

startMD();
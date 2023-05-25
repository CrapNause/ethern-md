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
} = require('@whiskeysockets/baileys');
const fs = require('fs');
const pino = require("pino");
const cron = require('node-cron');
const FileType = require('file-type');
const { contentMsg, ReadCommands } = require("../lib");
const logger = pino({ timestamp: () => `,"time":"${new Date().toJSON()}"` }).child({ })
logger.level = 'silent'
logger.stream = 'store'
const cmds = Object.freeze(new ReadCommands({ pasta: "./commands/", logs: true }));
cmds.readFiles(); // Renderizar
cron.schedule('17 * * * * *', () => {
	cmds.readFiles(); // Atualizar e Verificar se há nova pasta+arquivos
}, {
	scheduled: true,
	timezone: "America/Sao_Paulo"
});

const startMD = async () => {
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
		browser: [ 'Ethern Baileys-MD', 'Firefox', '3.0' ]
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
				const isCmd = cmds.readCommand(command)
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
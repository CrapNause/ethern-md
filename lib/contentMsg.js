/*
	• Instagram: @nause.dreams
	• GitHub: CrapNause
	• Grupo Whatsapp: bit.ly/GroupEthern_
*/
const {
	proto,
    getContentType
} = require('@whiskeysockets/baileys')
const util = require('util');

const viewOnce = (m) => {
	const msg = new Object()
	msg.msg = m.message[m.type].message
	msg.type = getContentType(msg.msg)
	msg.midia = /video|image/g.test(msg.type)
	msg.object = msg.msg[msg.type]
	return msg
}
exports.viewOnce = viewOnce

function deviceType(id) {
	if (!id) return null

	switch (id.length) {
		case 32:
			return 'Android'
		case 20:
			return id.substring(0,2) == "3A" ? 'iOS' : id.substring(0,2) == "3EB" ? "Whatsapp MEOW" :  'Web'
		case 16:
			return 'Baileys Mult-Device'
		case 12:
			return 'Baileys Legacy'
		case 18: 
			return 'Whatsapp Desktop'
		case 22:
			return 'Whatsapp WEB'
		default:
			return id+" | "+id.length
	}
}
exports.deviceType = deviceType

const getEdit = (str, type = 'all') => {
	if (typeof str !== 'string') return type == 'args' ? [] : ''
	if (!(str && str.length)) return type == 'args' ? [] : ''
	
	str = String(str)
	const rexPrefix = /^[°•π÷×¶∆£¢€¥®™+✓_=|~!?@#$%^&.©^]/gi
	const prefix = rexPrefix.test(str) ? str.match(rexPrefix)[0] : ''
	const command = (prefix.length && !str.lentgh && str.lentgh !== 1) ? str.slice(1).split(/ +/).filter(v => v.length).map(v => v.toLowerCase()).shift() : ''
	const result = str.split(/ +/)
	const arg = (prefix.length ? result.filter(v => ![prefix, command, prefix+command].includes(v.toLowerCase())) : result.filter(v => v.length)).join(' ')
	
	switch (type) {
		case 'prefix':
			return prefix
		case "command":
			return command || ''
		case "arg":
			return arg || ''
		case "args":
			return arg.split(/ +/).filter(v => v.length)
		case 'all':
			return {
				prefix: prefix,
				command: command,
				arg: arg,
				args: arg.split(/ +/).filter(v => v.length)
			}
		default:
			return null
	}
}
exports.getEdit = getEdit
exports.contentMsg = (conn, m) => {
	if (!(m && typeof m == 'object')) return null
	
    const M = proto.WebMessageInfo
    if (m.key) {
        m.id = m.key.id
        m.isBaileys = m.id.startsWith('BAE5') && m.id.length === 16
        m.from = m.key.remoteJid
        m.fromMe = m.key.fromMe
        m.isGroup = m.from.endsWith('@g.us')
        if (m.isGroup || m.from == 'status@broadcast') {
			m.sender = conn.decodeJid(m.participant || m.key.participant) || ""
		} else {
			m.sender = conn.decodeJid(m.from) || ""
		}
		if (m.fromMe) m.sender = conn.decodeJid(conn.user.id) || ""
    }
    if (!(m.message && typeof m.message == 'object')) return null

	let mtype = getContentType(m.message)
	if (!(mtype && mtype.length)) return null
	if (/ephemeral/.test(mtype)) {
		m.message = m.message.ephemeralMessage.message
		delete m.message[mtype]
	}
	
	mtype = getContentType(m.message)
	if (/documentW/.test(mtype)) {
		m.message = m.message[mtype].message
		delete m.message[mtype]
	}
	
	m.deviceType = deviceType(m.id)
	m.type = getContentType(m.message) || 'criptado'
	m.getViewType = /view/.test(m.type) && viewOnce(m).type
	m.msg = /view/.test(m.type) ? viewOnce(m).object : m.message[m.type]
	m.chats = (m.type === 'conversation') ? m.message.conversation : /listR/.test(m.type) ? m.msg.singleSelectReply.selectedRowId : /buttonsR/.test(m.type) ? m.msg.selectedButtonId : /templateB/.test(m.type) ? m.msg.selectedId : /document/.test(m.type) ? (m.msg.caption || m.msg.fileName) : (m.type === 'extendedTextMessage') ? m.msg.text : (m.msg?.caption || '')
	try {
		let quoted = m.quoted = m.msg.contextInfo.quotedMessage
		let type = getContentType(quoted)
		if (/view|documentWith/.test(type)) {
			quoted = quoted[type].message
			type = getContentType(quoted)
		}
		m.quoted = quoted[type]
		if (typeof m.quoted === 'string') m.quoted = { text: m.quoted }
		
		m.quoted.getViewType = m.quoted.viewOnce && type
		m.quoted.type = type
		m.quoted.id = m.msg.contextInfo.stanzaId
		m.quoted.chat = conn.decodeJid(m.msg.contextInfo.remoteJid || m.sender)
		m.quoted.isBaileys = m.quoted.id.startsWith('BAE5') && m.quoted.id.length == 16
		m.quoted.sender = conn.decodeJid(m.msg.contextInfo.participant || m.sender)
		m.quoted.fromMe = m.quoted.sender == conn.decodeJid(conn.user.id)
		m.quoted.chats = /listR/.test(type) ? m.quoted.singleSelectReply.selectedRowId : /buttonsR/.test(type) ? m.quoted.selectedButtonId : /templateB/.test(type) ? m.quoted.selectedId : /document/.test(type) ? (m.quoted.caption || m.quoted.fileName) : /extendedText|conversation/.test(type) ? m.quoted.text : m.quoted.caption || ''
		m.quoted.deviceType = deviceType(m.quoted.id)
		m.quoted.fakeObj = M.fromObject({
			key: {
				remoteJid: m.from,
				fromMe: m.quoted.fromMe,
				id: m.quoted.id,
				...(m.isGroup ? { participant: m.quoted.sender } : {})
			},
			message: quoted
		})
		m.quoted.delete = () => conn.sendMessage(m.from, { delete: m.quoted.fakeObj })
	} catch (err) {
		m.quoted = null
	}
	m.mentioned = typeof m.msg == 'object' && "contextInfo" in m.msg && m.msg?.contextInfo?.mentionedJid || []
	m.ephemeralExpiration = typeof m.msg == 'object' && "contextInfo" in m.msg && m.msg?.contextInfo?.expiration || 0
    m.delete = async () => m.type == 'protocolMessage' ? '' : await conn.sendMessage(m.from, { delete: m.key })
	m.viewMedia = m.quoted?.getViewType || m.getViewType
	m.isMidiaMe = /video|image|document|audio|sticker|view|buttonsM|templateM/.test(m.type)
	m.isMidiaQuoted = m.quoted && (/video|image|document|audio|sticker|view/.test(m.typeQ) || /buttonsM/.test(m.typeQ) && /image|video|document/.test(getContentType(m.quoted)) || /templateM/.test(m.typeQ) && /document|video|image/.test(getContentType(m.quoted.hydratedFourRowTemplate)))
	m.isMidia = m.isMidiaQuoted || m.isMidiaMe
	m.data = {
		prefix: getEdit(m.chats, 'prefix'),
		command: getEdit(m.chats, 'command'),
		args: getEdit(m.chats, 'args'),
		arg: getEdit(m.chats, 'arg'),
		quoted: {
			prefix: getEdit(m.quoted?.chats, 'prefix'),
			command: getEdit(m.quoted?.chats, 'command'),
			args: getEdit(m.quoted?.chats, 'args'),
			arg: getEdit(m.quoted?.chats, 'arg')
		}
	}
	m.fakeObj = M.fromObject({
		key: m.key,
		message: { [m.getViewType || m.type]: m.msg },
		pushName: m.name,
		messageTimestamp: m.messageTimestamp
	});
	m.downLocal = async (fileName) => {
		if (!m.isMidia) return null
		if (typeof fileName !== 'string') fileName = Date.now()
		
		let typeMsg = m.typeQ.replaceAll("WithCaption", '')
		let object = m.quoted?.fakeObj?.message || m.fakeObj.message
		if (m.quoted && /buttonsM/.test(typeMsg)) {
			typeMsg = getContentType(m.quoted)
			if (!/document|video|image/.test(typeMsg)) return null

			object = { [typeMsg]: m.quoted[typeMsg] }
		} else if (m.quoted && /templateM/.test(typeMsg)) {
			typeMsg = getContentType(m.quoted.hydratedFourRowTemplate)
			if (!/document|video|image/.test(typeMsg)) return null
			
			object = { [typeMsg]: m.quoted.hydratedFourRowTemplate[typeMsg] }
		}
		return await conn.downloadSaveMsg(object, typeMsg, fileName)
	}
	m.reply = async (str, ops = {}) => {
		let { reagir, from, options, trim, citar, exec, ephemeral } = Object.assign({ reagir: false, from: m.from, options: {}, trim: true, citar: true, exec: true, ephemeral: m.ephemeralExpiration }, (typeof ops == 'object' ? ops : {}))
		//if (!str) return m.reply("Sem texto...", { reagir: "📄", from })
		await conn.sendPresenceUpdate('available', from);
		await conn.sendPresenceUpdate('composing', from);
		const mentions = conn.parseMention(str)
		if (exec) {
			try {
				str = await eval(str)
				if (typeof str !== 'string') str = (JSON.stringify(str, null, '\t') == '{}') ? util.inspect(str) : JSON.stringify(str, null, '\t')
			} catch {
				str = trim ? str.trim() : str
			}
		} else {
			str = trim ? str.trim() : str
		}
		if (!('quoted' in options) && citar) options.quoted = m.fakeObj
	
		const result = await conn.sendMessage(from, { text: str, mentions, ...options }, { ephemeralExpiration: ephemeral, ...options })
		if (reagir && result) await conn.reagir(m, reagir)
		
		return result
	}
	if (m.msg && m.type == 'protocolMessage') conn.ev.emit('message.delete', m.message[m.type].key)
	
	return m
}
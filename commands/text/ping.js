const moment = require("moment-timezone");
const processsTime = (timestamp) => {
	return moment.duration(moment() - moment(timestamp * 1000)).asSeconds()
}

module.exports = {
	fileName: "ping.js",
    name: "ping",
    alias: ['adv', 'uptime', 'bot'],
    desc: "Latência de mensagem recebida.",
    type: "texto",
    isQuery: true,
    isPrivate: true,
    async start() {
    	const { from, data, sender, reply, messageTimestamp, deviceType, quoted } = this.m
    	const uptime = process.uptime()
    	let str = "Comando recebido através do "+deviceType+"."
    	if (quoted?.sender !== sender) str += `\n• Mensagem citada, vem do sistema [ *${quoted.deviceType == "Baileys" ? "Servidor Baileys" : quoted.deviceType}* ].`

    	await reply(`• Tempo de resposta: *${processsTime(messageTimestamp)}ms*\n• Tempo de atividade: *${this.time(uptime).trim()}*.\n-\n• ${str}`, { reagir: '⚡' });
	}
}
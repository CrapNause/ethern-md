/*
	• Instagram: @nause.dreams
	• GitHub: CrapNause
	• Grupo Whatsapp: bit.ly/GroupEthern_
*/
const moment = require("moment-timezone");
const time = (second) => {
	let d, mh, y, h, m, s;
	second = Number(second);
	if (typeof second !== 'number') return ''
	if (`${second}`.length == 13 && !`${second}`.includes('.')) {
		var secomdd = ms(Date.now() - second)
		seconds = /-/.test(secomdd.seconds) ? (second - Date.now()) : (Date.now() - second)
		const roundTowardsZero = seconds > 0 ? Math.floor : Math.ceil;
		d = roundTowardsZero(seconds / 86400000)
		mh = Math.floor(d / 31);
		y = Math.floor(mh / 12);
		h = roundTowardsZero(seconds / 3600000) % 24
		m = roundTowardsZero(seconds / 60000) % 60
		s = roundTowardsZero(seconds / 1000) % 60
	} else if (`${second}`.length == 10 && !`${second}`.includes('.')) {
		let timeMoment = () => moment(second * 1000).tz('America/Sao_Paulo')
		d = timeMoment().format("DD")
		mh = timeMoment().format("MM")
		y = Math.floor(mh / 12);
		h = timeMoment().format("HH")
		m = timeMoment().format("mm")
		s = timeMoment().format("ss")
	} else {
		d = Math.floor(second / (3600 * 24));
		mh = Math.floor(d / 31);
		y = Math.floor(mh / 12);
		h = Math.floor((second % (3600 * 24)) / 3600);
		m = Math.floor((second % 3600) / 60);
		s = Math.floor(second % 60);
	}
	
	var tM = !s ? (!m ? "" : " e ") : ", "
	
	var sD = !s ? "" : s+(s == 1 ? " segundo" : " segundos")
	var mS = m+(m == 1 ? " minuto" : " minutos")+(s ? " e "+sD : "")
	var hms = (
		h+(h == 1 ? " hora" : " horas")+(
			m ? tM+mS : (s ? " e "+sD : "")
		)
	)
	var dhms = (
		d+(d == 1 ? " dia" : " dias")+(
			h ? " - "+hms : (
				m ? tM+mS : (s ? " e "+sD : "")
			)
		)
	)
	var mdhms = (
		mh+(mh == 1 ? " mês" : " meses")+(
			d ? " | "+dhms : (
				h ? " - "+hms : (
					m ? tM+mS : (s ? " e "+sD : "")
				)
			)
		)
	)
	var ymdhms = (
		y+(y == 1 ? " ano" : " anos")+(
			mh ? " | "+mdhms : (
				d ? " | "+dhms : (
					h ? " - "+hms : (
						m ? tM+mS : (s ? " e "+sD : "")
					)
				)
			)
		)
	)
	
	return y ? ymdhms : mh ? mdhms : d ? dhms : h ? hms : m ? mS : sD
}

module.exports = {
	time
}
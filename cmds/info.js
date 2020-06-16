const help_server = require('../functions/helpserver.js');

function cmd_info(lang, msg, args, line, wiki) {
	if ( args.join('') ) this.LINK(lang, msg, line.split(' ').slice(1).join(' '), wiki);
	else {
		msg.sendChannel( lang.disclaimer.replaceSave( '%s', ( msg.channel.type === 'text' && msg.guild.members.cache.get(process.env.owner) || '*MarkusRost*' ).toString() ) + '\n<' + process.env.patreon + '>' );
		help_server(lang, msg);
		this.invite(lang, msg, args, line);
	}
}

module.exports = {
	name: 'info',
	everyone: true,
	pause: false,
	owner: false,
	run: cmd_info
};
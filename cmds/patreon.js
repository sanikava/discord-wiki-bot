var db = require('../util/database.js');

function cmd_patreon(lang, msg, args, line, wiki) {
	if ( msg.channel.id !== process.env.channel || !args.join('') ) {
		if ( msg.channel.type !== 'text' || !pause[msg.guild.id] ) this.LINK(lang, msg, line, wiki);
		return;
	}
	
	if ( args[0] === 'enable' && /^\d+$/.test(args.slice(1).join(' ')) ) return msg.client.shard.broadcastEval( `this.guilds.cache.get('${args[1]}')?.name` ).then( results => {
		var guild = results.find( result => result !== null );
		if ( guild === undefined ) return msg.replyMsg( 'I\'m not on a server with the id `' + args[1] + '`.', {}, true );
		if ( args[1] in patreons ) return msg.replyMsg( '"' + guild + '" has the patreon features already enabled.', {}, true );
		db.get( 'SELECT count, COUNT(guild) guilds FROM patreons LEFT JOIN discord ON discord.patreon = patreons.patreon WHERE patreons.patreon = ? GROUP BY patreons.patreon', [msg.author.id], (dberror, row) => {
			if ( dberror ) {
				console.log( '- Error while getting the patreon: ' + dberror );
				msg.replyMsg( 'I got an error while searching for you, please try again later.', {}, true );
				return dberror;
			}
			if ( !row ) return msg.replyMsg( 'you can\'t have any server.', {}, true );
			if ( row.count <= row.guilds ) return msg.replyMsg( 'you already reached your maximal server count.', {}, true );
			db.run( 'UPDATE discord SET patreon = ? WHERE guild = ? AND channel IS NULL', [msg.author.id, args[1]], function (error) {
				if ( error ) {
					console.log( '- Error while updating the guild: ' + error );
					msg.replyMsg( 'I got an error while updating the server, please try again later.', {}, true );
					return error;
				}
				if ( !this.changes ) return db.run( 'INSERT INTO discord(guild, patreon) VALUES(?, ?)', [args[1], msg.author.id], function (inserror) {
					if ( inserror ) {
						console.log( '- Error while adding the guild: ' + inserror );
						msg.replyMsg( 'I got an error while updating the server, please try again later.', {}, true );
						return inserror;
					}
					console.log( '- Guild successfully added.' );
					msg.client.shard.broadcastEval( `global.patreons['${args[1]}'] = '${process.env.prefix}'` );
					msg.replyMsg( 'the patreon features are now enabled on "' + guild + '".', {}, true );
				} );
				console.log( '- Guild successfully updated.' );
				msg.client.shard.broadcastEval( `global.patreons['${args[1]}'] = '${process.env.prefix}'` );
				msg.replyMsg( 'the patreon features are now enabled on "' + guild + '".', {}, true );
			} );
		} );
	} );
	
	if ( args[0] === 'disable' && /^\d+$/.test(args.slice(1).join(' ')) ) return msg.client.shard.broadcastEval( `this.guilds.cache.get('${args[1]}')?.name` ).then( results => {
		var guild = results.find( result => result !== null );
		if ( guild === undefined ) return msg.replyMsg( 'I\'m not on a server with the id `' + args[1] + '`.', {}, true );
		if ( !( args[1] in patreons ) ) return msg.replyMsg( '"' + guild + '" doesn\'t have the patreon features enabled.', {}, true );
		db.get( 'SELECT lang, inline FROM discord WHERE guild = ? AND patreon = ?', [args[1], msg.author.id], (dberror, row) => {
			if ( dberror ) {
				console.log( '- Error while getting the guild: ' + dberror );
				msg.replyMsg( 'I got an error while searching for the server, please try again later.', {}, true );
				return dberror;
			}
			if ( !row ) return msg.replyMsg( 'you didn\'t enable the patreon features for "' + guild + '"!', {}, true );
			db.run( 'UPDATE discord SET lang = ?, inline = ?, prefix = ?, patreon = NULL WHERE guild = ?', [row.lang, row.inline, process.env.prefix, args[1]], function (error) {
				if ( error ) {
					console.log( '- Error while updating the guild: ' + error );
					msg.replyMsg( 'I got an error while updating the server, please try again later.', {}, true );
					return error;
				}
				console.log( '- Guild successfully updated.' );
				msg.client.shard.broadcastEval( `delete global.patreons['${args[1]}']` );
				msg.replyMsg( 'the patreon features are now disabled on "' + guild + '".', {}, true );
			} );
			db.all( 'SELECT configid FROM verification WHERE guild = ? ORDER BY configid ASC', [args[1]], (dberror, rows) => {
				if ( dberror ) {
					console.log( '- Error while getting the verifications: ' + dberror );
					return dberror;
				}
				var ids = rows.slice(10).map( row => row.configid );
				if ( ids.length ) db.run( 'DELETE FROM verification WHERE guild = ? AND configid IN (' + ids.map( configid => '?' ).join(', ') + ')', [args[1], ...ids], function (error) {
					if ( error ) {
						console.log( '- Error while deleting the verifications: ' + error );
						return error;
					}
					console.log( '- Verifications successfully deleted.' );
				} );
			} );
		} );
	} );
	
	if ( args[1] ) args[1] = args[1].replace( /^\\?<@!?(\d+)>$/, '$1' );
	
	if ( args[0] === 'check' ) {
		if ( !args.slice(1).join('') ) return db.get( 'SELECT count, GROUP_CONCAT(guild) guilds FROM patreons LEFT JOIN discord ON discord.patreon = patreons.patreon WHERE patreons.patreon = ? GROUP BY patreons.patreon', [msg.author.id], (dberror, row) => {
			if ( dberror ) {
				console.log( '- Error while getting the patreon: ' + dberror );
				msg.replyMsg( 'I got an error while searching for you, please try again later.', {}, true );
				return dberror;
			}
			if ( !row ) return msg.replyMsg( 'you can\'t have any server.', {}, true );
			var text = 'you can have up to ' + row.count + ' server.\n\n';
			if ( row.guilds ) {
				msg.client.shard.broadcastEval( `'${row.guilds}'.split(',').map( guild => this.guilds.cache.get(guild)?.name )` ).then( results => {
					var guilds = row.guilds.split(',').map( (guild, i) => '`' + guild + '` ' + ( results.find( result => result[i] !== null )?.[i] || '' ) );
					text += 'Currently you have ' + guilds.length + ' server:\n' + guilds.join('\n');
					msg.replyMsg( text, {}, true );
				} );
			}
			else {
				text += '*You don\'t have any server yet.*';
				msg.replyMsg( text, {}, true );
			}
		} );
		if ( msg.isOwner() && /^\d+$/.test(args.slice(1).join(' ')) ) return db.get( 'SELECT count, GROUP_CONCAT(guild) guilds FROM patreons LEFT JOIN discord ON discord.patreon = patreons.patreon WHERE patreons.patreon = ? GROUP BY patreons.patreon', [args[1]], (dberror, row) => {
			if ( dberror ) {
				console.log( '- Error while getting the patreon: ' + dberror );
				msg.replyMsg( 'I got an error while searching for <@' + args[1] + '>, please try again later.', {}, true );
				return dberror;
			}
			if ( !row ) return msg.replyMsg( '<@' + args[1] + '> can\'t have any server.', {}, true );
			var text = '<@' + args[1] + '> can have up to ' + row.count + ' server.\n\n';
			if ( row.guilds ) {
				msg.client.shard.broadcastEval( `'${row.guilds}'.split(',').map( guild => this.guilds.cache.get(guild)?.name )` ).then( results => {
					var guilds = row.guilds.split(',').map( (guild, i) => '`' + guild + '` ' + ( results.find( result => result[i] !== null )?.[i] || '' ) );
					text += 'Currently they have ' + guilds.length + ' server:\n' + guilds.join('\n');
					msg.replyMsg( text, {}, true );
				} );
			}
			else {
				text += '*They don\'t have any server yet.*';
				msg.replyMsg( text, {}, true );
			}
		} );
	}
	
	if ( args[0] === 'edit' && msg.isOwner() && /^\d+ [\+\-]?\d+$/.test(args.slice(1).join(' ')) ) return db.get( 'SELECT count, GROUP_CONCAT(guild) guilds FROM patreons LEFT JOIN discord ON discord.patreon = patreons.patreon WHERE patreons.patreon = ? GROUP BY patreons.patreon', [args[1]], (dberror, row) => {
		if ( dberror ) {
			console.log( '- Error while getting the patreon: ' + dberror );
			msg.replyMsg( 'I got an error while searching for <@' + args[1] + '>, please try again later.', {}, true );
			return dberror;
		}
		var value = parseInt(args[2], 10);
		var count = ( row ? row.count : 0 );
		var guilds = ( row && row.guilds ? row.guilds.split(',') : [] );
		if ( args[2].startsWith( '+' ) || args[2].startsWith( '-' ) ) count += value;
		else count = value;
		if ( count <= 0 ) return db.run( 'DELETE FROM patreons WHERE patreon = ?', [args[1]], function (error) {
			if ( error ) {
				console.log( '- Error while deleting the patreon: ' + error );
				msg.replyMsg( 'I got an error while deleting <@' + args[1] + '>, please try again later.', {}, true );
				return error;
			}
			console.log( '- Patreon successfully deleted.' );
			if ( !guilds.length ) return msg.replyMsg( '<@' + args[1] + '> is no longer a patreon.', {}, true );
			db.each( 'SELECT guild, lang, inline FROM discord WHERE guild IN (' + guilds.map( guild => '?' ).join(', ') + ') AND channel IS NULL', guilds, (eacherror, eachrow) => {
				if ( eacherror ) {
					console.log( '- Error while getting the guild: ' + eacherror );
					msg.replyMsg( 'I couldn\'t disable the patreon features.', {}, true );
					return eacherror;
				}
				db.run( 'UPDATE discord SET lang = ?, inline = ?, prefix = ? WHERE guild = ?', [eachrow.lang, eachrow.inline, process.env.prefix, eachrow.guild], function (uperror) {
					if ( uperror ) {
						console.log( '- Error while updating the guild: ' + uperror );
						msg.replyMsg( 'I couldn\'t disable the patreon features for `' + eachrow.guild + '`.', {}, true );
						return uperror;
					}
					console.log( '- Guild successfully updated.' );
					msg.client.shard.broadcastEval( `delete global.patreons['${eachrow.guild}']` );
				} );
			}, (eacherror) => {
				if ( eacherror ) {
					console.log( '- Error while getting the guilds: ' + eacherror );
					msg.replyMsg( 'I couldn\'t disable the patreon features for `' + guilds.join('`, `') + '`.', {}, true );
					return eacherror;
				}
				msg.replyMsg( '<@' + args[1] + '> is no longer a patreon.', {}, true );
			} );
			db.each( 'SELECT a.guild, GROUP_CONCAT(DISTINCT a.configid) configids FROM verification a LEFT JOIN verification b ON a.guild = b.guild WHERE a.guild IN (' + guilds.map( guild => '?' ).join(', ') + ') GROUP BY a.guild', guilds, (eacherror, eachrow) => {
				if ( eacherror ) {
					console.log( '- Error while getting the verifications: ' + eacherror );
					return dberror;
				}
				var ids = eachrow.configids.split(',').slice(10).map( row => row.configid );
				if ( ids.length ) db.run( 'DELETE FROM verification WHERE guild = ? AND configid IN (' + ids.map( configid => '?' ).join(', ') + ')', [eachrow.guild, ...ids], function (uperror) {
					if ( uperror ) {
						console.log( '- Error while deleting the verifications: ' + uperror );
						return uperror;
					}
					console.log( '- Verifications successfully deleted.' );
				} );
			}, (eacherror) => {
				if ( eacherror ) {
					console.log( '- Error while getting the verifications: ' + eacherror );
					return eacherror;
				}
			} );
		} );
		if ( !row ) return db.run( 'INSERT INTO patreons(patreon, count) VALUES(?, ?)', [args[1], count], function (error) {
			if ( error ) {
				console.log( '- Error while adding the patreon: ' + error );
				msg.replyMsg( 'I got an error while adding <@' + args[1] + '>, please try again later.', {}, true );
				return error;
			}
			console.log( '- Patreon successfully added.' );
			msg.replyMsg( '<@' + args[1] + '> can now have up to ' + count + ' server.', {}, true );
		} );
		db.run( 'UPDATE patreons SET count = ? WHERE patreon = ?', [count, args[1]], function (error) {
			if ( error ) {
				console.log( '- Error while updating the patreon: ' + error );
				msg.replyMsg( 'I got an error while updating <@' + args[1] + '>, please try again later.', {}, true );
				return error;
			}
			console.log( '- Patreon successfully updated.' );
			var text = '<@' + args[1] + '> can now have up to ' + count + ' server.';
			if ( count < guilds.length ) text += '\n\n**They are now above their server limit!**';
			msg.replyMsg( text, {}, true );
		} );
	} );
	
	if ( msg.channel.type !== 'text' || !pause[msg.guild.id] ) this.LINK(lang, msg, line, wiki);
}

module.exports = {
	name: 'patreon',
	everyone: true,
	pause: true,
	owner: true,
	run: cmd_patreon
};
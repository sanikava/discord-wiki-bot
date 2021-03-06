const {MessageEmbed} = require('discord.js');
const {timeoptions} = require('../../../util/default.json');

var allSites = [];
const getAllSites = require('../../../util/allSites.js');
getAllSites.then( sites => allSites = sites );

function gamepedia_overview(lang, msg, wiki, reaction, spoiler) {
	if ( !allSites.length ) getAllSites.update();
	got.get( wiki + 'api.php?action=query&meta=allmessages|siteinfo&ammessages=custom-Wiki_Manager|custom-GamepediaNotice|custom-FandomMergeNotice&amenableparser=true&siprop=general|statistics&titles=Special:Statistics&format=json', {
		responseType: 'json'
	} ).then( response => {
		var body = response.body;
		if ( body && body.warnings ) log_warn(body.warnings);
		if ( response.statusCode !== 200 || !body || body.batchcomplete === undefined || !body.query || !body.query.pages ) {
			if ( wiki.noWiki(response.url) || response.statusCode === 410 ) {
				console.log( '- This wiki doesn\'t exist!' );
				msg.reactEmoji('nowiki');
			}
			else {
				console.log( '- ' + response.statusCode + ': Error while getting the statistics: ' + ( body && body.error && body.error.info ) );
				msg.sendChannelError( spoiler + '<' + wiki.toLink('Special:Statistics') + '>' + spoiler );
			}
			
			if ( reaction ) reaction.removeEmoji();
		}
		else {
			var site = false;
			if ( allSites.some( site => site.wiki_domain === body.query.general.servername ) ) {
				site = allSites.find( site => site.wiki_domain === body.query.general.servername );
				
				var name = [lang.get('overview.name'), site.wiki_display_name];
				var created = [lang.get('overview.created'), new Date(parseInt(site.created + '000', 10)).toLocaleString(lang.get('dateformat'), timeoptions)];
				var manager = [lang.get('overview.manager'), site.wiki_managers];
				var official = [lang.get('overview.official'), lang.get('overview.' + ( site.official_wiki ? 'yes' : 'no' ))];
				var crossover = [lang.get('overview.crossover'), ( site.wiki_crossover ? '<https://' + site.wiki_crossover + '/>' : '' )];
				var description = [lang.get('overview.description'), site.wiki_description];
				var image = [lang.get('overview.image'), site.wiki_image];
				
				if ( description[1] ) {
					description[1] = description[1].escapeFormatting();
					if ( description[1].length > 1000 ) description[1] = description[1].substring(0, 1000) + '\u2026';
				}
				if ( image[1] && image[1].startsWith( '/' ) ) image[1] = wiki.substring(0, wiki.length - 1) + image[1];
			}
			var articles = [lang.get('overview.articles'), body.query.statistics.articles];
			var pages = [lang.get('overview.pages'), body.query.statistics.pages];
			var edits = [lang.get('overview.edits'), body.query.statistics.edits];
			var users = [lang.get('overview.users'), body.query.statistics.activeusers];
			
			var title = body.query.pages['-1'].title;
			var pagelink = wiki.toLink(title, '', '', body.query.general);
			
			if ( msg.showEmbed() ) {
				var text = '<' + pagelink + '>';
				var embed = new MessageEmbed().setAuthor( body.query.general.sitename ).setTitle( title.escapeFormatting() ).setURL( pagelink ).setThumbnail( ( /^(?:https?:)?\/\//.test(body.query.general.logo) ? body.query.general.logo.replace( /^(?:https?:)?\/\//, 'https://' ) : body.query.general.server + ( body.query.general.logo.startsWith( '/' ) ? '' : '/' ) + body.query.general.logo ) );
			}
			else {
				var embed = {};
				var text = '<' + pagelink + '>\n\n';
			}
			
			if ( wiki.isFandom() ) got.get( 'https://community.fandom.com/api/v1/Wikis/ByString?expand=true&includeDomain=true&limit=10&string=' + body.query.general.servername + body.query.general.scriptpath + '&format=json', {
				responseType: 'json'
			} ).then( ovresponse => {
				var ovbody = ovresponse.body;
				if ( ovresponse.statusCode !== 200 || !ovbody || ovbody.exception || !ovbody.items || !ovbody.items.length ) {
					console.log( '- ' + ovresponse.statusCode + ': Error while getting the wiki details: ' + ( ovbody && ovbody.exception && ovbody.exception.details ) );
					msg.sendChannelError( spoiler + '<' + wiki.toLink('Special:Statistics', '', '', body.query.general) + '>' + spoiler );
					
					if ( reaction ) reaction.removeEmoji();
				}
				else if ( ovbody.items.some( site => site.url === body.query.general.server + ( body.query.general.scriptpath ? body.query.general.scriptpath + '/' : '' ) ) ) {
					site = ovbody.items.find( site => site.url === body.query.general.server + ( body.query.general.scriptpath ? body.query.general.scriptpath + '/' : '' ) );
					
					var vertical = [lang.get('overview.vertical'), site.hub];
					var topic = [lang.get('overview.topic'), site.topic];
					var founder = [lang.get('overview.founder'), site.founding_user_id];
					var manager = [lang.get('overview.manager'), body.query.allmessages[0]['*']];
					var crossover = [lang.get('overview.crossover')];
					if ( body.query.allmessages[1]['*'] ) {
						crossover.push('<https://' + body.query.allmessages[1]['*'] + '.gamepedia.com/>');
					}
					else if ( body.query.allmessages[2]['*'] ) {
						let merge = body.query.allmessages[2]['*'].split('/');
						crossover.push('<https://' + merge[0] + '.fandom.com/' + ( merge[1] ? merge[1] + '/' : '' ) + '>');
					}
					var created = [lang.get('overview.created'), new Date(site.creation_date).toLocaleString(lang.get('dateformat'), timeoptions)];
					var description = [lang.get('overview.description'), site.desc];
					var image = [lang.get('overview.image'), site.image];
					
					if ( description[1] ) {
						description[1] = description[1].escapeFormatting();
						if ( description[1].length > 1000 ) description[1] = description[1].substring(0, 1000) + '\u2026';
					}
					if ( image[1] && image[1].startsWith( '/' ) ) image[1] = wiki.substring(0, wiki.length - 1) + image[1];
					
					if ( msg.showEmbed() ) {
						embed.addField( vertical[0], vertical[1], true );
						if ( topic[1] ) embed.addField( topic[0], topic[1], true );
					}
					else text += vertical.join(' ') + ( topic[1] ? '\n' + topic.join(' ') : '' );
					
					if ( founder[1] > 0 ) got.get( wiki + 'api.php?action=query&list=users&usprop=&ususerids=' + founder[1] + '&format=json', {
						responseType: 'json'
					} ).then( usresponse => {
						var usbody = usresponse.body;
						if ( usbody && usbody.warnings ) log_warn(usbody.warnings);
						if ( usresponse.statusCode !== 200 || !usbody || !usbody.query || !usbody.query.users || !usbody.query.users[0] ) {
							console.log( '- ' + usresponse.statusCode + ': Error while getting the wiki founder: ' + ( usbody && usbody.error && usbody.error.info ) );
							founder[1] = 'ID: ' + founder[1];
						}
						else {
							var user = usbody.query.users[0].name;
							if ( msg.showEmbed() ) founder[1] = '[' + user + '](' + wiki.toLink('User:' + user, '', '', body.query.general, true) + ')';
							else founder[1] = user;
						}
					}, error => {
						console.log( '- Error while getting the wiki founder: ' + error );
						founder[1] = 'ID: ' + founder[1];
					} ).finally( () => {
						if ( msg.showEmbed() ) {
							embed.addField( founder[0], founder[1], true );
							if ( manager[1] ) embed.addField( manager[0], '[' + manager[1] + '](' + wiki.toLink('User:' + manager[1], '', '', body.query.general, true) + ') ([' + lang.get('overview.talk') + '](' + wiki.toLink('User talk:' + manager[1], '', '', body.query.general, true) + '))', true );
							embed.addField( created[0], created[1], true ).addField( articles[0], articles[1], true ).addField( pages[0], pages[1], true ).addField( edits[0], edits[1], true ).addField( users[0], users[1], true ).setFooter( lang.get('overview.inaccurate') );
							if ( crossover[1] ) {
								var crossoverSite = allSites.find( site => '<https://' + site.wiki_domain + '/>' === crossover[1] );
								if ( crossoverSite ) embed.addField( crossover[0], '[' + crossoverSite.wiki_display_name + '](' + crossover[1] + ')', true );
								else embed.addField( crossover[0], crossover[1], true );
							}
							if ( description[1] ) embed.addField( description[0], description[1] );
							if ( image[1] ) embed.addField( image[0], image[1] ).setImage( image[1] );
						}
						else {
							text += '\n' + founder.join(' ') + ( manager[1] ? '\n' + manager.join(' ') : '' ) + '\n' + created.join(' ') + '\n' + articles.join(' ') + '\n' + pages.join(' ') + '\n' + edits.join(' ') + '\n' + users.join(' ');
							if ( crossover[1] ) text += '\n' + crossover.join(' ');
							if ( description[1] ) text += '\n' + description.join(' ');
							if ( image[1] ) {
								text += '\n' + image.join(' ');
								if ( msg.uploadFiles() ) embed.files = [image[1]];
							}
							text += '\n\n*' + lang.get('overview.inaccurate') + '*';
						}
						
						msg.sendChannel( spoiler + text + spoiler, {embed} );
						
						if ( reaction ) reaction.removeEmoji();
					} );
					else {
						founder[1] = lang.get('overview.none');
						if ( msg.showEmbed() ) {
							embed.addField( founder[0], founder[1], true ).addField( created[0], created[1], true ).addField( articles[0], articles[1], true ).addField( pages[0], pages[1], true ).addField( edits[0], edits[1], true ).addField( users[0], users[1], true ).setFooter( lang.get('overview.inaccurate') );
							if ( crossover[1] ) {
								var crossoverSite = allSites.find( site => '<https://' + site.wiki_domain + '/>' === crossover[1] );
								if ( crossoverSite ) embed.addField( crossover[0], '[' + crossoverSite.wiki_display_name + '](' + crossover[1] + ')', true );
								else embed.addField( crossover[0], crossover[1], true );
							}
							if ( description[1] ) embed.addField( description[0], description[1] );
							if ( image[1] ) embed.addField( image[0], image[1] ).setImage( image[1] );
						}
						else {
							text += '\n' + founder.join(' ') + '\n' + created.join(' ') + '\n' + articles.join(' ') + '\n' + pages.join(' ') + '\n' + edits.join(' ') + '\n' + users.join(' ');
							if ( crossover[1] ) text += '\n' + crossover.join(' ');
							if ( description[1] ) text += '\n' + description.join(' ');
							if ( image[1] ) {
								text += '\n' + image.join(' ');
								if ( msg.uploadFiles() ) embed.files = [image[1]];
							}
							text += '\n\n*' + lang.get('overview.inaccurate') + '*';
						}
						
						msg.sendChannel( spoiler + text + spoiler, {embed} );
						
						if ( reaction ) reaction.removeEmoji();
					}
				}
				else {
					if ( msg.showEmbed() ) embed.addField( articles[0], articles[1], true ).addField( pages[0], pages[1], true ).addField( edits[0], edits[1], true ).addField( users[0], users[1], true ).setTimestamp( msg.client.readyTimestamp ).setFooter( lang.get('overview.inaccurate') );
					else text = articles.join(' ') + '\n' + pages.join(' ') + '\n' + edits.join(' ') + '\n' + users.join(' ') + '\n\n*' + lang.get('overview.inaccurate') + '*';
					
					msg.sendChannel( spoiler + text + spoiler, {embed} );
					
					if ( reaction ) reaction.removeEmoji();
				}
			}, error => {
				console.log( '- Error while getting the wiki details: ' + error );
				msg.sendChannelError( spoiler + '<' + wiki.toLink('Special:Statistics', '', '', body.query.general) + '>' + spoiler );
				
				if ( reaction ) reaction.removeEmoji();
			} );
			else {
				if ( msg.showEmbed() ) {
					if ( site ) {
						var managerlist = manager[1].map( wm => '[' + wm + '](' + wiki.toLink('User:' + wm, '', '', body.query.general, true) + ') ([' + lang.get('overview.talk') + '](' + wiki.toLink('User talk:' + wm, '', '', body.query.general, true) + '))' ).join('\n');
						embed.addField( name[0], name[1], true ).addField( created[0], created[1], true ).addField( manager[0], ( managerlist || lang.get('overview.none') ), true ).addField( official[0], official[1], true );
					}
					embed.addField( articles[0], articles[1], true ).addField( pages[0], pages[1], true ).addField( edits[0], edits[1], true ).addField( users[0], users[1], true ).setTimestamp( msg.client.readyTimestamp ).setFooter( lang.get('overview.inaccurate') );
					if ( site ) {
						if ( crossover[1] ) embed.addField( crossover[0], crossover[1], true );
						if ( description[1] ) embed.addField( description[0], description[1] );
						if ( image[1] ) embed.addField( image[0], image[1] ).setImage( image[1] );
					}
				}
				else {
					if ( site ) text += name.join(' ') + '\n' + created.join(' ') + '\n' + manager[0] + ' ' + ( manager[1].join(', ') || lang.get('overview.none') ) + '\n' + official.join(' ') + '\n';
					text += articles.join(' ') + '\n' + pages.join(' ') + '\n' + edits.join(' ') + '\n' + users.join(' ');
					if ( site ) {
						if ( crossover[1] ) text += '\n' + crossover.join(' ');
						if ( description[1] ) text += '\n' + description.join(' ');
						if ( image[1] ) {
							text += '\n' + image.join(' ');
							if ( msg.uploadFiles() ) embed.files = [{attachment:image[1],name:( spoiler ? 'SPOILER ' : '' ) + name[1] + image[1].substring(image[1].lastIndexOf('.'))}];
						}
					}
					text += '\n\n*' + lang.get('overview.inaccurate') + '*';
				}
				
				msg.sendChannel( spoiler + text + spoiler, {embed} );
				
				if ( reaction ) reaction.removeEmoji();
			}
		}
	}, error => {
		if ( wiki.noWiki(error.message) ) {
			console.log( '- This wiki doesn\'t exist!' );
			msg.reactEmoji('nowiki');
		}
		else {
			console.log( '- Error while getting the statistics: ' + error );
			msg.sendChannelError( spoiler + '<' + wiki.toLink('Special:Statistics') + '>' + spoiler );
		}
		
		if ( reaction ) reaction.removeEmoji();
	} );
}

module.exports = {
	name: 'overview',
	run: gamepedia_overview
};
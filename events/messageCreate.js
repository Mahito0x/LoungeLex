const functions = require('../functions.js');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
	name: 'MessageCreate',
	async execute(msg) {
		if (runLiofa(msg) === false) return;

		try {
			const MessageContent = functions.liofaFilter(msg);
			if (!MessageContent || MessageContent.length < 4) return;
			const result = await functions.liofaCheck(MessageContent);
			if (!result) return;


			const GuildData = functions.liofaRead(msg.guild.id);
			// Checks list of allowed languages
			if (!GuildData.Settings.languages.includes(result.code) && parseInt(result.percent) >= 90) {

				// Warnings Check
				const warnCount = functions.liofaMod(msg, msg.author.id);
				const timeoutThreshold = parseInt(GuildData.Settings.warnings) + parseInt(GuildData.Settings.startwarnings) + 2; // +2 to make it trigger on 5th warning
				if (warnCount < timeoutThreshold - 2 && warnCount > GuildData.Settings.startwarnings) {
					const buttons = new ActionRowBuilder();
					let printButtons = false;
					if (GuildData.Settings.buttons.includes(true)) {
						printButtons = true;
						if (GuildData.Settings.buttons[0]) {
							buttons.addComponents(new ButtonBuilder().setURL('https://translate.google.com').setLabel('🌍 Translator').setStyle(ButtonStyle.Link));
						}
						if (GuildData.Settings.buttons[1]) {
							buttons.addComponents(new ButtonBuilder().setCustomId('result.name').setLabel(result.name + ' [' + result.percent + '%]').setStyle(ButtonStyle.Primary).setDisabled(true));
						}
						if (GuildData.Settings.buttons[2]) {
							buttons.addComponents(new ButtonBuilder().setCustomId('mod undo ' + msg.author.id).setLabel('Undo').setStyle(ButtonStyle.Danger));
						}
						if (GuildData.Settings.buttons[3]) {
							buttons.addComponents(new ButtonBuilder().setCustomId('invite links').setLabel('Get Liofa!').setStyle(ButtonStyle.Success));
						}
					}

					const LiofaMessages = require('../Read Only/Responses');
					// Checks if output for given language is available
					if (typeof LiofaMessages[result.code] === 'string') {
						if (printButtons) {
							msg.reply({ content : '<@' + msg.author.id + '> **' + LiofaMessages[result.code] + '**', components : [buttons] });
						}
						else {
							msg.reply({ content : '<@' + msg.author.id + '> **' + LiofaMessages[result.code] + '**' });
						}
					}
					else {
						if (printButtons) {
							msg.reply({ content : '**Please speak English.**', components : [buttons] });
						}
						else {
							msg.reply({ content : '**Please speak English.**' });                        }
                    }
				}
				else if (warnCount == timeoutThreshold - 2) {
					msg.reply('<@' + msg.author.id + '> **Warning:** You have received multiple warnings. Two more non-English messages will result in a timeout.');
				}
				else if (warnCount == timeoutThreshold - 1) {
					msg.reply('<@' + msg.author.id + '> **Final Warning:** Your next non-English message will result in a 10-minute timeout.');
				}
				else if (warnCount == timeoutThreshold) {
					// Apply 10-minute timeout
					try {
						await msg.member.timeout(10 * 60 * 1000, 'Multiple language warnings');
						msg.reply('<@' + msg.author.id + '> has been timed out for 10 minutes due to multiple language warnings.\n\n-# If you believe this was a mistake, kindly [Appeal here](https://appeal.gg/gpyjXe44GE)');
					} catch (error) {
						console.error('Failed to timeout user:', error);
						msg.reply('Failed to apply timeout. Please check my permissions.');
					}
				}
				else if (warnCount > timeoutThreshold) {
					// Reset their timeout if they continue
					try {
						await msg.member.timeout(10 * 60 * 1000, 'Continued language warnings');
						msg.reply('<@' + msg.author.id + '> Your timeout has been reset to 10 minutes due to continued non-English messages.');
					} catch (error) {
						console.error('Failed to timeout user:', error);
						msg.reply('Failed to apply timeout. Please check my permissions.');
					}
				}
			}
		}
		// Returns error for when language cannot be detected
		catch (err) {
			console.log(msg.content);
			console.log(err);
			return;
		}

		function runLiofa(txt) {
			// Checks if it's a Bot
			if (txt.author.bot === true) return false;
			const GuildData = functions.liofaRead(txt.guild.id);

			if (functions.liofaPrefixCheck(txt)) {
				const args = txt.content.slice(GuildData.Settings.prefix.length).trim().split(' ');

				// Checks command exists
				const command = txt.client.commands.get(args.shift().toLowerCase());
				if (!command) return true;

				// Checks required channel permissions
				if(!txt.channel.permissionsFor(txt.guild.me).has(['VIEW_CHANNEL', 'SEND_MESSAGES', 'MANAGE_MESSAGES'])){
					txt.author.send('I don\'t have sufficient permissions required to run the command in that channel\!😭\nPlease ensure I have these channel permissions:\n > **View Channel**\n > **Send Messages**\n > **Manage Messages**');
					return false;
				}

				try {
					// Checks you have permission to run the command
					if (functions.liofaPermsCheck(txt, command)) {
						command.execute(txt);
					}
					else {
						txt.reply({ content : 'You have insufficient permissions 😬', ephemeral : true });
					}
					return false;
				}
				catch (error) {
					console.error(error);
					txt.reply('Something went wrong! 😲');
				}
			}
			else if (functions.liofaExcludedRolesOrChannels(txt)) {
				return false;
			}
			return GuildData.Settings.state;
		}
	},
};

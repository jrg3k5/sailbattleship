import { MessageEmbed } from 'discord.js'
import Room from '../BattleShip/room.js'
import solanaConnect from '../solana/index.js'
import Wallet from '../wallet/index.js'

class DiscordBattleShip {
  constructor(settings) {
		this.settings = settings;
	}

  createGame = async (message) => {
    const challenger = message.mentions.members.first(); // Define the challenger 
    const opponent = message.member; // Get and define the opponent
    
    // If there is no challenger, require them to define one
		if (!challenger) {
      return await message.channel.send({embeds: [new MessageEmbed()
        .setColor(this.settings.dangerColor)
        .setDescription(`Please mention another SAILOR to battle!`)]
      });
		}

		// Check for prevention against challenging yourself
		if (challenger.id === opponent.id) {
      return await message.channel.send({embeds: [new MessageEmbed()
        .setColor(this.settings.dangerColor)
        .setDescription(`Please challenge someone other than yourself!`)]
      });
		}

    const trackMsg = await message.channel.send({embeds: [new MessageEmbed()
      .setTitle('The game has begun')
      .setColor(this.settings.infoColor)
      .setDescription(`${challenger.user} vs ${opponent.user}\nCheck your DM's for instructions on how to proceed.\nThis embed will update as the game continues.`)]
    });

    const players = [
      // define the challenger
			{ 
				collector: null, 
				member: challenger, 
				armyBoard: this.generateBoard(10, 10), 
				enemyBoard: this.generateBoard(10, 10), 
				gameChannel: "", 
				placedBoats: [], 
				gameMessages: { help: "", status: "", army: "", enemy: "" }, 
				ready: false,
			},
      // define the opponent
      { 
				collector: null, 
				member: opponent, 
				armyBoard: this.generateBoard(10, 10), 
				enemyBoard: this.generateBoard(10, 10), 
				gameChannel: "", 
				placedBoats: [], 
				gameMessages: { help: "", status: "", army: "", enemy: "" }, 
				ready: false,
			},
		];
    
    // define the valid boats type
    const boats = [
      { name: "carrier", length: 5, hits: 0, sunk: false }, 
      // { name: "battleship", length: 4, hits: 0, sunk: false }, 
      // { name: "destroyer", length: 3, hits: 0, sunk: false }, 
      // { name: "submarine", length: 3, hits: 0, sunk: false }, 
      // { name: "patrolboat", length: 2, hits: 0, sunk: false }
    ];

    // define the valid directions
    const directions = ["up", "down", "left", "right"];

    let playerTurnIndex = 0;
    let opponentIndex = (playerTurnIndex + 1) % players.length;

    for (const player of players) {
      const helpMsg = await player.member.send({
        embeds: [
          new MessageEmbed()
            .setTitle(`Board Help`)
            .setColor(this.settings.infoColor)
            .setDescription(`To add your boats to the board, please use the following command format.\n${this.settings.prefix}add <ship> <Board Cords> <direction>\nAn example: ${this.settings.prefix}add destroyer D5 down`)
        ] 
      });

      const statusMsg = await player.member.send(`Available Ships:\ncarrier (5)\nbattleship (4)\ndestroyer (3)\nsubmarine (3)\npatrolboat (2)`);
      
      const enemyBoard = await player.member.send(`\nEnemy:\n${this.displayBoard(player.enemyBoard)}`);
      const armyBoard = await player.member.send(`\nArmy:\n${this.displayBoard(player.armyBoard)}`);

      player.gameMessages.help = helpMsg.id;
      player.gameMessages.status = statusMsg.id;
			player.gameMessages.army = armyBoard.id;
			player.gameMessages.enemy = enemyBoard.id;

      const filter = (elem) => elem.author.id === player.member.id && 
        [`${this.settings.prefix}add`, `${this.settings.prefix}attack`].includes(elem.content.split(" ")[0]);

      const collector = armyBoard.channel.createMessageCollector(filter);
			player.collector = collector;
      player.gameChannel = armyBoard.channel.id;

      collector.on("collect", async (msg) => {
        const argument = msg.content.slice(this.settings.prefix.length).trim().split(/ +/g);
				const cmd = argument.shift();

        const curPlayer = players.find(elem => elem.member.id === msg.author.id);

        if (!curPlayer) {
          return;
        }

        if (!curPlayer.ready) {
          if (cmd == "add") {
            // assign the boat type
            const boatType = argument[0];

            // check the boat is exist
            if (!boatType) {
              return msg.channel.send({embeds: [new MessageEmbed()
                .setColor(this.settings.dangerColor)
                .setDescription(`Please provide a boat to place.`)]
              }).then(msg => {
                setTimeout(() => msg.delete(), 3000)
              })
            }

            // validate the boat type
            if (!boats.some(elem => elem.name === boatType.toLowerCase())) {
              return msg.channel.send({embeds: [new MessageEmbed()
                .setColor(this.settings.dangerColor)
                .setDescription(`Please provide a valid boat type to place.`)]
              }).then(msg => {
                setTimeout(() => msg.delete(), 3000)
              })
            }

            // check to avoid the duplication the boat
            if (curPlayer.placedBoats.some(elem => elem.name === boatType.toLowerCase())) {
              return msg.channel.send({embeds: [new MessageEmbed()
                .setColor(this.settings.dangerColor)
                .setDescription(`You already placed that boat. Please try a different one.`)]
              }).then(msg => {
                setTimeout(() => msg.delete(), 3000)
              });
            }

            // assige the cords
            const cords = argument[1];

            // check the cords
            if (!cords) {
              return msg.channel.send({embeds: [new MessageEmbed()
                .setColor(this.settings.dangerColor)
                .setDescription(`Please enter cords for your ship. Ex: D5`)]
              }).then(msg => {
                setTimeout(() => msg.delete(), 3000)
              });
            }

            // validate the cords
						if (!cords.match(/[a-z]([1-9]|10)/i)) {
              return msg.channel.send({embeds: [new MessageEmbed()
                .setColor(this.settings.dangerColor)
                .setDescription(`Please enter valid cords for your ship. Ex: D5`)]
              }).then(msg => {
                setTimeout(() => msg.delete(), 3000)
              });
            }

            const direction = argument[2];
						if (!direction) {
              return msg.channel.send({embeds: [new MessageEmbed()
                .setColor(this.settings.dangerColor)
                .setDescription(`Please provide a direction to position your boat!`)]
              }).then(msg => {
                setTimeout(() => msg.delete(), 3000)
              });
            }

						if (!directions.some(elem => elem === direction.toLowerCase())) {
              return msg.channel.send({embeds: [new MessageEmbed()
                .setColor(this.settings.dangerColor)
                .setDescription(`Please provide a valid dirrection. Valid Choices: ${directions.join(", ")}`)]
              }).then(msg => {
                setTimeout(() => msg.delete(), 3000)
              });
            }

            if (!this.checkBoatPos(
              player.armyBoard, 
              boats.find(elem => elem.name === boatType.toLowerCase()), 
              { letter: cords[0], number: parseInt(cords.slice(1)), cord: cords }, 
              direction, 
              "check"
            )) {
              return msg.channel.send({embeds: [new MessageEmbed()
                .setColor(this.settings.dangerColor)
                .setDescription(`You can't put the ${boatType} at ${cords} facing ${direction}`)]
              }).then(msg => {
                setTimeout(() => msg.delete(), 3000)
              });
            }
            
            curPlayer.placedBoats.push(Object.assign({}, boats.find(elem => elem.name === boatType.toLowerCase())));

            const reRender = this.checkBoatPos(
              player.armyBoard, 
              boats.find(elem => elem.name === boatType.toLowerCase()), 
              { letter: cords[0], number: parseInt(cords.slice(1)), cord: cords }, 
              direction, 
              "render"
            );

            curPlayer.armyBoard = reRender.board;

            message.client.channels.cache.get(curPlayer.gameChannel).messages.cache.get(curPlayer.gameMessages.army).edit(`Army:\n${this.displayBoard(reRender.board)}`);

            const statusDoc = message.client.channels.cache.get(curPlayer.gameChannel).messages.cache.get(curPlayer.gameMessages.status); 
						statusDoc.edit(statusDoc.content.replace(new RegExp(boatType.toLowerCase(), "ig"), `~~${boatType.toLowerCase()}~~`));

            if (curPlayer.placedBoats.length == boats.length) {
							curPlayer.ready = true;
              if (players[0].ready && players[1].ready) { // both are ready
                for (const elem of players) {
                  const helpEmbed = message.client.channels.cache.get(elem.gameChannel).messages.cache.get(elem.gameMessages.help);

                  await helpEmbed.edit({embeds: [
                    new MessageEmbed()
                      .setColor(this.settings.infoColor)
                      .setTitle(`Board Help`)
                      .setDescription(`You have both now finished the setup phase of the game!\n${this.settings.prefix}attack <Board Cords>\nAn example: ?attack D5`)
                  ]});

                  const statusDoc = message.client.channels.cache.get(elem.gameChannel).messages.cache.get(elem.gameMessages.status);

                  await statusDoc.edit(`Enemy:\n🔲 = Empty Spot\n⚪ = Missed Attack\n🔴 = Hit Attack\n\nArmy:\n🔲 = Empty Spot\n⚪ = Missed Opponent Attack\n🔴 = Hit Ship\n🟩 = Unhit Ship\n\nIt is ${message.member.tag}'s turn to attack!`);
								}
              } else {
                return msg.channel.send({embeds: [new MessageEmbed()
                  .setColor(this.settings.infoColor)
                  .setDescription(`It looks like your opponent hasn't placed all of their ships yet! Please wait for them to finish. Once they finish you will get a DM.`)]
                }).then(msg => {
                  setTimeout(() => msg.delete(), 10000)
                });
              }
						}
          }
        } else if (players[0].ready && players[1].ready) { // both are ready
          if (players[playerTurnIndex].member.id === msg.author.id) { // check the turn
            if (cmd == "attack") {
              const cords = argument[0];

              // check the cords
              if (!cords) {
                return msg.channel.send({embeds: [new MessageEmbed()
                  .setColor(this.settings.dangerColor)
                  .setDescription(`Please enter cords for your ship. Ex: D5`)]
                }).then(msg => {
                  setTimeout(() => msg.delete(), 3000)
                });
              }

              // validate the cords
              if (!cords.match(/[a-z]([1-9]|10)/i)) {
                return msg.channel.send({embeds: [new MessageEmbed()
                  .setColor(this.settings.dangerColor)
                  .setDescription(`Please enter valid cords for your ship. Ex: D5`)]
                }).then(msg => {
                  setTimeout(() => msg.delete(), 3000)
                });
              }

              const attackResult = this.attack(
                players[playerTurnIndex].enemyBoard, // challenger's enemy body
                players[opponentIndex].armyBoard,  // opponent's army board
                { 
                  letter: cords[0], 
                  number: parseInt(cords.slice(1)), 
                  cord: cords 
                }
              );

              if (!attackResult) {
                return msg.channel.send({embeds: [new MessageEmbed()
                  .setColor(this.settings.dangerColor)
                  .setDescription(`You can't attack there, please try somewhere else!`)]
                }).then(msg => {
                  setTimeout(() => msg.delete(), 3000)
                });
              }

              message.client.channels.cache.get(players[playerTurnIndex].gameChannel).messages.cache.get(players[playerTurnIndex].gameMessages.enemy).edit(`Attack Board:\n${this.displayBoard(attackResult.enemyBoard)}`);
							players[playerTurnIndex].enemyBoard = attackResult.enemyBoard;

							message.client.channels.cache.get(players[opponentIndex].gameChannel).messages.cache.get(players[opponentIndex].gameMessages.army).edit(`Ship Board:\n${this.displayBoard(attackResult.armyBoard)}`);
							players[opponentIndex].armyBoard = attackResult.armyBoard;

              const shipToHit = players[opponentIndex].placedBoats.find(elem => elem.name.toLowerCase() === attackResult.shipName.toLowerCase());
              
              if (shipToHit) {
                shipToHit.hits++;
                console.log(shipToHit);

                await solanaConnect.transferSAIL(
                  await Wallet.getPrivateKey(players[opponentIndex].member.user.id), 
                  await Wallet.getPublicKey(players[playerTurnIndex].member.user.id), 
                  1, 
                  'Destroyed one piece of boat'
                );
                
                if (shipToHit.hits === shipToHit.length) { // destroy the all pieces of boat
									shipToHit.sunk = true;
									players[playerTurnIndex].member.send(`${players[opponentIndex].member.user}'s ${shipToHit.name} was sunk!`);
									players[opponentIndex].member.send(`${players[opponentIndex].member.user}'s ${shipToHit.name} was sunk!`);
									// const embed = new discord_js_1.MessageEmbed()
									// 	.setTitle("SAIL Battle Ship Game <:submarine:753289857907818561>")
									// 	.setFooter(`${challenger.user.tag} vs ${opponent.user.tag}`)
									// 	.setColor(this.settings.embedColor);
									// for (const p of players) {
									// 	embed.addField(p.member.user.tag, `Has ${p.placedBoats.filter(b => !b.sunk).length} ships left!\n\n${p.placedBoats.map(b => b.sunk ? `❌ ${b.name}` : `✅ ${b.name}`).join("\n")}`);
									// }
									// trackMsg.edit("", { embed });
								}

                if (this.winCondition(players[opponentIndex].placedBoats)) {
                  for (const elem of players) {
                    elem.collector.stop();
                    elem.member.send(`${players[playerTurnIndex].member.user} is winner!\n${players[opponentIndex].member.user} is loser!`);
                  }

                  await Room.removeRoom(players[0].member.id);

                  // const embed = new discord_js_1.MessageEmbed()
                  // 	.setTitle("SAIL Battle Ship Game <:submarine:753289857907818561>")
                  // 	.setFooter(`${challenger.user.tag} vs ${opponent.user.tag}`)
                  // 	.setColor(this.settings.embedColor)
                  // 	.setDescription(`${players[player].member.user} has won the game!`);
                  // trackMsg.edit(`${players[0].member}, ${players[1].member}`, { embed });
                  // challenger.roles.remove("876068848456069150") 
                  // opponent.roles.remove("876068848456069150")
                  // message.channel.send(` ${players[player].member.user} HAS WON`)
                  // message.channel.send(`/send ${players[player].member.user} 1`)
                }
              } else {
                opponentIndex = playerTurnIndex;
                playerTurnIndex = (playerTurnIndex + 1) % players.length;
              }
            }
          } else {
            return msg.channel.send({embeds: [new MessageEmbed()
              .setColor(this.settings.dangerColor)
              .setDescription(`It isn't your turn yet. Please wait for the opponent to attack.`)]
            }).then(msg => {
              setTimeout(() => msg.delete(), 3000)
            });
          }
        }
      });
    }
  }

  generateBoard = (rows, cols) => {
    const boardLetter = [
      { index: 0, letter: "A" }, 
      { index: 1, letter: "B" }, 
      { index: 2, letter: "C" }, 
      { index: 3, letter: "D" }, 
      { index: 4, letter: "E" }, 
      { index: 5, letter: "F" }, 
      { index: 6, letter: "G" }, 
      { index: 7, letter: "H" }, 
      { index: 8, letter: "I" }, 
      { index: 9, letter: "J" }
    ];
  
    const doneData = [];
    
    for (let i = 0; i < rows; i++) {
      const tempRow = [];
      for (let j = 0; j < cols; j++) {
        const boardLttr = boardLetter.find(data => data.index === i).letter;
        tempRow.push({ 
          data: "0", 
          ship: "", 
          cords: { 
            letter: boardLttr, 
            number: j + 1, 
            cord: boardLttr + (j + 1) 
          } 
        });
      }
  
      doneData.push(tempRow);
    }
    
    return doneData;
  }

  displayBoard = (board) => {
		let returnData = "";
		returnData = returnData.concat("⬛1️⃣2️⃣3️⃣4️⃣5️⃣6️⃣7️⃣8️⃣9️⃣🔟\n");
		for (let i = 0; i < board.length; i++) {
			let temp = "";
			const leftEmoji = [
        { i: 0, emoji: ":regional_indicator_a:" }, 
        { i: 1, emoji: ":regional_indicator_b:" }, 
        { i: 2, emoji: ":regional_indicator_c:" }, 
        { i: 3, emoji: ":regional_indicator_d:" }, 
        { i: 4, emoji: ":regional_indicator_e:" }, 
        { i: 5, emoji: ":regional_indicator_f:" }, 
        { i: 6, emoji: ":regional_indicator_g:" }, 
        { i: 7, emoji: ":regional_indicator_h:" }, 
        { i: 8, emoji: ":regional_indicator_i:" }, 
        { i: 9, emoji: ":regional_indicator_j:" }
      ];

			for (let j = 0; j < board[i].length; j++) {
        // "0" is an empty space, 
        // "1" is a unhit ship piece, 
        // "2" is a hit ship piece, 
        // "3" is a missed shot from opponent
        
        temp += `${board[i][j].data === "0" ? "◻️" : board[i][j].data === "1" ? "🟩" : board[i][j].data === "2" ? "🟥" : "⚪"}`;
      }

			returnData += leftEmoji.find(elem => elem.i === i).emoji + temp + "\n";
		}
		return returnData;
	}

  checkBoatPos(board, boat, cords, direction, type) {
    for (let i = 0; i < board.length; i++) {
      let startCol = board[i].findIndex(elem => elem.cords.cord.toLowerCase() === cords.cord.toLowerCase());
      if (startCol != -1) {
        let startRow = i;
        let count = 0;      

        switch (direction) {
					case "up":
            for (let j = 0; j < boat.length; j++) {
              if (type == 'check') {  
                if (board[startRow] === undefined) {
                  return;
                }
                
                if (board[startRow][cords.number - 1].data === "1") {
                  return;
                }
              } else {
                board[startRow][cords.number - 1].data = "1";
								board[startRow][cords.number - 1].ship = boat.name;
              }

              count++;
              startRow--;
            }
						break;
					case "down":
            for (let j = 0; j < boat.length; j++) {
              if (type == 'check') {  
                if (board[startRow] === undefined) {
                  return;
                }
                
                if (board[startRow][cords.number - 1].data === "1") {
                  return;
                }
              } else {
                board[startRow][cords.number - 1].data = "1";
								board[startRow][cords.number - 1].ship = boat.name;
              }

              count++;
							startRow++;
            }
						break;
					case "left":
            for (let j = 0; j < boat.length; j++) {
              if (type == 'check') {  
                if (board[startRow][startCol] === undefined) {
									return;
                }

								if (board[startRow][startCol].data === "1") {
									return;
                }
              } else {
                board[startRow][startCol].data = "1";
								board[startRow][startCol].ship = boat.name;
              }

              count++;
              startCol--;
            }
						break;
					case "right":
            for (let j = 0; j < boat.length; j++) {
              if (type == 'check') {  
                if (board[startRow][startCol] === undefined) {
									return;
                }

								if (board[startRow][startCol].data === "1") {
									return;
                }
              } else {
                board[startRow][startCol].data = "1";
								board[startRow][startCol].ship = boat.name;
              }

              count++;

              startCol++;
            }
						break;
				}
      }
    }

    return { board, boat };
  }

  attack(enemyBoard, armyBoard, cords) {
		let shipName = "";
		for (let i = 0; i < armyBoard.length; i++) {
			const col = armyBoard[i].findIndex(elem => elem.cords.cord.toLowerCase() === cords.cord.toLowerCase());
      if (col != -1) {
				if (armyBoard[i][col].data === "0") { // Missed attack
					armyBoard[i][col].data = "3";
					enemyBoard[i][col].data = "3";
				} else if (armyBoard[i][col].data === "1") { // Successful attack
					armyBoard[i][col].data = "2";
					enemyBoard[i][col].data = "2";
					shipName = armyBoard[i][col].ship;
				} else {
					return false;
        }
			}
		}
		return { enemyBoard, armyBoard, shipName };
	}

  winCondition(boats) {
		for (const boat of boats) {
			if (!boat.sunk)
				return false;
		}
		return true;
	}
}

export {
  DiscordBattleShip,
};
import { ColorResolvable, Message } from "discord.js";
export declare class DiscordBattleShip {
    settings: {
        embedColor: ColorResolvable;
        prefix: string;
    };
    constructor(settings: {
        embedColor: ColorResolvable;
        prefix: string;
    });
    createGame(message: Message): Promise<Message>;
    private winCondition;
    private attack;
    private checkBoatPos;
    private genBoard;
    private displayBoard;
}
//# sourceMappingURL=index.d.ts.map
import { Player } from "./Player"
import { Request } from './Request'

export interface GameInterface {
    players: Array<Player>
    receive(request: Request, params: Object): Object;
}

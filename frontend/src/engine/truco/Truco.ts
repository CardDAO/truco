import P2PT, { Peer } from "p2pt"
import { GameInterface } from "../shared/GameInterface"
import { Request } from "../shared/Request"
import { trackersURL }  from '../../assets/trackers'
import { Message } from '../../hooks/providers/Wagmi'
import { Player } from "../shared/Player"
import { PlayerJoinedRequest } from "./commands/PlayerJoined"
import { GreetPlayer } from "./commands/GreetPlayer"


export class Truco implements GameInterface {
    p2pt: P2PT = new P2PT<Message>(trackersURL, 'UNIQUE_KEY_GAME')
    address: String = ""
    players: Array<Player> = []

    init(
        address?: String,
        connected?: Boolean,
        callback?: (truco: Truco) => void
    ): void {
        if (address && connected) {
            this.address = address
        }
        //this.p2pt.setIdentifier((address as string))
        //this.p2pt.on('msg', (peer, message) => {
            //onReceive({message, peer})
        //})///.then
        this.p2pt.on('peerconnect', async (peer: Peer) => {
            let player = new Player()
            player.peer = peer
            this.receive(new Request("player_joined", { player })).then(() => {
                if (callback) {
                    callback(this)
                }
            })
        })
        //onNewPlayer.bind(this)
        //onNewPlayer(peer)
        this.p2pt.start()
        if (callback) {
            console.log('context: ',this)
            callback(this)
        }
    }

    async receive(
        request: Request,
        params?: Object
    ): Promise<Object> {
        if (request.topic === "player_joined") {
            let body : PlayerJoinedRequest = request.body as PlayerJoinedRequest
            if (!body || !body.player) {
                return { error: "Error" }
            }
            // TODO: verify in contract -> player joined? -> Address in Peer info?
            // TODO: registry player
            this.players.push(body.player)
            // TODO: signed greet and send
            //GreetPlayer.call(this, [body.player])
            console.log('new player in the room', body.player, this)
        }
        return {}
    }


}

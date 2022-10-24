import { Peer } from "p2pt"

export class Player {
    peer?: Peer
    address?: String

    toString() {
        return `Player: ${this.peer?.id} - ${this.address}`
    }
}

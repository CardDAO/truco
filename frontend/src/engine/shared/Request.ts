
export class Request {
    topic: String = ""
    body: Object = {}

    constructor(topic: String, body: Object) {
        this.topic = topic
        this.body = body
    }
}

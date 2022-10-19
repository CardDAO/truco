import P2PT from 'p2pt'
import logo from './logo.svg'
import './App.css'


const trackersAnnounceURLs = [
  "wss://tracker.openwebtorrent.com",
  "wss://tracker.sloppyta.co:443/announce",
  "wss://tracker.novage.com.ua:443/announce",
  "wss://tracker.btorrent.xyz:443/announce",
]
const log = (msg: any) => {
      if (typeof msg == 'object') {
          console.log((JSON && JSON.stringify ? JSON.stringify(msg, undefined, 2) : msg) + '<br />')
      } else {
          console.log(msg)
      }
}
function App() {
    const p2pt = new P2PT(trackersAnnounceURLs, 'myApp')

    p2pt.on('trackerconnect', (tracker, stats) => {
      log('Connected to tracker : ' + tracker.announceUrl)
      log('Tracker stats : ' + JSON.stringify(stats))
      log('')
    })

    // If a new peer, send message
    p2pt.on('peerconnect', (peer) => {
      log('New Peer ! : ' + peer.id + '. Sending Hi')
      p2pt.send(peer, 'Hi').then(([peer, msg]: any) => {
        log('Got response : ' + msg)
        return peer.respond('Bye')
      }).then(([peer, msg]: any) => {
        log('Got response2 : ' + msg)
      })
    })

    // If message received from peer
    p2pt.on('msg', (peer, msg) => {
      log(`Got message from ${peer.id} : ${msg}`)
      if (msg === 'Hi') {
        peer.respond('Hello !').then(([peer, msg]: any) => {
          peer.respond('Bye !')
        })
      }
    })

    log('P2PT started. My peer id : ' + p2pt._peerId)
    p2pt.start()


    return (
      <div className="App">
        <header className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <p>
            Edit <code>src/App.tsx</code> and save to reload.
          </p>
          <a
            className="App-link"
            href="https://reactjs.org"
            target="_blank"
            rel="noopener noreferrer"
          >
            Learn React
          </a>
        </header>
      </div>
    );
}

export default App;

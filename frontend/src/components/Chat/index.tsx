export const Chat = ({ peers, messages, messageInput, setMessageInput, sendMessageAll }: any) => {
    return (
        <div>
            <h3 className="text-white text-xl">Peers</h3>
            <div className="text-sm font-medium text-gray-900 bg-white rounded-lg border border-gray-200 dark:bg-gray-700 dark:border-gray-600 dark:text-white  overscroll-y-scroll overflow-auto h-32 mb-10">
                { peers.map((peer: any, index: any) => {
                    return (
                        <button key={index} type="button" className="py-2 px-4 w-full font-medium text-left border-b border-gray-200 cursor-pointer hover:bg-gray-100 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:text-blue-700 dark:border-gray-600 dark:hover:bg-gray-600 dark:hover:text-white dark:focus:ring-gray-500 dark:focus:text-white">
                            {peer.id ?? "undefined"}
                        </button>
                    )

                })}
            </div>
                <h3 className="text-white text-xl">Mensajes</h3>
                <ul className="divide-y divide-gray-300 overscroll-y-scroll overflow-auto h-72 justify-center w-full">
                    { messages.map((messageObject: any, index: any) => {
                    return (
                       <li key={index} className="pb-3 sm:pb-4">
                          <div className="flex items-center space-x-3">
                             <div className="flex-1 min-w-0">
                                <p className="text-base font-medium truncate text-white font-semibold ">{`Action: ${messageObject.message.action ?? 'undefined'}`}</p>
                                <p className="text-sm truncate text-stone-400">
                                   { `Sign: ${messageObject.signature}` }
                                </p>
                             </div>
                             <div className="text-xs inline-flex items-center text-green-500">
                                 { `Nonce: ${messageObject.message.nonce}`}
                             </div>
                          </div>
                       </li>
                    )
                })}
                </ul>
                <input 
                    type="text"
                    className="bg-gray-50 border text-sm rounded-lg block w-full p-2.5 bg-gray-700 border-gray-600 placeholder-gray-400 text-white focus:ring-blue-500 focus:border-blue-500 mt-5"
                    placeholder="Message"
                    required
                    value={messageInput}
                    onChange={(event: any) => {setMessageInput(event.target.value)}}
                    onKeyDown={(e: any) => { 
                        if(e.key === 'Enter' && messageInput.length > 0) {
                            sendMessageAll(messageInput)
                            setMessageInput("")
                        }
                    }}
                />
                <button
                    type="button"
                    className="text-white bg-gradient-to-r from-cyan-500 to-blue-500 hover:bg-gradient-to-bl focus:ring-4 focus:outline-none focus:ring-cyan-800 font-medium rounded-lg text-sm px-5 py-2.5 text-center mr-2 mb-2 mt-5"
                    onClick={() => {
                        if (messageInput.length > 0) {
                            sendMessageAll(messageInput)
                            setMessageInput("")
                        }
                    }}
                >
                    Send message
                </button>
        </div>
    )
}

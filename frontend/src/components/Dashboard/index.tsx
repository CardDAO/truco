import { Chat } from "../Chat"
import './index.css'

export const Dashboard = ({ peers, messages, messageInput, setMessageInput, isLoading, sendMessageAll, errorSendMessage, requestPeers}: any) => {
    return (
        <div className="Dashboard-Grid">
            <div className="Chat-Column">
                <Chat
                    peers={peers}
                    messages={messages}
                    messageInput={messageInput}
                    setMessageInput={setMessageInput}
                    sendMessageAll={sendMessageAll}
                    isLoading={isLoading}
                    errorSendMessage={errorSendMessage}
                    requestPeers={requestPeers}
                />
            </div>
            <div className="Game-View">
                <div className="h-full m-2 grid grid-cols-1 grid-rows-7 text-gray-200 gap-3 justify-center">
                    <div className="border-dashed border-2 border-orange-700 justify-center">
                        Opponent
                    </div>
                    <div className="border-dashed border-2 row-span-3 bg-slate-50/50 border-emerald-50">
                        Played cards
                    </div>
                    <div className="border-dashed border-2 row-span-2 border-lime-700">
                        My cards
                    </div>
                    <div className="border-dashed border-2 border-gray-600">
                        Actions
                    </div>
                </div>
            </div>
        </div>
    )
}

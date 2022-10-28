import { Chat } from "../Chat"
import './index.css'

export const Dashboard = ({ peers, messages, messageInput, setMessageInput, isLoading, sendMessageAll, errorSendMessage}: any) => {
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
                />
            </div>
            <div className="Game-View">
                <div className="m-2">
                </div>
            </div>
        </div>
    )
}

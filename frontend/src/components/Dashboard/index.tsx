import { Chat } from "../Chat"

export const Dashboard = ({ peers, messages, messageInput, setMessageInput, sendMessageAll }: any) => {
    return (
        <div className="flex m-auto h-screen w-screen">
            <div className="flex-none text-center align-middle mx-20">
                <Chat
                    peers={peers}
                    messages={messages}
                    messageInput={messageInput}
                    setMessageInput={setMessageInput}
                    sendMessageAll={sendMessageAll}
                />
            </div>
            <div className="flex-auto w-64 bg-gray-500  mx-10"></div>
        </div>
    )
}

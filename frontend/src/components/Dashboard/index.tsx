import { Chat } from "../Chat"

export const Dashboard = ({ peers, messages, messageInput, setMessageInput, sendMessageAll }: any) => {
    return (
        <div className="grid grid-cols-1 grid-rows-2 md:grid-rows-none md:grid-cols-3 gap-4 w-screen">
            <div className="text-center align-middle mx-4 order-2 md:order-1 col-auto">
                <Chat
                    peers={peers}
                    messages={messages}
                    messageInput={messageInput}
                    setMessageInput={setMessageInput}
                    sendMessageAll={sendMessageAll}
                />
            </div>
            <div className="bg-gray-800/50 order-1 md:order-2 md:col-span-2 mx-4">
                <div className="m-2">
                    <p>qweqwe</p>
                    <p>qweqwe</p>
                    <p>qweqwe</p>
                    <p>qweqwe</p>
                    <p>qwe</p>
                    <p></p>
                    <p></p>
                </div>
            </div>
        </div>
    )
}

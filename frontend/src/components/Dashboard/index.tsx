import { Chat } from "../Chat"

export const Dashboard = ({ peers, messages, messageInput, setMessageInput, sendMessageAll }: any) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-screen grid-flow-row-dense">
            <div className="text-center align-middle mx-4 order-2 md:order-1 col-auto">
                <Chat
                    peers={peers}
                    messages={messages}
                    messageInput={messageInput}
                    setMessageInput={setMessageInput}
                    sendMessageAll={sendMessageAll}
                />
            </div>
            <div className="bg-gray-500 order-1 md:order-2 col-span-2 mx-4">
                <div className="m-2">
                    <p></p>
                </div>
            </div>
        </div>
    )
}
